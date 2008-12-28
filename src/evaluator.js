function Evaluator(axdata, sequence, options) {
	this.options = Utils.objectMerge(options, Evaluator.defaultOptions);
	this.stack = [];
	this.pc = 0;
	this.sequence = sequence;
	this.axdata = axdata;
	this.variables = this.buildVariables();
	this.loopStack = [];
	this.frameStack = [];
	this.args = null;
	this.oldNotes = [];
	this.oldNotesPos = 0;
	this.note = null;
	this.stat = new IntArray();
	this.refdval = new DoubleArray();
	this.refstr = new StrArray();
	this.strsize = 0;
	this.iparam = 0;
	this.wparam = 0;
	this.lparam = 0;
	this.err = 0;
	this.random = new VCRandom();
	this.onerrorEvent = new Event();
	
	this.literals = [];
	this.userDefFuncs = [];
}

Evaluator.defaultOptions = {
	errorAtUseOfUninitalizedVariable: false
};

function LoopData(cnt, end, pc) {
	this.cnt = cnt;
	this.end = end;
	this.pc = pc;
}

function Frame(pc, userDefFunc, args, prevArgs) {
	this.pc = pc;
	this.userDefFunc = userDefFunc;
	this.args = args;
	this.prevArgs = prevArgs;
}

function Event() {
	this.enabled = false;
	this.pos = null;
	this.isGosub = false;
}

Evaluator.prototype = {
	evaluate: function evaluate() {
		this.mainLoop = eval('Object(function mainLoop(stack, literals, variables, userDefFuncs) {\n' +
		                this.createMainLoop(this.literals, this.userDefFuncs) + '\n})');
		try {
			this.mainLoop(this.stack, this.literals, this.variables, this.userDefFuncs);
		} catch(e) {
			this.disposeException(e);
		}
	},
	resume: function resume(callback) {
		try {
			if(callback) callback();
			this.pc ++;
			this.mainLoop(this.stack, this.literals, this.variables, this.userDefFuncs);
		} catch(e) {
			this.disposeException(e);
		}
	},
	resumeWithEvent: function resumeWithEvent(event) {
		try {
			if(event.isGosub) {
				if(this.frameStack.length >= 256) {
					throw new HSPError(ErrorCode.STACK_OVERFLOW);
				}
				this.frameStack.push(new Frame(this.pc + 1, null, this.args));
			} else {
				this.loopStack.length = 0;
				this.frameStack.length = 0;
				this.stack.length = 0;
			}
			this.pc = event.pos;
			this.mainLoop(this.stack, this.literals, this.variables, this.userDefFuncs);
		} catch(e) {
			this.disposeException(e);
		}
	},
	buildVariables: function buildVariables() {
		var axdata = this.axdata;
		var varCount = axdata.max_val;
		var variables = new Array(varCount);
		for(var i = 0; i < varCount; i ++) {
			variables[i] = new Variable;
		}
		if(this.options.errorAtUseOfUninitalizedVariable) {
			var variableNames = axdata.variableNames;
			for(var i = 0; i < varCount; i ++) {
				variables[i].value = new UninitializedArray(variableNames[i]);
			}
		}
		return variables;
	},
	disposeException: function disposeException(e) {
		if(!(e instanceof HSPException)) {
			this.onInternalError(e);
		} else if(e instanceof HSPError) {
			if(this.onerrorEvent.enabled && this.onerrorEvent.pos != null) {
				this.wparam = this.err = e.errcode;
				var insn = this.sequence[this.pc];
				this.lparam = insn ? insn.lineNo : 0;
				this.resumeWithEvent(this.onerrorEvent);
			} else {
				this.onError(e);
			}
		} else if(e instanceof StopException) {
			this.onStop(e);
		} else if(e instanceof EndException) {
			this.onEnd(e);
		} else if(e instanceof WaitException) {
			this.onWait(e);
		} else if(e instanceof FileReadException) {
			this.onFileRead(e);
		} else if(e instanceof VoidException) {
		}
	},
	onInternalError: function onInternalError(e) {
		throw e;
	},
	onStop: function onStop() {
	},
	createMainLoop: function createMainLoop(literals, userDefFuncs) {
		function push(line) {
			lines.push(Utils.strTimes('\t', indent) + line);
		}
		function pushJumpingSubroutineCode(posExpr) {
			push('if(this.frameStack.length >= 256) {');
			push('    throw new HSPError(ErrorCode.STACK_OVERFLOW);');
			push('}');
			push('this.frameStack.push(new Frame(this.pc + 1, null, this.args));');
			push('this.pc = '+posExpr+';');
		}
		function pushGettingArrayValueCode(arrayExpr, indicesCount) {
			if(indicesCount == 0) {
				push('stack.push('+arrayExpr+'.at(0));');
			} else if(indicesCount == 1) {
				push('var offset = this.scanArg(stack.pop(), "i").toIntValue()._value;');
				push('if(!(0 <= offset && offset < '+arrayExpr+'.getL0())) {');
				push('    throw new HSPError(ErrorCode.ARRAY_OVERFLOW);');
				push('}');
				push('stack.push('+arrayExpr+'.at(offset));');
			} else {
				pushGettingIndicesCode(indicesCount, 0);
				push('stack.length -= '+indicesCount+';');
				push('var offset = '+arrayExpr+'.getOffset(indices);');
				push('if(offset == null) throw new HSPError(ErrorCode.ARRAY_OVERFLOW);');
				push('stack.push('+arrayExpr+'.at(offset));');
			}
		}
		function pushGettingVariableCode(variableExpr, indicesCount) {
			if(indicesCount == 0) {
				push('stack.push(new VariableAgent0D('+variableExpr+'));');
			} else if(indicesCount == 1) {
				push('var offset = this.scanArg(stack.pop(), "i").toIntValue()._value;');
				push('stack.push(new VariableAgent1D('+variableExpr+', offset));');
			} else {
				pushGettingIndicesCode(indicesCount, 0);
				push('stack.length -= '+indicesCount+';');
				push('stack.push(new VariableAgentMD('+variableExpr+', indices));');
			}
		}
		function pushGettingIndicesCode(indicesCount, offset) {
			push('var len = stack.length;');
			push('var indices = [];');
			for(var i = 0; i < indicesCount; i ++) {
				push('var val = stack[len - '+(offset+indicesCount-i)+'];');
				push('if(val.getType() != '+VarType.INT+') throw new HSPError(ErrorCode.TYPE_MISMATCH);');
				push('indices['+i+'] = val.toIntValue()._value;');
			}
		}
		function push1DMultipleAssignCode(argc) {
			push('var type = stack[len - '+argc+'].getType();');
			push('if(variable.value.getType() != type) {');
			push('    if(offset == 0) {');
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
					push('var offset = this.scanArg(stack.pop(), "i").toIntValue()._value;');
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
					push('var offset = this.scanArg(stack[len-'+(argc+1)+'], "i").toIntValue()._value;');
					push('if(offset < 0) throw new HSPError(ErrorCode.ARRAY_OVERFLOW);');
					push1DMultipleAssignCode(argc);
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
					push('var offset = this.scanArg(stack.pop(), "i").toIntValue()._value;');
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
					push('var offset = this.scanArg(stack.pop(), "i").toIntValue()._value;');
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
				push('var offset = this.scanArg(stack.pop(), "i").toIntValue()._value;');
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
				push('var offset = this.scanArg(stack.pop(), "i").toIntValue()._value;');
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
		function pushCallingUserdefFuncCode(userDefFunc, paramTypes, constructorThismodExpr) {
			if(!userDefFuncs[userDefFunc.id]) {
				userDefFuncs[userDefFunc.id] = userDefFunc;
			}
			var argc = paramTypes.length; // 実引数の数
			var stackArgsMax = argc; // 省略したものを除く実引数の数
			var stackArgsCount = 0;
			var origArgsCount = 0;
			var mptypes = userDefFunc.paramTypes;
			var argMax = mptypes.length;
			var recvArgMax = 0; // local を除いた仮引数の数
			for(var i = 0; i < argMax; i ++) {
				var mptype = mptypes[i];
				var paramType = paramTypes[recvArgMax] || Compiler.ParamType.OMMITED;
				if(mptype == MPType.LOCALVAR || mptype == MPType.IMODULEVAR) continue;
				if(mptype == MPType.ARRAYVAR) {
					if(recvArgMax < paramTypes.length) {
						if(!paramType) {
							push('throw new HSPError(ErrorCode.VARIABLE_REQUIRED);');
							return;
						}
						stackArgsMax --;
					}
				}
				if(paramType == Compiler.ParamType.OMMITED) {
					if(mptype != MPType.INUM) {
						push('throw new HSPError(ErrorCode.NO_DEFAULT);');
						return;
					}
					if(recvArgMax < paramTypes.length) {
						stackArgsMax --;
					}
				}
				recvArgMax ++;
			}
			if(recvArgMax < argc) {
				push('throw new HSPError(ErrorCode.TOO_MANY_PARAMETERS);');
				return;
			}
			push('var args = [];');
			push('var len = stack.length;');
			for(var i = 0; i < argMax; i ++) {
				var mptype = mptypes[i];
				var paramType = paramTypes[origArgsCount] || Compiler.ParamType.OMMITED;
				var argExpr = 'stack[len - '+(stackArgsMax-stackArgsCount)+']';
				switch(mptype) {
				case MPType.DNUM:
					push('args['+i+'] = this.scanArg('+argExpr+', "n").toDoubleValue();');
					stackArgsCount ++;
					break;
				case MPType.INUM:
					if(paramType == Compiler.ParamType.OMMITED) {
						push('args['+i+'] = IntValue.of(0);');
					} else {
						push('args['+i+'] = this.scanArg('+argExpr+', "n").toIntValue();')
						stackArgsCount ++;
					}
					break;
				case MPType.LOCALVAR:
					push('args['+i+'] = new Variable;');
					continue;
				case MPType.ARRAYVAR:
					push('args['+i+'] = '+getVariableExpr(paramType)+';');
					break;
				case MPType.SINGLEVAR:
					if(paramType == Compiler.ParamType.VARIABLE) {
						push('var arg = '+argExpr+';');
						push('arg.expand();');
						push('args['+i+'] = arg;');
					} else {
						push('var arg = new VariableAgent0D(new Variable);');
						push('arg.assign('+argExpr+')');
						push('args['+i+'] = arg;');
					}
					stackArgsCount ++;
					break;
				case MPType.LOCALSTRING:
					push('args['+i+'] = this.scanArg('+argExpr+', "s").toStrValue();');
					stackArgsCount ++;
					break;
				case MPType.MODULEVAR:
					if(paramType == Compiler.ParamType.VARIABLE) {
						push('var arg = '+argExpr+';');
						push('arg.expand();');
						push('args['+i+'] = arg;');
					} else {
						push('var arg = new VariableAgent0D(new Variable);');
						push('arg.assign('+argExpr+')');
						push('args['+i+'] = arg;');
					}
					stackArgsCount ++;
					break;
				case MPType.IMODULEVAR:
					push('args['+i+'] = '+constructorThismodExpr+';');
					continue;
				default:
					throw new Error('未対応のパラメータタイプ: '+mptype);
				}
				origArgsCount ++;
			}
			if(stackArgsMax != 0) {
				push('stack.length -= '+stackArgsMax+';');
			}
			push('if(this.frameStack.length >= 256) {');
			push('    throw new HSPError(ErrorCode.STACK_OVERFLOW);');
			push('}');
			push('this.frameStack.push(new Frame('+(pc + 1)+', userDefFuncs['+userDefFunc.id+'], args, this.args));');
			push('this.args = args;');
			push('this.pc = '+userDefFunc.label.pos+';');
		}
		function getVariableExpr(varData) {
			var type = varData[0];
			var no = varData[1];
			switch(type) {
			case Compiler.ProxyVarType.STATIC:
				return 'variables['+no+']';
			case Compiler.ProxyVarType.THISMOD:
				return 'this.getThismod().variable';
			case Compiler.ProxyVarType.MEMBER:
				return 'this.getThismod().toValue().members['+no+']';
			case Compiler.ProxyVarType.ARG_VAR:
				return 'this.getArg('+no+').variable';
			case Compiler.ProxyVarType.ARG_ARRAY:
			case Compiler.ProxyVarType.ARG_LOCAL:
				return 'this.getArg('+no+')';
			default:
				throw new Error('must not happen');
			}
		}
		var lines = [];
		var indent = 0;
		var sequence = this.sequence;
		var operateMethodNames = 'add,sub,mul,div,mod,and,or,xor,eq,ne,gt,lt,gteq,lteq,rsh,lsh'.split(',');
		
		push('for(;;) {'); indent ++;
		push('switch(this.pc) {');
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
			case Instruction.Code.PUSH_DEFAULT:
				push('stack.push(void 0);');
				break;
			case Instruction.Code.PUSH_VAR:
				var varId = insn.opts[0];
				var indicesCount = insn.opts[1];
				pushGettingVariableCode('variables['+varId+']', indicesCount);
				break;
			case Instruction.Code.GET_VAR:
				var varId = insn.opts[0];
				var indicesCount = insn.opts[1];
				push('var array = this.variables['+varId+'].value;');
				pushGettingArrayValueCode('array', indicesCount);
				break;
			case Instruction.Code.POP:
				push('stack.pop();');
				break;
			case Instruction.Code.POP_N:
				push('stack.length -= '+insn.opts[0]+';');
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
				push('this.pc = '+insn.opts[0].pos+';');
				push('continue;');
				break;
			case Instruction.Code.IFNE:
				push('if(stack.pop().toIntValue()._value) {');
				push('    this.pc = '+insn.opts[0].pos+';');
				push('    continue;');
				push('}');
				break;
			case Instruction.Code.IFEQ:
				push('if(!stack.pop().toIntValue()._value) {');
				push('    this.pc = '+insn.opts[0].pos+';');
				push('    continue;');
				push('}');
				break;
			case Instruction.Code.ASSIGN:
				var argc = insn.opts[0];
				if(argc > 1) {
					push('var len = stack.length;');
					push('var agent = stack[len - '+(argc+1)+'];');
					push('var variable = agent.variable;');
					push('if(agent.indices) {');
					push('    var indices = agent.indices.slice();');
					for(var i = 0; i < argc; i ++) {
						push('    variable.assign(indices, stack[len - '+(argc-i)+']);');
						if(i != argc - 1) push('    indices[0] ++;');
					}
					push('} else {'); indent ++;
					push('var offset = agent.offset;');
					push1DMultipleAssignCode(argc);
					indent --; push('}');
					push('stack.length -= '+(argc+1)+';');
				} else {
					push('var arg = stack.pop();');
					push('var agent = stack.pop();');
					push('agent.assign(arg);');
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
				push('var variable = this.getArg('+argNum+');');
				pushAssignCode(indicesCount, argc);
				break;
			case Instruction.Code.ASSIGN_MEMBER:
				var memberNum = insn.opts[0];
				var indicesCount = insn.opts[1];
				var argc = insn.opts[2];
				push('var variable = this.getThismod().toValue().members['+memberNum+'];');
				pushAssignCode(indicesCount, argc);
				break;
			case Instruction.Code.COMPOUND_ASSIGN:
				push('var arg = stack.pop();');
				push('var agent = stack.pop();');
				push('agent.expand();');
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
				pushCompoundAssignCode(calcCode, indicesCount, 'this.getArg('+argNum+')');
				break;
			case Instruction.Code.COMPOUND_ASSIGN_MEMBER:
				var calcCode = insn.opts[0];
				var memberNum = insn.opts[1];
				var indicesCount = insn.opts[2];
				pushCompoundAssignCode(calcCode, indicesCount, 'this.getThismod().toValue().members['+memberNum+']');
				break;
			case Instruction.Code.INC:
				push('var agent = stack.pop();');
				push('agent.expand();');
				push('agent.inc();');
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
				push('var array = this.getArg('+argNum+').value;');
				pushIncCode(indicesCount);
				break;
			case Instruction.Code.INC_MEMBER:
				var memberNum = insn.opts[0];
				var indicesCount = insn.opts[1];
				push('var array = this.getThismod().toValue().members['+memberNum+'].value;');
				pushIncCode(indicesCount);
				break;
			case Instruction.Code.DEC:
				push('var agent = stack.pop();');
				push('agent.expand();');
				push('agent.dec();');
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
				push('var array = this.getArg('+argNum+').value;');
				pushDecCode(indicesCount);
				break;
			case Instruction.Code.DEC_MEMBER:
				var memberNum = insn.opts[0];
				var indicesCount = insn.opts[1];
				push('var array = this.getThismod().toValue().members['+memberNum+'].value;');
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
					push('stack.push(func.apply(this, args));');
				} else {
					push('func.apply(this, args);');
				}
				break;
			case Instruction.Code.CALL_USERDEF_CMD:
			case Instruction.Code.CALL_USERDEF_FUNC:
				var userDefFunc = insn.opts[0];
				var paramTypes = insn.opts[1];
				pushCallingUserdefFuncCode(userDefFunc, paramTypes);
				push('continue;');
				break;
			case Instruction.Code.GETARG:
				var argNum = insn.opts[0];
				push('stack.push(this.getArg('+argNum+'));');
				break;
			case Instruction.Code.PUSH_ARG_VAR:
				var argNum = insn.opts[0];
				var indicesCount = insn.opts[1];
				pushGettingVariableCode('this.getArg('+argNum+')', indicesCount);
				break;
			case Instruction.Code.GET_ARG_VAR:
				var argNum = insn.opts[0];
				var indicesCount = insn.opts[1];
				push('var array = this.getArg('+argNum+').value;');
				pushGettingArrayValueCode('array', indicesCount);
				break;
			case Instruction.Code.PUSH_MEMBER:
				var memberNum = insn.opts[0];
				var indicesCount = insn.opts[1];
				pushGettingVariableCode('this.getThismod().toValue().members['+memberNum+']', indicesCount);
				break;
			case Instruction.Code.GET_MEMBER:
				var memberNum = insn.opts[0];
				var indicesCount = insn.opts[1];
				push('var struct = this.getThismod().toValue();');
				push('var array = struct.members['+memberNum+'].value;');
				pushGettingArrayValueCode('array', indicesCount);
				break;
			case Instruction.Code.THISMOD:
				push('stack.push(this.getThismod());');
				break;
			case Instruction.Code.NEWMOD:
				var varData = insn.opts[0];
				var module = insn.opts[1];
				var paramTypes = insn.opts[2];
				var argc = paramTypes.length;
				if(!userDefFuncs[module.id]) {
					userDefFuncs[module.id] = module;
				}
				var moduleExpr = 'userDefFuncs['+module.id+']';
				var constructor = module.constructor;
				if(!constructor && argc > 0) {
					push('throw new HSPError(ErrorCode.TOO_MANY_PARAMETERS);')
					break;
				}
				push('var variable = '+getVariableExpr(varData)+';');
				push('if(variable.getType() != '+VarType.STRUCT+') {');
				push('    variable.value = new StructArray();');
				push('}');
				push('var array = variable.value;');
				push('var offset = array.newmod('+moduleExpr+');');
				if(constructor) {
					pushCallingUserdefFuncCode(constructor, paramTypes, 'new VariableAgent1D(variable, offset)');
					push('continue;');
				}
				break;
			case Instruction.Code.RETURN:
				var existReturnVal = insn.opts[0];
				var usedPushVar = insn.opts[1];
				push('if(this.frameStack.length == 0) {');
				push('    throw new HSPError(ErrorCode.RETURN_WITHOUT_GOSUB);');
				push('}');
				push('var frame = this.frameStack.pop();');
				push('this.args = frame.prevArgs;');
				if(existReturnVal) {
					push('if(frame.userDefFunc && frame.userDefFunc.isCType) {');
					if(usedPushVar) {
						push('    stack[stack.length - 1] = stack[stack.length - 1].toValue();');
					}
					push('} else {'); indent ++
					push('var val = stack.pop();');
					push('switch(val.getType()) {');
					push('case '+VarType.STR+':');
					push('    this.refstr.assign(0, val.toStrValue());');
					push('    break;');
					push('case '+VarType.DOUBLE+':');
					push('    this.refdval.assign(0, val.toDoubleValue());');
					push('    break;');
					push('case '+VarType.INT+':');
					push('    this.stat.assign(0, val.toIntValue());');
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
				push('this.pc = frame.pc;');
				push('continue;');
				break;
			case Instruction.Code.DELMOD:
				push('var v = this.scanArg(stack.pop(), "v");');
				push('if(v.getType() != VarType.STRUCT) {');
				push('    throw new HSPError(ErrorCode.TYPE_MISMATCH);');
				push('}');
				push('v.assign(StructValue.EMPTY);');
				break;
			case Instruction.Code.REPEAT:
				var pos = insn.opts[0].pos;
				var argc = insn.opts[1];
				push('if(this.loopStack.length >= 31) {');
				push('    throw new HSPError(ErrorCode.TOO_MANY_NEST);');
				push('}');
				if(argc == 2) {
					push('var begin = this.scanArg(stack.pop(), "n").toIntValue()._value;');
				} else {
					push('var begin = 0;');
				}
				if(argc >= 1) {
					push('var end = this.scanArg(stack.pop(), "n").toIntValue()._value;');
					push('if(end < 0) end = Infinity;');
				} else {
					push('var end = Infinity;');
				}
				push('if(end == 0) {');
				push('    this.pc = '+pos+';');
				push('    continue;');
				push('}');
				push('end += begin;');
				push('this.loopStack.push(new LoopData(begin, end, '+(pc + 1)+'));');
				break;
			case Instruction.Code.LOOP:
				push('if(this.loopStack.length == 0) {');
				push('    throw new HSPError(ErrorCode.LOOP_WITHOUT_REPEAT);');
				push('}');
				push('var data = this.loopStack[this.loopStack.length - 1];');
				push('data.cnt ++;');
				push('if(data.cnt < data.end) {');
				push('    this.pc = data.pc;');
				push('    continue;');
				push('}');
				push('this.loopStack.pop();');
				break;
			case Instruction.Code.CNT:
				push('if(this.loopStack.length == 0) {');
				push('    stack.push(new IntValue(0));');
				push('} else {');
				push('    stack.push(new IntValue(this.loopStack[this.loopStack.length - 1].cnt));');
				push('}');
				break;
			case Instruction.Code.CONTINUE:
				var pos = insn.opts[0].pos;
				var argc = insn.opts[1];
				push('if(this.loopStack.length == 0) {');
				push('    throw new HSPError(ErrorCode.LOOP_WITHOUT_REPEAT);');
				push('}');
				push('var data = this.loopStack[this.loopStack.length - 1];');
				var newCntExpr;
				if(argc) {
					newCntExpr = '(data.cnt = this.scanArg(this.stack.pop(), "n").toIntValue()._value)';
				} else {
					newCntExpr = '++data.cnt';
				}
				push('if('+newCntExpr+' >= data.end) {');
				push('    this.loopStack.pop();');
				push('    this.pc = '+pos+';');
				push('} else {');
				push('    this.pc = data.pc;');
				push('}');
				push('continue;');
				break;
			case Instruction.Code.BREAK:
				var label = insn.opts[0];
				push('if(this.loopStack.length == 0) {');
				push('    throw new HSPError(ErrorCode.LOOP_WITHOUT_REPEAT);');
				push('}');
				push('this.loopStack.pop();');
				push('this.pc = '+label.pos+';');
				push('continue;');
				break;
			case Instruction.Code.FOREACH:
				push('if(this.loopStack.length >= 31) {');
				push('    throw new HSPError(ErrorCode.TOO_MANY_NEST);');
				push('}');
				push('this.loopStack.push(new LoopData(0, Infinity, '+(pc + 1)+'));');
				break;
			case Instruction.Code.EACHCHK:
				push('if(this.loopStack.length == 0) {');
				push('    throw new HSPError(ErrorCode.LOOP_WITHOUT_REPEAT);')
				push('}')
				var pos = insn.opts[0].pos;
				push('var v = this.scanArg(stack.pop(), "v");');
				push('var data = this.loopStack[this.loopStack.length - 1];');
				push('if(data.cnt >= v.variable.getL0()) {')
				push('    this.loopStack.pop();');
				push('    this.pc = '+pos+';');
				push('    continue;');
				push('}');
				push('if(v.variable.at(data.cnt).isUsing() == false) {'); // label 型 や struct 型の empty を飛ばす
				push('    data.cnt ++;');
				push('    if(data.cnt >= data.end) {');
				push('        this.loopStack.pop();');
				push('        this.pc = '+pos+';');
				push('    } else {');
				push('        this.pc = data.pc;');
				push('    }');
				push('    continue;');
				push('}');
				break;
			case Instruction.Code.GOSUB:
				pushJumpingSubroutineCode(insn.opts[0].pos);
				push('continue;');
				break;
			case Instruction.Code.GOTO_EXPR:
				push('this.pc = this.scanArg(stack.pop(), "l").toValue().pos;');
				push('continue;');
				break;
			case Instruction.Code.GOSUB_EXPR:
				pushJumpingSubroutineCode('this.scanArg(stack.pop(), "l").toValue().pos');
				push('continue;');
				break;
			case Instruction.Code.EXGOTO:
				push('var pos = this.scanArg(stack.pop(), "l").toValue().pos;');
				push('var b = this.scanArg(stack.pop(), "n").toIntValue()._value;');
				push('var mode = this.scanArg(stack.pop(), "n").toIntValue()._value;');
				push('var a = this.scanArg(this.scanArg(stack.pop(), "v"), "i").toIntValue()._value;');
				push('if(mode >= 0) {');
				push('    if(a >= b) { this.pc = pos; continue; }');
				push('} else {');
				push('    if(a <= b) { this.pc = pos; continue; }');
				push('}');
				break;
			case Instruction.Code.EXGOTO_OPT1:
				var pos = insn.opts[1].pos;
				push('var a = this.scanArg(variables['+insn.opts[0]+'].at(0), "i").toIntValue()._value;');
				push('var b = this.scanArg(stack.pop(), "n").toIntValue()._value;');
				push('var mode = this.scanArg(stack.pop(), "n").toIntValue()._value;');
				push('if(mode >= 0) {');
				push('    if(a >= b) { this.pc = '+pos+'; continue; }');
				push('} else {');
				push('    if(a <= b) { this.pc = '+pos+'; continue; }');
				push('}');
				break;
			case Instruction.Code.EXGOTO_OPT2:
				var pos = insn.opts[1].pos;
				push('var a = this.scanArg(variables['+insn.opts[0]+'].at(0), "i").toIntValue()._value;');
				push('var b = this.scanArg(stack.pop(), "n").toIntValue()._value;');
				push('if(a >= b) { this.pc = '+pos+'; continue; }');
				break;
			case Instruction.Code.EXGOTO_OPT3:
				var pos = insn.opts[1].pos;
				push('var a = this.scanArg(variables['+insn.opts[0]+'].at(0), "i").toIntValue()._value;');
				push('var b = this.scanArg(stack.pop(), "n").toIntValue()._value;');
				push('if(a <= b) { this.pc = '+pos+'; continue; }');
				break;
			case Instruction.Code.ON:
				var argc = insn.opts[0];
				var isGosub = insn.opts[1];
				push('var len = stack.length;');
				for(var i = 0; i < argc; i ++) {
					push('this.scanArg(stack[len - '+(argc - i)+'], "l");');
				}
				push('var n = this.scanArg(stack[len - '+(argc + 1)+'], "n").toIntValue()._value;');
				push('if(0 <= n && n < '+argc+') {'); indent ++;
				push('var pos = stack[len - '+argc+' + n].toValue().pos;');
				push('stack.length -= '+(argc + 1)+';');
				if(isGosub) {
					pushJumpingSubroutineCode('pos');
					push('continue;');
				} else {
					push('this.pc = pos;');
					push('continue;');
				}
				indent --; push('}');
				break;
			default:
				throw new Error("未対応の命令コード: "+insn.code);
			}
			push('this.pc ++;');
			indent --;
		}
		push('}');
		indent --; push('}');
		//print(lines.join("\n"));
		return lines.join("\n");
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
		var args = this.args;
		if(!args) {
			throw new HSPError(ErrorCode.INVALID_PARAMETER);
		}
		return args[argNum];
	},
	getThismod: function getThismod() {
		var thismod = this.getArg(0);
		if(!(thismod instanceof VariableAgent && thismod.getType() == VarType.STRUCT && thismod.isUsing())) {
			throw new HSPError(ErrorCode.INVALID_STRUCT_SOURCE);
		}
		return thismod;
	},
	getErrorOutput: function getErrorOutput(e) {
		var insn = this.sequence[this.pc];
		var lines = [];
		lines.push('#Error '+e.errcode+': '+e.getErrorMessage());
		var backTrace = this.getBackTrace();
		var needToOmit = e.errcode == ErrorCode.STACK_OVERFLOW && backTrace.length >= 50;
		for(var i = 0; i < backTrace.length; i ++) {
			var fileName = backTrace[i][0];
			var lineNo   = backTrace[i][1];
			var funcName = backTrace[i][2];
			var frame    = backTrace[i][3];
			var location;
			if(fileName != null && lineNo != null) {
				location = fileName+':'+lineNo;
			} else {
				location = '(unknown location)';
			}
			if(funcName != null) {
				funcName = "`" + funcName + "'";
			} else if(!frame) {
				funcName = '(top level)';
			} else if(!frame.userDefFunc) {
				funcName = '(a sub routine)';
			}
			lines.push((i==0?'     ':'from ')+location+': in '+funcName);
			if(needToOmit && i == 7) {
				var nextIndex = backTrace.length - 4;
				lines.push(' ... '+(nextIndex - i - 1)+' levels...');
				i = nextIndex - 1;
			}
		}
		return lines.join("\n");
	},
	getBackTrace: function getBackTrace() {
		var result = [];
		var sequence = this.sequence;
		var frameStack = this.frameStack;
		var frameStackPos = frameStack.length;
		var pc = this.pc;
		var builtinFuncName = this.getBuiltinFuncName(sequence[pc]);
		if(builtinFuncName != undefined) {
			result.push([null, null, builtinFuncName+'@hsp', null]);
		}
		for(;;) {
			var insn = sequence[pc];
			var frame = frameStack[--frameStackPos];
			var fileName = null;
			var lineNo = null;
			var funcName = null;
			if(insn) {
				fileName = insn.fileName;
				lineNo = insn.lineNo;
			}
			if(frame && frame.userDefFunc) {
				funcName = frame.userDefFunc.name;
			}
			result.push([fileName, lineNo, funcName, frame]);
			if(!frame) break;
			pc = frame.pc - 1;
		}
		return result;
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
			arg.expand();
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
			if(arg.existSubscript) {
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
	HSPonJS.Event = Event;
}


