function Evaluator(axdata, sequence) {
	this.stack = [];
	this.pc = 0;
	this.sequence = sequence;
	this.axdata = axdata;
	this.variables = new Array(axdata.max_val);
	for(var i = 0; i < axdata.max_val; i ++) {
		this.variables[i] = new Variable;
	}
	this.loopStack = [];
	this.frameStack = [];
	this.oldNotes = [];
	this.oldNotesPos = 0;
	this.note = null;
	this.stat = new IntArray();
	this.refdval = new DoubleArray();
	this.refstr = new StrArray();
	this.strsize = new IntValue(0);
	this.random = new VCRandom();
	
	var mainLoop;
	var literals = [];
	var variables = this.variables;
	var userDefFuncs = [];
	this.evaluate = function evaluate() {
		mainLoop = eval('Object(function mainLoop(self, stack, literals, variables, userDefFuncs) {\n' + 
		                this.createMainLoop(literals, userDefFuncs) + '\n})');
		try {
			mainLoop(this, this.stack, literals, variables, userDefFuncs);
		} catch(e) {
			this.disposeException(e);
		}
	};
	this.resume = function resume(callback) {
		try {
			if(callback) callback();
			this.pc ++;
			mainLoop(this, this.stack, literals, variables, userDefFuncs);
		} catch(e) {
			this.disposeException(e);
		}
	};
}

function LoopData(cnt, end, pc) {
	this.cnt = cnt;
	this.end = end;
	this.pc = pc;
}

function Frame(pc, userDefFunc, args, callback) {
	this.pc = pc;
	this.userDefFunc = userDefFunc;
	this.args = args;
	this.callback = callback;
}

Evaluator.prototype = {
	createMainLoop: function createMainLoop(literals, userDefFuncs) {
		function push(line) {
			lines.push(Utils.strTimes('\t', indent) + line);
		}
		function pushJumpingSubroutineCode(posExpr) {
			push('if(self.frameStack.length >= 256) {');
			push('    throw new HSPError(ErrorCode.STACK_OVERFLOW);');
			push('}');
			push('self.frameStack.push(new Frame(self.pc + 1, null, null));');
			push('self.pc = '+posExpr+';');
		}
		function pushGettingArrayValueCode(arrayExpr, argc) {
			if(argc > 1) {
				push('var indices = self.popIndices('+argc+');');
				push('var offset = '+arrayExpr+'.getOffset(indices);');
				push('if(offset == null) throw new HSPError(ErrorCode.ARRAY_OVERFLOW);');
				push('stack.push('+arrayExpr+'.at(offset));');
			} else if(argc == 1) {
				push('var offset = self.scanArg(stack.pop(), "i").toIntValue()._value;');
				push('if(!(0 <= offset && offset < '+arrayExpr+'.getL0())) {');
				push('    throw new HSPError(ErrorCode.ARRAY_OVERFLOW);');
				push('}');
				push('stack.push('+arrayExpr+'.at(offset));');
			} else {
				push('stack.push('+arrayExpr+'.at(0));');
			}
		}
		function pushGettingIndicesCode(indicesCount, offset) {
			push('var len = stack.length;');
			push('var indices = [');
			for(var i = 0; i < indicesCount; i ++) {
				push('    self.scanArg(stack[len - '+(offset+indicesCount-i)+'], "i").toIntValue()._value'+
				     (i == indicesCount - 1 ? '' : ','));
			}
			push('];');
		}
		function pushAssignCode(indicesCount, argc) {
			if(indicesCount == 0) {
				if(argc == 1) {
					push('var arg = stack.pop();');
					push('if(variable.value.getType() != arg.getType()) variable.reset(arg.getType());');
					push('variable.value.assign(0, arg);');
				} else {
					push('var len = stack.length;');
					push('var type = stack[len - '+argc+'].getType();');
					push('if(variable.value.getType() != type) variable.reset(type);');
					push('var array = variable.value;');
					push('array.expand1D('+(argc-1)+');');
					push('array.assign(0, stack[len - '+argc+']);');
					for(var i = 1; i < argc; i ++) {
						push('var arg = stack[len - '+(argc-i)+'];');
						push('if(arg.getType() != type) throw new HSPError(ErrorCode.INVALID_ARRAYSTORE);');
						push('array.assign('+i+', arg);');
					}
					push('stack.length -= '+argc+';');
				}
			} else if(indicesCount == 1) {
				if(argc == 1) {
					push('var arg = stack.pop();');
					push('var offset = self.scanArg(stack.pop(), "i").toIntValue()._value;');
					push('if(variable.value.getType() != arg.getType()) {');
					push('    if(offset == 0) {');
					push('        variable.reset(arg.getType());');
					push('    } else {');
					push('        throw new HSPError(ErrorCode.INVALID_ARRAYSTORE);');
					push('    }');
					push('}');
					push('variable.value.expand1D(offset);');
					push('variable.value.assign(offset, arg);');
				} else {
					push('var len = stack.length;');
					push('var offset = self.scanArg(stack[len-'+(argc+1)+'], "i").toIntValue()._value;');
					push('if(offset < 0) throw new HSPError(ErrorCode.ARRAY_OVERFLOW);');
					push('var type = variable.value.getType();');
					push('if(type != stack[len - '+argc+'].getType()) {');
					push('    if(offset == 0) {');
					push('        type = stack[len - '+argc+'].getType();');
					push('        variable.reset(type);');
					push('    } else {');
					push('        throw new HSPError(ErrorCode.INVALID_ARRAYSTORE);');
					push('    }');
					push('}');
					push('var array = variable.value;');
					push('array.expand1D(offset + '+(argc-1)+');');
					push('array.assign(offset, stack[len - '+argc+']);');
					for(var i = 1; i < argc; i ++) {
						push('var arg = stack[len - '+(argc-i)+'];');
						push('if(arg.getType() != type) throw new HSPError(ErrorCode.INVALID_ARRAYSTORE);');
						push('array.assign(offset + '+i+', arg);');
					}
					push('stack.length -= '+(argc+1)+';');
				}
			} else {
				pushGettingIndicesCode(indicesCount, argc);
				for(var i = 0; i < argc; i ++) {
					push('variable.assign(indices, stack[len - '+(argc-i)+']);');
					if(i != argc - 1) push('indices[0] ++;');
				}
				push('stack.length -= '+(argc+indicesCount)+';');
			}
		}
		function pushCompoundAssignCode(calcCode, indicesCount, variableExpr) {
			push('var arg = stack.pop();');
			if(!(8 <= calcCode && calcCode <= 13)) {
				// 比較演算以外は同じ型の値が返ってくることに依存して型チェックをしない
				push('var array = '+variableExpr+'.value;');
				if(indicesCount == 0) {
					push('array.assign(0, array.at(0).'+operateMethodNames[calcCode]+'(arg));');
				} else if(indicesCount == 1) {
					push('var offset = self.scanArg(stack.pop(), "i").toIntValue()._value;');
					push('array.expand1D(offset);');
					push('array.assign(offset, array.at(offset).'+operateMethodNames[calcCode]+'(arg));');
				} else {
					pushGettingIndicesCode(indicesCount, 0);
					push('stack.length -= '+indicesCount+';');
					push('array.expand(indices);');
					push('var offset = array.getOffset(indices);');
					push('array.assign(offset, array.at(offset).'+operateMethodNames[calcCode]+'(arg));');
				}
			} else {
				// 比較演算は必ず int 型の値が返ってくることに依存
				push('var variable = '+variableExpr+';');
				if(indicesCount == 0) {
					push('if(variable.value.getType() != '+VarType.INT+') variable.reset('+VarType.INT+');');
					push('variable.value.assign(0, variable.value.at(0).'+operateMethodNames[calcCode]+'(arg));');
				} else if(indicesCount == 1) {
					push('var offset = self.scanArg(stack.pop(), "i").toIntValue()._value;');
					push('if(variable.value.getType() != '+VarType.INT+') {');
					push('    if(offset == 0) {');
					push('        variable.reset('+VarType.INT+');');
					push('    } else {');
					push('        throw new HSPError(ErrorCode.INVALID_ARRAYSTORE);');
					push('    }');
					push('}');
					push('variable.value.expand1D(offset);');
					push('variable.value.assign(offset, variable.value.at(offset).'+operateMethodNames[calcCode]+'(arg));');
				} else {
					pushGettingIndicesCode(indicesCount, 0);
					push('stack.length -= '+indicesCount+';');
					push('var array = variable.value;');
					push('array.expand(indices);');
					push('var offset = array.getOffset(indices);');
					push('if(array.getType() != '+VarType.INT+') {');
					push('    if(offset == 0) {');
					push('        variable.reset('+VarType.INT+');');
					push('        array = variable.value;');
					push('        array.expand(indices);');
					push('    } else {');
					push('        throw new HSPError(ErrorCode.INVALID_ARRAYSTORE);');
					push('    }');
					push('}');
					push('array.assign(offset, array.at(offset).'+operateMethodNames[calcCode]+'(arg));');
				}
			}
		}
		function pushIncCode(indicesCount) {
			if(indicesCount == 0) {
				push('array.inc(0);');
			} else if(indicesCount == 1) {
				push('var offset = self.scanArg(stack.pop(), "i").toIntValue()._value;');
				push('array.expand1D(offset);');
				push('array.inc(offset);');
			} else {
				pushGettingIndicesCode(indicesCount, 0);
				push('stack.length -= '+indicesCount+';');
				push('array.expand(indices);');
				push('var offset = array.getOffset(indices);');
				push('array.inc(offset);');
			}
		}
		function pushDecCode(indicesCount) {
			if(indicesCount == 0) {
				push('array.dec(0);');
			} else if(indicesCount == 1) {
				push('var offset = self.scanArg(stack.pop(), "i").toIntValue()._value;');
				push('array.expand1D(offset);');
				push('array.dec(offset);');
			} else {
				pushGettingIndicesCode(indicesCount, 0);
				push('stack.length -= '+indicesCount+';');
				push('array.expand(indices);');
				push('var offset = array.getOffset(indices);');
				push('array.dec(offset);');
			}
		}
		function pushCallingUserdefFuncCode(userDefFunc, argc) {
			if(!userDefFuncs[userDefFunc.id]) {
				userDefFuncs[userDefFunc.id] = userDefFunc;
			}
			push('var args = [];');
			push('var len = stack.length;');
			var origArgsCount = 0;
			var argMax = userDefFunc.paramTypes.length;
			var recvArgMax = 0; // local を除いた仮引数の数
			for(var i = 0; i < argMax; i ++) {
				if(userDefFunc.paramTypes[i] != MPType.LOCALVAR) recvArgMax ++; 
			}
			if(recvArgMax < argc) {
				push('throw new HSPError(ErrorCode.TOO_MANY_PARAMETERS);');
				return;
			}
			for(var i = 0; i < argMax; i ++) {
				var mptype = userDefFunc.paramTypes[i];
				push('var arg = stack[len - '+(argc-origArgsCount)+'];');
				switch(mptype) {
				case MPType.DNUM:
					push('args['+i+'] = self.scanArg(arg, "n").toDoubleValue();');
					break;
				case MPType.INUM:
					push('args['+i+'] = arg ? self.scanArg(arg, "n").toIntValue() : new IntValue(0);');
					break;
				case MPType.LOCALVAR:
					push('args['+i+'] = new Variable;');
					continue;
				case MPType.ARRAYVAR:
					push('args['+i+'] = self.scanArg(arg, "v").variable;');
					break;
				case MPType.SINGLEVAR:
					push('args['+i+'] = self.scanArg(arg, "v");');
					break;
				case MPType.LOCALSTRING:
					push('args['+i+'] = self.scanArg(arg, "s").toStrValue();');
					break;
				case MPType.MODULEVAR:
					push('args['+i+'] = new ModVarData(self.scanArg(arg, "v").variable, arg.indices);');
					break;
				case MPType.IMODULEVAR:
					push('args['+i+'] = arg;');
					break;
				default:
					throw new Error('未対応のパラメータタイプ: '+mptype);
				}
				origArgsCount ++;
			}
			push('stack.length -= '+argc+';');
			push('if(self.frameStack.length >= 256) {');
			push('    throw new HSPError(ErrorCode.STACK_OVERFLOW);');
			push('}');
			push('self.frameStack.push(new Frame('+(pc + 1)+', userDefFuncs['+userDefFunc.id+'], args));');
			push('self.pc = '+userDefFunc.label.pos+';');
		}
		var lines = [];
		var indent = 0;
		var sequence = this.sequence;
		var operateMethodNames = 'add,sub,mul,div,mod,and,or,xor,eq,ne,gt,lt,gteq,lteq,rsh,lsh'.split(',');
		
		push('for(;;) {'); indent ++;
		push('switch(self.pc) {');
		for(var pc = 0; pc < sequence.length; pc ++) {
			var insn = sequence[pc];
			push('case '+pc+':'); indent ++;
			switch(insn.code) {
			case Instruction.Code.NOP:
				break;
			case Instruction.Code.PUSH:
				literals.push(insn.opts[0]);
				push('stack.push(literals['+(literals.length - 1)+']);');
				break;
			case Instruction.Code.PUSH_VAR:
				var varId = insn.opts[0];
				var argc = insn.opts[1];
				push('stack.push(new VariableAgent(variables['+varId+'], self.popIndices('+argc+')));');
				break;
			case Instruction.Code.GET_VAR:
				var varId = insn.opts[0];
				var argc = insn.opts[1];
				push('var array = self.variables['+varId+'].value;');
				pushGettingArrayValueCode('array', argc);
				break;
			case Instruction.Code.POP:
				push('stack.pop();');
				break;
			case Instruction.Code.DUP:
				push('stack.push(stack[stack.length-1]);');
				break;
			case Instruction.Code.ADD:
			case Instruction.Code.SUB:
			case Instruction.Code.MUL:
			case Instruction.Code.DIV:
			case Instruction.Code.MOD:
			case Instruction.Code.AND:
			case Instruction.Code.OR:
			case Instruction.Code.XOR:
			case Instruction.Code.EQ:
			case Instruction.Code.NE:
			case Instruction.Code.GT:
			case Instruction.Code.LT:
			case Instruction.Code.GTEQ:
			case Instruction.Code.LTEQ:
			case Instruction.Code.RSH:
			case Instruction.Code.LSH:
				push('var rhs = stack.pop();');
				push('stack[stack.length - 1] = stack[stack.length - 1].'+
					 operateMethodNames[insn.code - Instruction.Code.ADD]+'(rhs);');
				break;
			case Instruction.Code.GOTO:
				push('self.pc = '+insn.opts[0].pos+';');
				push('continue;');
				break;
			case Instruction.Code.IFNE:
				push('if(stack.pop().toIntValue()._value) {');
				push('    self.pc = '+insn.opts[0].pos+';');
				push('    continue;');
				push('}');
				break;
			case Instruction.Code.IFEQ:
				push('if(!stack.pop().toIntValue()._value) {');
				push('    self.pc = '+insn.opts[0].pos+';');
				push('    continue;');
				push('}');
				break;
			case Instruction.Code.ASSIGN:
				var argc = insn.opts[0];
				if(argc > 1) {
					push('var args = Utils.aryPopN(stack, '+argc+');');
					push('var agent = stack.pop();');
					push('var variable = agent.variable;');
					push('var indices = agent.indices.slice();');
					push('if(indices.length == 0) indices[0] = 0;');
					for(var i = 0; i < argc; i ++) {
						push('variable.assign(indices, args['+i+']);');
						push('indices[0] ++;');
					}
				} else {
					push('var arg = stack.pop();');
					push('var agent = stack.pop();');
					push('agent.variable.assign(agent.indices, arg);');
				}
				break;
			case Instruction.Code.ASSIGN_STATIC_VAR:
				var varId = insn.opts[0];
				var indicesCount = insn.opts[1];
				var argc = insn.opts[2];
				push('var variable = variables['+varId+'];');
				pushAssignCode(indicesCount, argc);
				break;
			case Instruction.Code.ASSIGN_ARG_ARRAY:
				var argNum = insn.opts[0];
				var indicesCount = insn.opts[1];
				var argc = insn.opts[2];
				push('var variable = self.getArg('+argNum+');');
				pushAssignCode(indicesCount, argc);
				break;
			case Instruction.Code.ASSIGN_MEMBER:
				var memberNum = insn.opts[0];
				var indicesCount = insn.opts[1];
				var argc = insn.opts[2];
				push('var variable = self.getThismod().toValue().members['+memberNum+'];');
				pushAssignCode(indicesCount, argc);
				break;
			case Instruction.Code.COMPOUND_ASSIGN:
				push('var arg = stack.pop();');
				push('var agent = stack.pop();');
				push('agent.variable.expand(agent.indices);');
				push('agent.assign(agent.'+operateMethodNames[insn.opts[0]]+'(arg));');
				break;
			case Instruction.Code.COMPOUND_ASSIGN_STATIC_VAR:
				var calcCode = insn.opts[0];
				var varId = insn.opts[1];
				var indicesCount = insn.opts[2];
				pushCompoundAssignCode(calcCode, indicesCount, 'variables['+varId+']');
				break;
			case Instruction.Code.COMPOUND_ASSIGN_ARG_ARRAY:
				var calcCode = insn.opts[0];
				var argNum = insn.opts[1];
				var indicesCount = insn.opts[2];
				pushCompoundAssignCode(calcCode, indicesCount, 'self.getArg('+argNum+')');
				break;
			case Instruction.Code.COMPOUND_ASSIGN_MEMBER:
				var calcCode = insn.opts[0];
				var memberNum = insn.opts[1];
				var indicesCount = insn.opts[2];
				pushCompoundAssignCode(calcCode, indicesCount, 'self.getThismod().toValue().members['+memberNum+']');
				break;
			case Instruction.Code.INC:
				push('var agent = stack.pop();');
				push('agent.variable.expand(agent.indices);');
				push('agent.assign(agent.inc());');
				break;
			case Instruction.Code.INC_STATIC_VAR:
				var varId = insn.opts[0];
				var indicesCount = insn.opts[1];
				push('var array = variables['+varId+'].value;');
				pushIncCode(indicesCount);
				break;
			case Instruction.Code.INC_ARG_ARRAY:
				var argNum = insn.opts[0];
				var indicesCount = insn.opts[1];
				push('var array = self.getArg('+argNum+').value;');
				pushIncCode(indicesCount);
				break;
			case Instruction.Code.INC_MEMBER:
				var memberNum = insn.opts[0];
				var indicesCount = insn.opts[1];
				push('var array = self.getThismod().toValue().members['+memberNum+'].value;');
				pushIncCode(indicesCount);
				break;
			case Instruction.Code.DEC:
				push('var agent = stack.pop();');
				push('agent.variable.expand(agent.indices);');
				push('agent.assign(agent.dec());');
				break;
			case Instruction.Code.DEC_STATIC_VAR:
				var varId = insn.opts[0];
				var indicesCount = insn.opts[1];
				push('var array = variables['+varId+'].value;');
				pushDecCode(indicesCount);
				break;
			case Instruction.Code.DEC_ARG_ARRAY:
				var argNum = insn.opts[0];
				var indicesCount = insn.opts[1];
				push('var array = self.getArg('+argNum+').value;');
				pushDecCode(indicesCount);
				break;
			case Instruction.Code.DEC_MEMBER:
				var memberNum = insn.opts[0];
				var indicesCount = insn.opts[1];
				push('var array = self.getThismod().toValue().members['+memberNum+'].value;');
				pushDecCode(indicesCount);
				break;
			case Instruction.Code.CALL_BUILTIN_CMD:
			case Instruction.Code.CALL_BUILTIN_FUNC:
				var type = insn.opts[0];
				var subid = insn.opts[1];
				var argc = insn.opts[2];
				push('var func = BuiltinFuncs['+type+']['+subid+'];');
				push('if(!func) throw new HSPError(ErrorCode.UNSUPPORTED_FUNCTION);');
				push('var args = Utils.aryPopN(stack, '+argc+');');
				if(insn.code == Instruction.Code.CALL_BUILTIN_FUNC) {
					push('stack.push(func.apply(self, args));');
				} else {
					push('func.apply(self, args);');
				}
				break;
			case Instruction.Code.CALL_USERDEF_CMD:
			case Instruction.Code.CALL_USERDEF_FUNC:
				var userDefFunc = insn.opts[0];
				var argc = insn.opts[1];
				pushCallingUserdefFuncCode(userDefFunc, argc);
				push('continue;');
				break;
			case Instruction.Code.GETARG:
				var argNum = insn.opts[0];
				push('stack.push(self.getArg('+argNum+'));');
				break;
			case Instruction.Code.PUSH_ARG_VAR:
				var argNum = insn.opts[0];
				var argc = insn.opts[1];
				push('var variable = self.getArg('+argNum+');');
				push('var indices = self.popIndices('+argc+');');
				push('stack.push(new VariableAgent(variable, indices));');
				break;
			case Instruction.Code.GET_ARG_VAR:
				var argNum = insn.opts[0];
				var argc = insn.opts[1];
				push('var array = self.getArg('+argNum+').value;');
				pushGettingArrayValueCode('array', argc);
				break;
			case Instruction.Code.PUSH_MEMBER:
				var memberNum = insn.opts[0];
				var argc = insn.opts[1];
				push('var struct = self.getThismod().toValue();');
				push('var indices = self.popIndices('+argc+');');
				push('stack.push(new VariableAgent(struct.members['+memberNum+'], indices));');
				break;
			case Instruction.Code.GET_MEMBER:
				var memberNum = insn.opts[0];
				var argc = insn.opts[1];
				push('var struct = self.getThismod().toValue();');
				push('var array = struct.members['+memberNum+'].value;');
				pushGettingArrayValueCode('array', argc);
				break;
			case Instruction.Code.THISMOD:
				push('stack.push(self.getThismod());');
				break;
			case Instruction.Code.NEWMOD:
				var module = insn.opts[0];
				var argc = insn.opts[1];
				if(!userDefFuncs[module.id]) {
					userDefFuncs[module.id] = module;
				}
				var moduleExpr = 'userDefFuncs['+module.id+']';
				push('var len = stack.length;');
				push('var agent = self.scanArg(stack[len - '+argc+'], "a");');
				push('if(agent.getType() != '+VarType.STRUCT+') {');
				push('    agent.variable.dim('+VarType.STRUCT+', 1, 0, 0, 0);');
				push('}');
				push('var array = agent.variable.value;');
				push('var offset = array.newmod('+moduleExpr+');');
				if(module.constructor) {
					push('stack[len - '+argc+'] = new ModVarData(agent.variable, [offset]);');
					pushCallingUserdefFuncCode(module.constructor, argc);
					push('continue;');
				} else if(argc > 1) {
					push('throw new HSPError(ErrorCode.TOO_MANY_PARAMETERS);')
				}
				break;
			case Instruction.Code.RETURN:
				var existReturnVal = insn.opts[0];
				push('if(self.frameStack.length == 0) {');
				push('    throw new HSPError(ErrorCode.RETURN_WITHOUT_GOSUB);');
				push('}');
				push('var frame = self.frameStack.pop();');
				if(existReturnVal) {
					push('if(frame.userDefFunc && frame.userDefFunc.isCType) {');
					push('    stack[stack.length - 1] = stack[stack.length - 1].toValue();');
					push('} else {'); indent ++
					push('var val = stack.pop();');
					push('switch(val.getType()) {');
					push('case '+VarType.STR+':');
					push('    self.refstr.assign(0, val.toStrValue());');
					push('    break;');
					push('case '+VarType.DOUBLE+':');
					push('    self.refdval.assign(0, val.toDoubleValue());');
					push('    break;');
					push('case '+VarType.INT+':');
					push('    self.stat.assign(0, val.toIntValue());');
					push('    break;');
					push('default:');
					push('    throw new HSPError(ErrorCode.TYPE_MISMATCH);');
					push('}');
					indent --; push('}');
				} else {
					push('if(frame.userDefFunc && frame.userDefFunc.isCType) {');
					push('    throw new HSPError(ErrorCode.NORETVAL);');
					push('}');
				}
				push('self.pc = frame.pc;');
				push('continue;');
				break;
			case Instruction.Code.DELMOD:
				push('var v = self.scanArg(stack.pop(), "v");');
				push('if(v.getType() != VarType.STRUCT) {');
				push('    throw new HSPError(ErrorCode.TYPE_MISMATCH);');
				push('}');
				push('agent.assign(StructValue.EMPTY);');
				break;
			case Instruction.Code.REPEAT:
				var pos = insn.opts[0].pos;
				var argc = insn.opts[1];
				push('if(self.loopStack.length >= 31) {');
				push('    throw new HSPError(ErrorCode.TOO_MANY_NEST);');
				push('}');
				if(argc == 2) {
					push('var begin = self.scanArg(stack.pop(), "n").toIntValue()._value;');
				} else {
					push('var begin = 0;');
				}
				if(argc >= 1) {
					push('var end = self.scanArg(stack.pop(), "n").toIntValue()._value;');
					push('if(end < 0) end = Infinity;');
				} else {
					push('var end = Infinity;');
				}
				push('if(end == 0) {');
				push('    self.pc = '+pos+';');
				push('    continue;');
				push('}');
				push('end += begin;');
				push('self.loopStack.push(new LoopData(begin, end, '+(pc + 1)+'));');
				break;
			case Instruction.Code.LOOP:
				push('if(self.loopStack.length == 0) {');
				push('    throw new HSPError(ErrorCode.LOOP_WITHOUT_REPEAT);');
				push('}');
				push('var data = self.loopStack[self.loopStack.length - 1];');
				push('data.cnt ++;');
				push('if(data.cnt < data.end) {');
				push('    self.pc = data.pc;');
				push('    continue;');
				push('}');
				push('self.loopStack.pop();');
				break;
			case Instruction.Code.CNT:
				push('if(self.loopStack.length == 0) {');
				push('    stack.push(new IntValue(0));');
				push('} else {');
				push('    stack.push(new IntValue(self.loopStack[self.loopStack.length - 1].cnt));');
				push('}');
				break;
			case Instruction.Code.CONTINUE:
				var pos = insn.opts[0].pos;
				var argc = insn.opts[1];
				push('if(self.loopStack.length == 0) {');
				push('    throw new HSPError(ErrorCode.LOOP_WITHOUT_REPEAT);');
				push('}');
				push('var data = self.loopStack[self.loopStack.length - 1];');
				var newCntExpr;
				if(argc) {
					newCntExpr = '(data.cnt = self.scanArg(self.stack.pop(), "n").toIntValue()._value)';
				} else {
					newCntExpr = '++data.cnt';
				}
				push('if('+newCntExpr+' >= data.end) {');
				push('    self.loopStack.pop();');
				push('    self.pc = '+pos+';');
				push('} else {');
				push('    self.pc = data.pc;');
				push('}');
				push('continue;');
				break;
			case Instruction.Code.BREAK:
				var label = insn.opts[0];
				push('if(self.loopStack.length == 0) {');
				push('    throw new HSPError(ErrorCode.LOOP_WITHOUT_REPEAT);');
				push('}');
				push('self.loopStack.pop();');
				push('self.pc = '+label.pos+';');
				push('continue;');
				break;
			case Instruction.Code.FOREACH:
				push('if(self.loopStack.length >= 31) {');
				push('    throw new HSPError(ErrorCode.TOO_MANY_NEST);');
				push('}');
				push('self.loopStack.push(new LoopData(0, Infinity, '+(pc + 1)+'));');
				break;
			case Instruction.Code.EACHCHK:
				push('if(self.loopStack.length == 0) {');
				push('    throw new HSPError(ErrorCode.LOOP_WITHOUT_REPEAT);')
				push('}')
				var pos = insn.opts[0].pos;
				push('var v = self.scanArg(stack.pop(), "v");');
				push('var data = self.loopStack[self.loopStack.length - 1];');
				push('if(data.cnt >= v.variable.getL0()) {')
				push('    self.loopStack.pop();');
				push('    self.pc = '+pos+';');
				push('    continue;');
				push('}');
				push('if(v.variable.at([data.cnt]).isUsing() == false) {'); // label 型 や struct 型の empty を飛ばす
				push('    data.cnt ++;');
				push('    if(data.cnt >= data.end) {');
				push('        self.loopStack.pop();');
				push('        self.pc = '+pos+';');
				push('    } else {');
				push('        self.pc = data.pc;');
				push('    }');
				push('    continue;');
				push('}');
				break;
			case Instruction.Code.GOSUB:
				pushJumpingSubroutineCode(insn.opts[0].pos);
				push('continue;');
				break;
			case Instruction.Code.GOTO_EXPR:
				push('self.pc = self.scanArg(stack.pop(), "l").toValue().pos;');
				push('continue;');
				break;
			case Instruction.Code.GOSUB_EXPR:
				pushJumpingSubroutineCode('self.scanArg(stack.pop(), "l").toValue().pos');
				push('continue;');
				break;
			case Instruction.Code.EXGOTO:
				push('var pos = self.scanArg(stack.pop(), "l").toValue().pos;');
				push('var b = self.scanArg(stack.pop(), "n").toIntValue()._value;');
				push('var mode = self.scanArg(stack.pop(), "n").toIntValue()._value;');
				push('var a = self.scanArg(self.scanArg(stack.pop(), "v"), "i").toIntValue()._value;');
				push('if(mode >= 0) {');
				push('    if(a >= b) { self.pc = pos; continue; }');
				push('} else {');
				push('    if(a <= b) { self.pc = pos; continue; }');
				push('}');
				break;
			case Instruction.Code.EXGOTO_OPT1:
				var pos = insn.opts[1].pos;
				push('var a = self.scanArg(variables['+insn.opts[0]+'].at(0), "i").toIntValue()._value;');
				push('var b = self.scanArg(stack.pop(), "n").toIntValue()._value;');
				push('var mode = self.scanArg(stack.pop(), "n").toIntValue()._value;');
				push('if(mode >= 0) {');
				push('    if(a >= b) { self.pc = '+pos+'; continue; }');
				push('} else {');
				push('    if(a <= b) { self.pc = '+pos+'; continue; }');
				push('}');
				break;
			case Instruction.Code.EXGOTO_OPT2:
				var pos = insn.opts[1].pos;
				push('var a = self.scanArg(variables['+insn.opts[0]+'].at(0), "i").toIntValue()._value;');
				push('var b = self.scanArg(stack.pop(), "n").toIntValue()._value;');
				push('if(a >= b) { self.pc = '+pos+'; continue; }');
				break;
			case Instruction.Code.EXGOTO_OPT3:
				var pos = insn.opts[1].pos;
				push('var a = self.scanArg(variables['+insn.opts[0]+'].at(0), "i").toIntValue()._value;');
				push('var b = self.scanArg(stack.pop(), "n").toIntValue()._value;');
				push('if(a <= b) { self.pc = '+pos+'; continue; }');
				break;
			case Instruction.Code.ON:
				var argc = insn.opts[0];
				var isGosub = insn.opts[1];
				push('var len = stack.length;');
				for(var i = 0; i < argc; i ++) {
					push('self.scanArg(stack[len - '+(argc - i)+'], "l");');
				}
				push('var n = self.scanArg(stack[len - '+(argc + 1)+'], "n").toIntValue()._value;');
				push('if(0 <= n && n < '+argc+') {'); indent ++;
				push('var pos = stack[len - '+argc+' + n].toValue().pos;');
				push('stack.length -= '+(argc + 1)+';');
				if(isGosub) {
					pushJumpingSubroutineCode('pos');
					push('continue;');
				} else {
					push('self.pc = pos;');
					push('continue;');
				}
				indent --; push('}');
				break;
			default:
				throw new Error("未対応の命令コード: "+insn.code);
			}
			push('self.pc ++;');
			indent --;
		}
		push('}');
		indent --; push('}');
		//print(lines.join("\n"));
		return lines.join("\n");
	},
	popIndices: function popIndices(argc) {
		var indices = Utils.aryPopN(this.stack, argc);
		for(var i = 0; i < argc; i ++) {
			if(indices[i].getType() != VarType.INT) {
				throw new HSPError(ErrorCode.TYPE_MISMATCH);
			}
			indices[i] = indices[i].toValue()._value;
		}
		return indices;
	},
	selectNote: function selectNote(v) {
		if(this.note) {
			this.oldNotes[this.oldNotesPos] = this.note;
			this.oldNotesPos = (this.oldNotesPos + 1) % 256;
		}
		this.note = v;
	},
	undoNote: function undoNote() {
		this.oldNotesPos = (this.oldNotesPos - 1 + 256) % 256;
		this.note = this.oldNotes[this.oldNotesPos];
		this.oldNotes[this.oldNotesPos] = null;
	},
	getNote: function getNote() {
		if(!this.note) {
			throw new HSPError(ErrorCode.ILLEGAL_FUNCTION, 'ノートパッドが選択されていません');
		}
		return this.note.getBuffer();
	},
	fileRead: function fileRead(path, success, error) {
		throw new FileReadException(path, success, error);
	},
	getArg: function getArg(argNum) {
		var frame = this.frameStack[this.frameStack.length - 1];
		if(this.frameStack.length == 0 || !frame.args) {
			throw new HSPError(ErrorCode.INVALID_PARAMETER);
		}
		return frame.args[argNum];
	},
	getThismod: function getThismod() {
		var thismod = this.getArg(0);
		if(!(thismod instanceof ModVarData && thismod.getType() == VarType.STRUCT && thismod.isUsing())) {
			throw new HSPError(ErrorCode.INVALID_STRUCT_SOURCE);
		}
		return thismod;
	},
	getBuiltinFuncName: function getBuiltinFuncName(insn) {
		if(insn.code != Instruction.Code.CALL_BUILTIN_CMD &&
		   insn.code != Instruction.Code.CALL_BUILTIN_FUNC) {
			return undefined;
		}
		var type = insn.opts[0];
		var subid = insn.opts[1];
		var names = BuiltinFuncNames[type];
		if(!names) return undefined;
		return names[subid];
	},
	// 命令・関数パラメータの数とそれぞれの型をチェックし、問題がある場合はエラーを投げる
	// フォーマット仕様
	// i: int
	// d: double
	// n: int または double
	// s: 文字列
	// l: ラベル
	// v: 変数（添字指定があると配列の自動拡張を行う）
	// j: ジャンプタイプ (goto または gosub)
	// a: 配列変数（添字指定があるとエラー）
	// .: どれでも
	// それぞれを大文字にするか、後ろに ? をつけると省略可能であることを示す
	// 後ろに * をつけると同じルールで 0 個以上、最後まで続くことを示す
	// 
	// * の指定があっても問題がある場合はエラーを投げる。（次のルールには渡さない）
	// 「'i*s' で int 型のパラメータが並んでいて最後に文字列型のパラメータがあることを調べる」のような使い方は*出来ない*。
	scanArgs: function scanArgs(args, format) {
		var argsIndex = 0;
		var formatIndex = 0;
		while(formatIndex < format.length) {
			var c = format.charAt(formatIndex++);
			var repeat = false;
			var isOptionalArguments = false;
			if(format.charAt(formatIndex) == '?') {
				formatIndex ++;
				isOptionalArguments = true;
			}
			if(format.charAt(formatIndex) == '*') {
				formatIndex ++;
				repeat = true;
			}
			if(/[A-Z]/.test(c)) {
				c = c.toLowerCase();
				isOptionalArguments = true;
			}
			do {
				var arg = args[argsIndex];
				if(repeat && argsIndex >= args.length) break;
				this.scanArg(arg, c, isOptionalArguments);
				argsIndex ++;
			} while(repeat);
		}
		if(argsIndex < args.length) {
			throw new HSPError(ErrorCode.TOO_MANY_PARAMETERS);
		}
	},
	scanArg: function scanArg(arg, c, isOptionalArguments) {
		if(arg == undefined) {
			if(isOptionalArguments) {
				return arg;
			} else {
				throw new HSPError(ErrorCode.NO_DEFAULT);
			}
		}
		switch(c) {
		case 'i':
			if(arg.getType() != VarType.INT) {
				throw new HSPError(ErrorCode.TYPE_MISMATCH, 'パラメータの型が違います。'+VarTypeNames[arg.getType()]+' 型ではなく、int 型の値を指定しなければいけません');
			}
			break;
		case 'd':
			if(arg.getType() != VarType.DOUBLE) {
				throw new HSPError(ErrorCode.TYPE_MISMATCH, 'パラメータの型が違います。'+VarTypeNames[arg.getType()]+' 型ではなく、double 型の値を指定しなければいけません');
			}
			break;
		case 'n':
			if(arg.getType() != VarType.INT && arg.getType() != VarType.DOUBLE) {
				throw new HSPError(ErrorCode.TYPE_MISMATCH, 'パラメータの型が違います。'+VarTypeNames[arg.getType()]+' 型ではなく、int 型か double 型の値を指定しなければいけません');
			}
			break;
		case 's':
			if(arg.getType() != VarType.STR) {
				throw new HSPError(ErrorCode.TYPE_MISMATCH, 'パラメータの型が違います。'+VarTypeNames[arg.getType()]+' 型ではなく、str 型の値を指定しなければいけません');
			}
			break;
		case 'l':
			if(arg.getType() != VarType.LABEL) {
				throw new HSPError(ErrorCode.LABEL_REQUIRED);
			}
			break;
		case 'v':
			if(!(arg instanceof VariableAgent)) {
				throw new HSPError(ErrorCode.VARIABLE_REQUIRED);
			}
			arg.variable.expand(arg.indices);
			break;
		case 'j':
			if(!(arg instanceof JumpType)) {
				throw new HSPError(ErrorCode.SYNTAX, 'goto/gosub が指定されていません');
			}
			break;
		case 'a':
			if(!(arg instanceof VariableAgent)) {
				throw new HSPError(ErrorCode.VARIABLE_REQUIRED);
			}
			// オフィシャル HSP だと添字が 0 のときも許容している
			if(arg.indices.length != 0) {
				throw new HSPError(ErrorCode.BAD_ARRAY_EXPRESSION);
			}
			break;
		case '.':
			break;
		}
		return arg;
	}
};

if(typeof HSPonJS != 'undefined') {
	HSPonJS.Evaluator = Evaluator;
	HSPonJS.LoopData = LoopData;
	HSPonJS.Frame = Frame;
}


