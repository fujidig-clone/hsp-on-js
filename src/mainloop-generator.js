function MainLoopGenerator(sequence) {
	this.sequence_ = sequence;
	this.literals_ = [];
	this.userDefFuncs_ = [];
	this.staticVarTags_ = [];
	this.lines_ = [];
	this.indent_ = 0;
}

MainLoopGenerator.Result = function(mainLoop, literals, userDefFuncs, staticVarTags) {
	this.mainLoop = mainLoop;
	this.literals = literals;
	this.userDefFuncs = userDefFuncs;
	this.staticVarTags = staticVarTags;
}

MainLoopGenerator.prototype = {
	generate: function() {
		var mainLoop = this.generateMainLoop();
		return new MainLoopGenerator.Result(mainLoop, this.literals_, this.userDefFuncs_, this.staticVarTags_);
	},
	generateMainLoop: function() {
		var src = '';
		for(var prop in HSPonJS) {
			src += 'var '+prop+' = HSPonJS.'+prop+';\n';
		}
		src += 'return function(stack, literals, variables, userDefFuncs) {\n';
		src += this.generateMainLoopSrc() + '\n};';
		return Function(src)();
	},
	generateMainLoopSrc: function() {
		var sequence = this.sequence_;
		this.push('for(;;) {');
		this.incIndent();
		this.push('switch(this.pc) {');
		for(var pc = 0; pc < sequence.length; pc ++) {
			var insn = sequence[pc];
			this.push('case '+pc+':'); this.incIndent();
			this.pushInsnCode(insn, pc);
			this.push('this.pc ++;');
			this.decIndent();
		}
		this.push('}');
		this.decIndent();
		this.push('}');
		return this.lines_.join("\n");
	},
	pushInsnCode: function(insn, pc) {
		var opts = insn.opts;
		switch(insn.code) {
		case Insn.Code.NOP:
			this.pushCode_NOP(insn, pc);
			break;
		case Insn.Code.PUSH_VAR:
			this.pushCode_PUSH_VAR(insn, pc, opts[0], opts[1]);
			break;
		case Insn.Code.GET_VAR:
			this.pushCode_GET_VAR(insn, pc, opts[0], opts[1]);
			break;
		case Insn.Code.POP:
			this.pushCode_POP(insn, pc);
			break;
		case Insn.Code.POP_N:
			this.pushCode_POP_N(insn, pc, opts[0]);
			break;
		case Insn.Code.DUP:
			this.pushCode_DUP(insn, pc);
			break;
		case Insn.Code.GOTO:
			this.pushCode_GOTO(insn, pc, opts[0]);
			break;
		case Insn.Code.IFNE:
			this.pushCode_IFNE(insn, pc, opts[0], opts[1]);
			break;
		case Insn.Code.IFEQ:
			this.pushCode_IFEQ(insn, pc, opts[0], opts[1]);
			break;
		case Insn.Code.ASSIGN:
			this.pushCode_ASSIGN(insn, pc, opts[0], opts[1], opts[2]);
			break;
		case Insn.Code.COMPOUND_ASSIGN:
			this.pushCode_COMPOUND_ASSIGN(insn, pc, opts[0], opts[1], opts[2], opts[3]);
			break;
		case Insn.Code.INC:
			this.pushCode_INC(insn, pc, opts[0], opts[1]);
			break;
		case Insn.Code.DEC:
			this.pushCode_DEC(insn, pc, opts[0], opts[1]);
			break;
		case Insn.Code.CALL_BUILTIN_CMD:
			this.pushCode_CALL_BUILTIN_CMD(insn, pc, opts[0], opts[1], opts[2]);
			break;
		case Insn.Code.CALL_BUILTIN_FUNC:
			this.pushCode_CALL_BUILTIN_FUNC(insn, pc, opts[0], opts[1], opts[2]);
			break;
		case Insn.Code.CALL_USERDEF_CMD:
			this.pushCode_CALL_USERDEF_CMD(insn, pc, opts[0], opts[1]);
			break;
		case Insn.Code.CALL_USERDEF_FUNC:
			this.pushCode_CALL_USERDEF_FUNC(insn, pc, opts[0], opts[1]);
			break;
		case Insn.Code.NEWMOD:
			this.pushCode_NEWMOD(insn, pc, opts[0], opts[1], opts[2], opts[3]);
			break;
		case Insn.Code.RETURN:
			this.pushCode_RETURN(insn, pc, opts[0]);
			break;
		case Insn.Code.REPEAT:
			this.pushCode_REPEAT(insn, pc, opts[0], opts[1]);
			break;
		case Insn.Code.LOOP:
			this.pushCode_LOOP(insn, pc);
			break;
		case Insn.Code.CNT:
			this.pushCode_CNT(insn, pc);
			break;
		case Insn.Code.CONTINUE:
			this.pushCode_CONTINUE(insn, pc, opts[0], opts[1]);
			break;
		case Insn.Code.BREAK:
			this.pushCode_BREAK(insn, pc, opts[0]);
			break;
		case Insn.Code.FOREACH:
			this.pushCode_FOREACH(insn, pc);
			break;
		case Insn.Code.EACHCHK:
			this.pushCode_EACHCHK(insn, pc, opts[0], opts[1]);
			break;
		case Insn.Code.GOSUB:
			this.pushCode_GOSUB(insn, pc, opts[0]);
			break;
		case Insn.Code.GOTO_EXPR:
			this.pushCode_GOTO_EXPR(insn, pc, opts[0]);
			break;
		case Insn.Code.GOSUB_EXPR:
			this.pushCode_GOSUB_EXPR(insn, pc, opts[0]);
			break;
		case Insn.Code.EXGOTO:
			this.pushCode_EXGOTO(insn, pc, opts[0]);
			break;
		case Insn.Code.ON:
			this.pushCode_ON(insn, pc, opts[0], opts[1], opts[2]);
			break;
		default:
			throw new Error('must not happen');
		}
	},
	pushCode_NOP: function(insn, pc) {
	},
	pushCode_PUSH_VAR: function(insn, pc, varData, indexParamInfos) {
		this.pushGettingVariableCode(varData, indexParamInfos);
	},
	pushCode_GET_VAR: function(insn, pc, varData, indexParamInfos) {
		this.pushGettingArrayValueCode(varData, indexParamInfos);
	},
	pushCode_POP: function(insn, pc) {
		this.push('stack.pop();');
	},
	pushCode_POP_N: function(insn, pc, n) {
		this.pushStackPopCode(n);
	},
	pushCode_DUP: function(insn, pc) {
		this.push('stack.push(stack[stack.length-1]);');
	},
	pushCode_GOTO: function(insn, pc, label) {
		this.push('this.pc = '+label.getPos()+';');
		this.push('continue;');
	},
	pushCode_IFNE: function(insn, pc, label, paramInfo) {
		this.pushBranchCode(label, paramInfo, false);
	},
	pushCode_IFEQ: function(insn, pc, label, paramInfo) {
		this.pushBranchCode(label, paramInfo, true);
	},
	pushCode_ASSIGN: function(insn, pc, varData, indexParamInfos, rhsParamInfos) {
		this.pushAssignCode(varData, indexParamInfos, rhsParamInfos);
	},
	pushCode_COMPOUND_ASSIGN: function(insn, pc, calcCode, varData, indexParamInfos, rhsParamInfo) {
		this.pushCompoundAssignCode(calcCode, varData, indexParamInfos, rhsParamInfo);
	},
	pushCode_INC: function(insn, pc, varData, indexParamInfos) {
		this.pushIncCode(varData, indexParamInfos);
	},
	pushCode_DEC: function(insn, pc, varData, indexParamInfos) {
		this.pushDecCode(varData, indexParamInfos);
	},
	pushCode_CALL_BUILTIN_CMD: function(insn, pc, type, subid, paramInfos) {
		this.pushCallBuiltinFuncCode(type, subid, paramInfos, false);
	},
	pushCode_CALL_BUILTIN_FUNC: function(insn, pc, type, subid, paramInfos) {
		this.pushCallBuiltinFuncCode(type, subid, paramInfos, true);
	},
	pushCode_CALL_USERDEF_CMD: function(insn, pc, userDefFunc, paramInfos) {
		this.pushCallingUserdefFuncCode(userDefFunc, paramInfos, pc);
	},
	pushCode_CALL_USERDEF_FUNC: function(insn, pc, userDefFunc, paramInfos) {
		this.pushCallingUserdefFuncCode(userDefFunc, paramInfos, pc);
	},
	pushCode_NEWMOD: function(insn, pc, varParamInfo, module, paramInfos, argc) {
		var moduleExpr = 'userDefFuncs['+this.registerUserDefFuncs(module)+']';
		var constructor = module.constructor;
		if(!constructor && argc > 0) {
			this.push('throw new HSPError(ErrorCode.TOO_MANY_PARAMETERS);')
			return;
		}
		var variableExpr = this.getNoSubscriptVariableExpr(varParamInfo);
		if(!variableExpr) return;
		this.push('var variable = '+variableExpr+';');
		this.push('if(variable.getType() != '+VarType.STRUCT+') {');
		this.push('    variable.value = new StructArray();');
		this.push('}');
		this.push('var array = variable.value;');
		this.push('var offset = array.newmod('+moduleExpr+');');
		if(constructor) {
			this.pushCallingUserdefFuncCode(constructor, paramInfos, pc, 'new VariableAgent1D(variable, offset)');
		}
	},
	pushCode_RETURN: function(insn, pc, paramInfo) {
		this.push('if(this.frameStack.length == 0) {');
		this.push('    throw new HSPError(ErrorCode.RETURN_WITHOUT_GOSUB);');
		this.push('}');
		if(paramInfo) {
			this.push('var val = '+this.getParamExpr(paramInfo)+';');
			this.push('var frame = this.frameStack.pop();');
			this.push('this.args = frame.prevArgs;');
			this.push('if(frame.userDefFunc && frame.userDefFunc.isCType) {');
			this.push('stack.push(val);');
			this.push('} else {');
			this.incIndent();
			this.push('switch(val.getType()) {');
			this.push('case '+VarType.STR+':');
			this.push('    this.refstr.assign(0, val.toStrValue());');
			this.push('    break;');
			this.push('case '+VarType.DOUBLE+':');
			this.push('    this.refdval.assign(0, val.toDoubleValue());');
			this.push('    break;');
			this.push('case '+VarType.INT+':');
			this.push('    this.stat.assign(0, val.toIntValue());');
			this.push('    break;');
			this.push('default:');
			this.push('    throw new HSPError(ErrorCode.TYPE_MISMATCH);');
			this.push('}');
			this.decIndent();
			this.push('}');
		} else {
			this.push('var frame = this.frameStack.pop();');
			this.push('this.args = frame.prevArgs;');
			this.push('if(frame.userDefFunc && frame.userDefFunc.isCType) {');
			this.push('    throw new HSPError(ErrorCode.NORETVAL);');
			this.push('}');
		}
		this.push('this.pc = frame.pc;');
		this.push('continue;');
	},
	pushCode_REPEAT: function(insn, pc, label, paramInfos) {
		this.push('if(this.loopStack.length >= 31) {');
		this.push('    throw new HSPError(ErrorCode.TOO_MANY_NEST);');
		this.push('}');
		if(paramInfos.length >= 1 && !paramInfos[0].node.isDefaultNode()) {
			this.push('var end = '+this.getIntParamNativeValueExpr(paramInfos[0])+';');
			this.push('if(end < 0) end = Infinity;');
		} else {
			this.push('var end = Infinity;');
		}
		if(paramInfos.length == 2) {
			this.push('var begin = '+this.getIntParamNativeValueExpr(paramInfos[1])+';');
		} else {
			this.push('var begin = 0;');
		}
		this.push('if(end == 0) {');
		this.push('    this.pc = '+label.getPos()+';');
		this.push('    continue;');
		this.push('}');
		this.push('end += begin;');
		this.push('this.loopStack.push(new LoopData(begin, end, '+(pc + 1)+'));');
	},
	pushCode_LOOP: function(insn, pc) {
		this.push('if(this.loopStack.length == 0) {');
		this.push('    throw new HSPError(ErrorCode.LOOP_WITHOUT_REPEAT);');
		this.push('}');
		this.push('var data = this.loopStack[this.loopStack.length - 1];');
		this.push('data.cnt ++;');
		this.push('if(data.cnt < data.end) {');
		this.push('    this.pc = data.pc;');
		this.push('    continue;');
		this.push('}');
		this.push('this.loopStack.pop();');
	},
	pushCode_CNT: function(insn, pc) {
		this.push('if(this.loopStack.length == 0) {');
		this.push('    stack.push(new IntValue(0));');
		this.push('} else {');
		this.push('    stack.push(new IntValue(this.loopStack[this.loopStack.length - 1].cnt));');
		this.push('}');
	},
	pushCode_CONTINUE: function(insn, pc, label, paramInfo) {
		this.push('if(this.loopStack.length == 0) {');
		this.push('    throw new HSPError(ErrorCode.LOOP_WITHOUT_REPEAT);');
		this.push('}');
		this.push('var data = this.loopStack[this.loopStack.length - 1];');
		var newCntExpr;
		if(paramInfo) {
			newCntExpr = '(data.cnt = '+this.getIntParamNativeValueExpr(paramInfo)+')';
		} else {
			newCntExpr = '++data.cnt';
		}
		this.push('if('+newCntExpr+' >= data.end) {');
		this.push('    this.loopStack.pop();');
		this.push('    this.pc = '+label.getPos()+';');
		this.push('} else {');
		this.push('    this.pc = data.pc;');
		this.push('}');
		this.push('continue;');
	},
	pushCode_BREAK: function(insn, pc, label) {
		this.push('if(this.loopStack.length == 0) {');
		this.push('    throw new HSPError(ErrorCode.LOOP_WITHOUT_REPEAT);');
		this.push('}');
		this.push('this.loopStack.pop();');
		this.push('this.pc = '+label.getPos()+';');
		this.push('continue;');
	},
	pushCode_FOREACH: function(insn, pc) {
		this.push('if(this.loopStack.length >= 31) {');
		this.push('    throw new HSPError(ErrorCode.TOO_MANY_NEST);');
		this.push('}');
		this.push('this.loopStack.push(new LoopData(0, Infinity, '+(pc + 1)+'));');
	},
	pushCode_EACHCHK: function(insn, pc, label, paramInfo) {
		var pos = label.getPos();
		this.push('if(this.loopStack.length == 0) {');
		this.push('    throw new HSPError(ErrorCode.LOOP_WITHOUT_REPEAT);')
		this.push('}')
		this.push('var array = '+this.getNoSubscriptVariableExpr(paramInfo)+'.value;');
		this.push('var data = this.loopStack[this.loopStack.length - 1];');
		this.push('if(data.cnt >= array.getL0()) {')
		this.push('    this.loopStack.pop();');
		this.push('    this.pc = '+pos+';');
		this.push('    continue;');
		this.push('}');
		this.push('if(array.at(data.cnt).isUsing() == false) {'); // label 型 や struct 型の empty を飛ばす
		this.push('    data.cnt ++;');
		this.push('    if(data.cnt >= data.end) {');
		this.push('        this.loopStack.pop();');
		this.push('        this.pc = '+pos+';');
		this.push('    } else {');
		this.push('        this.pc = data.pc;');
		this.push('    }');
		this.push('    continue;');
		this.push('}');
	},
	pushCode_GOSUB: function(insn, pc, label) {
		this.pushJumpingSubroutineCode(pc);
		this.push('this.pc = '+label.getPos()+';');
		this.push('continue;');
	},
	pushCode_GOTO_EXPR: function(insn, pc, paramInfo) {
		this.push('this.pc = '+this.getLabelParamNativeValueExpr(paramInfo)+';');
		this.push('continue;');
	},
	pushCode_GOSUB_EXPR: function(insn, pc, paramInfo) {
		this.pushJumpingSubroutineCode(pc);
		this.push('this.pc = '+this.getLabelParamNativeValueExpr(paramInfo)+';');
		this.push('continue;');
	},
	pushCode_EXGOTO: function(insn, pc, paramInfos) {
		var counterParamInfo = paramInfos[0];
		var stepParamInfo    = paramInfos[1];
		var endParamInfo     = paramInfos[2];
		var labelParamInfo   = paramInfos[3];
		if(!counterParamInfo.getPureNode().isVarNode()) {
			this.push('throw new HSPError(ErrorCode.VARIABLE_REQUIRED);');
			return;
		}
		this.push('var counter = '+this.getStrictIntParamNativeValueExpr(counterParamInfo)+';');
		var stepExpr = this.getIntParamNativeValueExpr(stepParamInfo);
		if(stepParamInfo.stackSize != 0) {
			this.push('var step = '+stepExpr+';');
			stepExpr = 'step';
		}
		var endExpr = this.getIntParamNativeValueExpr(endParamInfo);
		if(endParamInfo.stackSize != 0) {
			this.push('var end = '+endExpr+';');
			endExpr = 'end';
		}
		var posExpr = this.getLabelParamNativeValueExpr(labelParamInfo);
		if(labelParamInfo.stackSize != 0) {
			this.push('var pos = '+posExpr+';');
			posExpr = 'pos';
		}
		this.push('if('+stepExpr+' >= 0) {');
		this.push('    if(counter >= '+endExpr+') { this.pc = '+posExpr+'; continue; }');
		this.push('} else {');
		this.push('    if(counter <= '+endExpr+') { this.pc = '+posExpr+'; continue; }');
		this.push('}');
	},
	pushCode_ON: function(insn, pc, isGosub, labelParamInfos, indexParamInfo) {
		var labelsIndex = null;
		var labelExprs = [];
		for(var i = 0; i < labelParamInfos.length; i ++) {
			var paramInfo = labelParamInfos[i];
			if(paramInfo.node.isLabelNode()) {
				labelExprs[i] = '' + paramInfo.node.getLabelPos();
			} else {
				if(labelsIndex == null) {
					this.push('var labels = [];');
					labelsIndex = 0;
				}
				this.push('labels['+labelsIndex+'] = '+this.getLabelParamNativeValueExpr(labelParamInfos[i])+';');
				labelExprs[i] = 'labels['+labelsIndex+']';
				labelsIndex ++;
			}
		}
		var indexExpr = this.getIntParamNativeValueExpr(indexParamInfo);
		this.push('switch('+indexExpr+') {');
		for(var i = 0; i < labelParamInfos.length; i ++) {
			this.push('case '+i+': this.pc = '+labelExprs[i]+'; break;');
		}
		this.push('default: this.pc ++;');
		this.push('}');
		if(isGosub) {
			this.pushJumpingSubroutineCode(pc);
		}
		this.push('continue;');
	},
	pushBranchCode: function(label, paramInfo, reverse) {
		var expr = this.getParamExpr(paramInfo)+'.toIntValue()._value';
		if(reverse) {
			expr = '!' + expr;
		}
		this.push('if('+expr+') {');
		this.push('    this.pc = '+label.getPos()+';');
		this.push('    continue;');
		this.push('}');
	},
	pushCallBuiltinFuncCode: function(type, subid, paramInfos, ctype) {
		this.push('var func = BuiltinFuncs['+type+']['+subid+'];');
		this.push('if(!func) throw new HSPError(ErrorCode.UNSUPPORTED_FUNCTION);');
		this.push('var args = [];');
		for(var i = 0; i < paramInfos.length; i ++) {
			var paramInfo = paramInfos[i];
			var node = paramInfo.node;
			if(node.isDefaultNode()) {
				this.push('args['+i+'] = void 0;');
			} else if(node.isVarNode() && !node.onlyValue) {
				this.push('args['+i+'] = '+this.getNewVariableAgentExpr(node.varData)+';');
			} else {
				this.push('args['+i+'] = '+this.getParamExpr(paramInfo)+';');
			}
		}
		if(ctype) {
			this.push('stack.push(func.apply(this, args));');
		} else {
			this.push('func.apply(this, args);');
		}
	},
	pushJumpingSubroutineCode: function(pc) {
		this.push('if(this.frameStack.length >= 256) {');
		this.push('    throw new HSPError(ErrorCode.STACK_OVERFLOW);');
		this.push('}');
		this.push('this.frameStack.push(new Frame('+(pc + 1)+', null, this.args));');
	},
	pushGettingArrayValueCode: function(varData, indexParamInfos) {
		var result = this.getArrayAndOffsetExpr(varData, indexParamInfos);
		var arrayExpr = result[0];
		var offsetExpr = result[1];
		this.push('stack.push('+arrayExpr+'.at('+offsetExpr+'));');
	},
	pushGettingVariableCode: function(varData, indexParamInfos) {
		var result;
		if(this.isVariableAgentVarData(varData)) {
			result = this.getVariableAgentExpr(varData);
		} else {
			var variableExpr = this.getVariableExpr(varData);
			if(indexParamInfos.length == 0) {
				result = 'new VariableAgent0D('+variableExpr+')';
			} else if(indexParamInfos.length == 1) {
				var paramInfo = indexParamInfos[0];
				this.push('var offset = '+this.getStrictIntParamNativeValueExpr(paramInfo)+';');
				result = 'new VariableAgent1D('+variableExpr+', offset)';
			} else {
				this.pushGettingIndicesCode(indexParamInfos);
				result = 'new VariableAgentMD('+variableExpr+', indices)';
			}
		}
		this.push('stack.push('+result+');');
	},
	pushAssignCode: function(varData, indexParamInfos, rhsParamInfos) {
		if(this.isVariableAgentVarData(varData)) {
			this.pushVariableAgentAssignCode(varData, rhsParamInfos);
		} else {
			this.push('var variable = '+this.getVariableExpr(varData)+';');
			if(indexParamInfos.length == 0) {
				this.push0DAssignCode(rhsParamInfos);
			} else if(indexParamInfos.length == 1) {
				this.push1DAssignCode(indexParamInfos[0], rhsParamInfos);
			} else {
				this.pushMDAssignCode(indexParamInfos, rhsParamInfos);
			}
		}
	},
	pushVariableAgentAssignCode: function(varData, paramInfos) {
		if(paramInfos.length == 1) {
			this.push(this.getVariableAgentExpr(varData)+'.assign('+this.getParamExpr(paramInfos[0])+');');
		} else {
			this.push('var agent = '+this.getVariableAgentExpr(varData)+';');
			this.push('var variable = agent.variable;');
			this.push('if(agent.indices) {');
			this.push('    var indices = agent.indices.slice();');
			for(var i = 0; i < paramInfos.length; i ++) {
				this.push('    variable.assign(indices, '+this.getParamExpr(paramInfos[i])+');');
				if(i != paramInfos.length - 1) {
					this.push('    indices[0] ++;');
				}
			}
			this.push('} else {'); this.incIndent();
			this.push('var offset = agent.offset;');
			this.push1DMultipleAssignCode(paramInfos);
			this.decIndent(); this.push('}');
		}
	},
	push0DAssignCode: function(paramInfos) {
		if(paramInfos.length == 1) {
			this.push('var rhs = '+this.getParamExpr(paramInfos[0])+';');
			this.push('if(variable.value.getType() != rhs.getType()) {');
			this.push('    variable.reset(rhs.getType());');
			this.push('}');
			this.push('variable.value.assign(0, rhs);');
		} else {
			this.push('var rhs = '+this.getParamExpr(paramInfos[0])+';');
			this.push('var type = rhs.getType();');
			this.push('if(variable.value.getType() != type) {');
			this.push('    variable.reset(type);');
			this.push('}');
			this.push('var array = variable.value;');
			this.push('array.expand1D('+(paramInfos.length-1)+');');
			this.push('array.assign(0, rhs);');
			for(var i = 1; i < paramInfos.length; i ++) {
				this.push('var rhs = '+this.getParamExpr(paramInfos[i])+';');
				this.push('if(rhs.getType() != type) throw new HSPError(ErrorCode.INVALID_ARRAYSTORE);');
				this.push('array.assign('+i+', rhs);');
			}
		}
	},
	push1DAssignCode: function(indexParamInfo, rhsParamInfos) {
		this.push('var offset = '+this.getStrictIntParamNativeValueExpr(indexParamInfo)+';');
		if(rhsParamInfos.length == 1) {
			this.push('var rhs = '+this.getParamExpr(rhsParamInfos[0])+';');
			this.push('if(variable.value.getType() != rhs.getType()) {');
			this.push('    if(offset == 0) {');
			this.push('        variable.reset(rhs.getType());');
			this.push('    } else {');
			this.push('        throw new HSPError(ErrorCode.INVALID_ARRAYSTORE);');
			this.push('    }');
			this.push('}');
			this.push('variable.value.expand1D(offset);');
			this.push('variable.value.assign(offset, rhs);');
		} else {
			this.push1DMultipleAssignCode(rhsParamInfos);
		}
	},
	pushMDAssignCode: function(indexParamInfos, rhsParamInfos) {
		this.pushGettingIndicesCode(indexParamInfos);
		for(var i = 0; i < rhsParamInfos.length; i ++) {
			this.push('variable.assign(indices, '+this.getParamExpr(rhsParamInfos[i])+');');
			if(i != rhsParamInfos.length - 1) {
				this.push('indices[0] ++;');
			}
		}
	},
	push1DMultipleAssignCode: function(paramInfos) {
		this.push('if(offset < 0) throw new HSPError(ErrorCode.ARRAY_OVERFLOW);');
		this.push('var rhs = '+this.getParamExpr(paramInfos[0])+';');
		this.push('var type = rhs.getType();');
		this.push('if(variable.value.getType() != type) {');
		this.push('    if(offset == 0) {');
		this.push('        variable.reset(type);');
		this.push('    } else {');
		this.push('        throw new HSPError(ErrorCode.INVALID_ARRAYSTORE);');
		this.push('    }');
		this.push('}');
		this.push('var array = variable.value;');
		this.push('array.expand1D(offset + '+(paramInfos.length-1)+');');
		this.push('array.assign(offset, rhs);');
		for(var i = 1; i < paramInfos.length; i ++) {
			this.push('var rhs = '+this.getParamExpr(paramInfos[i])+';');
			this.push('if(rhs.getType() != type) throw new HSPError(ErrorCode.INVALID_ARRAYSTORE);');
			this.push('array.assign(offset + '+i+', rhs);');
		}
	},
	pushCompoundAssignCode: function(calcCode, varData, indexParamInfos, rhsParamInfo) {
		if(this.isVariableAgentVarData(varData)) {
			this.push('var agent = '+this.getVariableAgentExpr(varData)+';');
			this.push('agent.assign(agent.'+getCalcCodeName(calcCode)+'('+this.getParamExpr(rhsParamInfo)+'));');
			return;
		}
		if(!isCompareCalcCode(calcCode)) {
			this.push('var array = '+this.getVariableExpr(varData)+'.value;');
			if(indexParamInfos.length == 0) {
				this.push('array.assign(0, array.at(0).'+getCalcCodeName(calcCode)+'('+this.getParamExpr(rhsParamInfo)+'));');
			} else if(indexParamInfos.length == 1) {
				this.push('var offset = '+this.getStrictIntParamNativeValueExpr(indexParamInfos[0])+';');
				this.push('array.expand1D(offset);');
				this.push('array.assign(offset, array.at(offset).'+getCalcCodeName(calcCode)+'('+this.getParamExpr(rhsParamInfo)+'));');
			} else {
				this.pushGettingIndicesCode(indexParamInfos);
				this.push('array.expand(indices);');
				this.push('var offset = array.getOffset(indices);');
				this.push('array.assign(offset, array.at(offset).'+getCalcCodeName(calcCode)+'('+this.getParamExpr(rhsParamInfo)+'));');
			}
			return;
		} 
		this.push('var array = '+this.getVariableExpr(varData)+'.value;');
		if(indexParamInfos.length == 0) {
			this.push('if(array.getType() != '+VarType.INT+') {');
			this.push('    throw new HSPError(ErrorCode.TYPE_MISMATCH);');
			this.push('}');
			this.push('array.assign(0, array.at(0).'+getCalcCodeName(calcCode)+'('+this.getParamExpr(rhsParamInfo)+'));');
		} else if(indexParamInfos.length == 1) {
			this.push('var offset = '+this.getStrictIntParamNativeValueExpr(indexParamInfos[0])+';');
			this.push('if(array.getType() != '+VarType.INT+') {');
			this.push('    if(offset == 0) {');
			this.push('        throw new HSPError(ErrorCode.TYPE_MISMATCH);');
			this.push('    } else {');
			this.push('        throw new HSPError(ErrorCode.INVALID_ARRAYSTORE);');
			this.push('    }');
			this.push('}');
			this.push('array.expand1D(offset);');
			this.push('array.assign(offset, array.at(offset).'+getCalcCodeName(calcCode)+'('+this.getParamExpr(rhsParamInfo)+'));');
		} else {
			this.pushGettingIndicesCode(indexParamInfos);
			this.push('array.expand(indices);');
			this.push('var offset = array.getOffset(indices);');
			this.push('if(array.getType() != '+VarType.INT+') {');
			this.push('    if(offset == 0) {');
			this.push('        throw new HSPError(ErrorCode.TYPE_MISMATCH);');
			this.push('    } else {');
			this.push('        throw new HSPError(ErrorCode.INVALID_ARRAYSTORE);');
			this.push('    }');
			this.push('}');
			this.push('array.assign(offset, array.at(offset).'+getCalcCodeName(calcCode)+'('+this.getParamExpr(rhsParamInfo)+'));');
		}
	},
	pushIncDecCode: function(methodName, varData, indexParamInfos) {
		if(this.isVariableAgentVarData(varData)) {
			this.push('var agent = '+this.getVariableAgentExpr(varData)+';');
			this.push('agent.expand();');
			this.push('agent.'+methodName+'();');
			return;
		}
		this.push('var array = '+this.getVariableExpr(varData)+'.value;');
		if(indexParamInfos.length == 0) {
			this.push('array.'+methodName+'(0);');
		} else if(indexParamInfos.length == 1) {
			this.push('var offset = '+this.getStrictIntParamNativeValueExpr(indexParamInfos[0])+';');
			this.push('array.expand1D(offset);');
			this.push('array.'+methodName+'(offset);');
		} else {
			this.pushGettingIndicesCode(indexParamInfos);
			this.push('array.expand(indices);');
			this.push('var offset = array.getOffset(indices);');
			this.push('array.'+methodName+'(offset);');
		}
	},
	pushIncCode: function(varData, indexParamInfos) {
		this.pushIncDecCode('inc', varData, indexParamInfos);
	},
	pushDecCode: function(varData, indexParamInfos) {
		this.pushIncDecCode('dec', varData, indexParamInfos);
	},
	pushCallingUserdefFuncCode: function(userDefFunc, paramInfos, pc, constructorThismodExpr) {
		this.registerUserDefFuncs(userDefFunc);
		var paramMax = paramInfos.length;
		var mptypes = userDefFunc.paramTypes;
		var argMax = mptypes.length;
		var recvArgMax = 0; // local を除いた仮引数の数
		for(var i = 0; i < argMax; i ++) {
			var mptype = mptypes[i];
			var paramInfo = paramInfos[recvArgMax];
			if(mptype == MPType.LOCALVAR || mptype == MPType.IMODULEVAR) continue;
			if(mptype == MPType.ARRAYVAR && paramInfo &&
			   !paramInfo.getPureNode().isVarNode()) {
				this.push('throw new HSPError(ErrorCode.VARIABLE_REQUIRED);');
				return;
			} else if((!paramInfo || paramInfo.node.isDefaultNode()) && mptype != MPType.INUM) {
				this.push('throw new HSPError(ErrorCode.NO_DEFAULT);');
				return;
			}
			recvArgMax ++;
		}
		if(recvArgMax < paramMax) {
			this.push('throw new HSPError(ErrorCode.TOO_MANY_PARAMETERS);');
			return;
		}
		this.push('var args = [];');
		this.pushCallingUserdefFuncCode0(mptypes, paramInfos, constructorThismodExpr);
		this.push('if(this.frameStack.length >= 256) {');
		this.push('    throw new HSPError(ErrorCode.STACK_OVERFLOW);');
		this.push('}');
		this.push('this.frameStack.push(new Frame('+(pc + 1)+', userDefFuncs['+userDefFunc.id+'], args, this.args));');
		this.push('this.args = args;');
		this.push('this.pc = '+userDefFunc.label.getPos()+';');
		this.push('continue;');
	},
	pushCallingUserdefFuncCode0: function(mptypes, paramInfos, constructorThismodExpr) {
		var argMax = mptypes.length;
		var origArgsCount = 0;
		for(var i = 0; i < argMax; i ++) {
			var mptype = mptypes[i];
			var paramInfo = paramInfos[origArgsCount];
			switch(mptype) {
			case MPType.DNUM:
				this.push('args['+i+'] = '+this.getDoubleParamExpr(paramInfo)+';');
				break;
			case MPType.INUM:
				if(!paramInfo || paramInfo.node.isDefaultNode()) {
					this.push('args['+i+'] = IntValue.of(0);');
				} else {
					this.push('args['+i+'] = '+this.getIntParamExpr(paramInfo)+';');
				}
				break;
			case MPType.LOCALVAR:
				this.push('args['+i+'] = new Variable;');
				continue;
			case MPType.ARRAYVAR:
				var node = paramInfo.node;
				if(node.isVarNode()) {
					this.push('args['+i+'] = '+this.getVariableExpr(node.varData)+';');
				} else {
					this.push('var arg = '+this.getParamExpr(paramInfo)+';');
					this.push('arg.expand();');
					this.push('args['+i+'] = arg.variable;');
				}
				break;
			case MPType.SINGLEVAR:
			case MPType.MODULEVAR:
				var node = paramInfo.node;
				if(node.isVarNode()) {
					this.push('args['+i+'] = '+this.getNewVariableAgentExpr(node.varData)+';');
				} else if(node.isGetStackNode() && node.originalNode.isVarNode()) {
					this.push('var arg = '+this.getParamExpr(paramInfo)+';');
					this.push('arg.expand();');
					this.push('args['+i+'] = arg;');
				} else {
					this.push('var arg = new VariableAgent0D(new Variable);');
					this.push('arg.assign('+this.getParamExpr(paramInfo)+');');
					this.push('args['+i+'] = arg;');
				}
				break;
			case MPType.LOCALSTRING:
				this.push('args['+i+'] = '+this.getStrParamExpr(paramInfo)+';');
				break;
			case MPType.IMODULEVAR:
				this.push('args['+i+'] = '+constructorThismodExpr+';');
				continue;
			default:
				throw new Error('未対応のパラメータタイプ: '+mptype);
			}
			origArgsCount ++;
		}
	},
	pushGettingIndicesCode: function(indexParamInfos) {
		this.push('var indices = [];');
		for(var i = 0; i < indexParamInfos.length; i ++) {
			this.push('indices['+i+'] = '+this.getStrictIntParamNativeValueExpr(indexParamInfos[i])+';');
		}
	},
	getVariableExpr: function(varData) {
		if(this.isVariableAgentVarData(varData)) {
			return this.getVariableAgentExpr(varData)+'.variable';
		}
		var type = varData.proxyVarType;
		var id = varData.id;
		switch(type) {
		case ProxyVarType.STATIC:
			return 'variables['+this.registerStaticVarTags(id)+']';
		case ProxyVarType.MEMBER:
			return 'this.getThismod().toValue().members['+id+']';
		case ProxyVarType.ARG_ARRAY:
		case ProxyVarType.ARG_LOCAL:
			return 'this.getArg('+id+')';
		default:
			throw new Error('must not happen');
		}
	},
	isVariableAgentVarData: function(varData) {
		var type = varData.proxyVarType;
		return type == ProxyVarType.THISMOD || type == ProxyVarType.ARG_VAR;
	},
	getNewVariableAgentExpr: function(varData) {
		if(this.isVariableAgentVarData(varData)) {
			return this.getVariableAgentExpr(varData);
		}
		return 'new VariableAgent0D('+this.getVariableExpr(varData)+')';
	},
	getVariableAgentExpr: function(varData) {
		switch(varData.proxyVarType) {
		case ProxyVarType.THISMOD:
			return 'this.getThismod()';
		case ProxyVarType.ARG_VAR:
			return 'this.getArg('+varData.id+')';
		default:
			throw new Error('must not happen');
		}
	},
	getArrayAndOffsetExpr: function(varData, indexParamInfos) {
		if(this.isVariableAgentVarData(varData)) {
			this.push('var agent = '+this.getVariableAgentExpr(varData)+';');
			return ['agent.variable.value', 'agent.getOffset()'];
		}
		var arrayExpr = this.getVariableExpr(varData)+'.value';
		var offsetExpr = 'offset';
		if(indexParamInfos.length == 0) {
			offsetExpr = '0';
		} else if(indexParamInfos.length == 1) {
			var paramInfo = indexParamInfos[0];
			this.push('var array = '+arrayExpr+';');
			arrayExpr = 'array';
			this.push('var offset = '+this.getStrictIntParamNativeValueExpr(paramInfo)+';');
			this.push('if(!(0 <= offset && offset < array.getL0())) {');
			this.push('    throw new HSPError(ErrorCode.ARRAY_OVERFLOW);');
			this.push('}');
		} else {
			this.push('var array = '+arrayExpr+';');
			arrayExpr = 'array';
			this.pushGettingIndicesCode(indexParamInfos);
			this.push('var offset = array.getOffset(indices);');
			this.push('if(offset == null) throw new HSPError(ErrorCode.ARRAY_OVERFLOW);');
		}
		return [arrayExpr, offsetExpr];
	},
	getIntParamExpr: function(paramInfo) {
		var node = paramInfo.node;
		if(node.getValueType() == VarType.INT) {
			return this.getParamExpr(paramInfo);
		}
		if(node.isLiteralNode() && node.val.getType() == VarType.DOUBLE) {
			return this.getParamExpr(new ParamInfo(new LiteralNode(node.val.toIntValue())));
		}
		if(node.getValueType() == VarType.DOUBLE) {
			return this.getParamExpr(paramInfo)+'.toIntValue()';
		}
		return 'this.scanArg('+this.getParamExpr(paramInfo)+', "n").toIntValue()';
	},
	getDoubleParamExpr: function(paramInfo) {
		var node = paramInfo.node;
		if(node.getValueType() == VarType.DOUBLE) {
			return this.getParamExpr(paramInfo);
		}
		if(node.isLiteralNode() && node.val.getType() == VarType.INT) {
			return this.getParamExpr(new ParamInfo(new LiteralNode(node.val.toDoubleValue())));
		}
		if(node.getValueType() == VarType.INT) {
			return this.getParamExpr(paramInfo)+'.toDoubleValue()';
		}
		return 'this.scanArg('+this.getParamExpr(paramInfo)+', "n").toDoubleValue()';
	},
	getStrParamExpr: function(paramInfo) {
		var node = paramInfo.node;
		if(node.getValueType() == VarType.STR) {
			return this.getParamExpr(paramInfo);
		}
		return 'this.scanArg('+this.getParamExpr(paramInfo)+', "s").toStrValue()';
	},
	getIntParamNativeValueExpr: function(paramInfo) {
		var node = paramInfo.node;
		if(node.isLiteralNode() && 
		   (node.val.getType() == VarType.INT || node.val.getType() == VarType.DOUBLE)) {
			return '' + node.val.toIntValue()._value;
		}
		if(node.getValueType() == VarType.INT) {
			return this.getParamExpr(paramInfo)+'._value';
		}
		if(node.getValueType() == VarType.DOUBLE) {
			return '('+this.getParamExpr(paramInfo)+'._value|0)';
		}
		return 'this.scanArg('+this.getParamExpr(paramInfo)+', "n").toIntValue()._value';
	},
	getStrictIntParamNativeValueExpr: function(paramInfo) {
		var node = paramInfo.node;
		if(node.isLiteralNode() && node.val.getType() == VarType.INT) {
			return '' + node.val._value;
		}
		if(node.getValueType() == VarType.INT) {
			return this.getParamExpr(paramInfo)+'._value';
		}
		return 'this.scanArg('+this.getParamExpr(paramInfo)+', "i").toIntValue()._value';
	},
	getLabelParamNativeValueExpr: function(paramInfo) {
		var node = paramInfo.node;
		if(node.isLabelNode()) {
			return '' + node.getLabelPos();
		}
		return 'this.scanArg('+this.getParamExpr(paramInfo)+', "l").toValue().pos';
	},
	getParamExpr: function(paramInfo) {
		var result = this.getParamExpr0(paramInfo.node);
		return result;
	},
	getParamExpr0: function(node) {
		switch(node.nodeType) {
		case NodeType.VAR:
			if(node.indexNodes.length > 0) {
				throw new Error('must not happen');
			}
			if(this.isVariableAgentVarData(node.varData)) {
				return this.getVariableAgentExpr(node.varData)+'.toValue()';
			}
			return this.getVariableExpr(node.varData)+'.value.at(0)';
		case NodeType.ARG:
			return 'this.getArg('+node.id+')';
		case NodeType.LITERAL:
			return this.getLiteralExpr(node.val);
		case NodeType.LABEL:
			return this.getLiteralExpr(new LabelValue(node.getLabelPos()));
		case NodeType.DEFAULT:
			return 'throwHSPError('+ErrorCode.NO_DEFAULT+')';
		case NodeType.OPERATE:
			return '('+this.getParamExpr0(node.lhsNode)+').'+getCalcCodeName(node.calcCode)+'('+this.getParamExpr0(node.rhsNode)+')';
		case NodeType.GET_STACK:
			return 'stack.pop()';
		default:
			throw new Error('must not happen');
		}
	},
	getNoSubscriptVariableExpr: function(paramInfo) {
		var node = paramInfo.node.toPureNode();
		if(!node.isVarNode() || node.onlyValue) {
			this.push('throw new HSPError(ErrorCode.VARIABLE_REQUIRED);');
			return null;
		}
		if(node.indexNodes.length > 0) {
			// 添え字指定があってスタック上に VariableAgent が積まれていてもエラーで落とすので pop する必要はない
			this.push('throw new HSPError(ErrorCode.BAD_ARRAY_EXPRESSION);');
			return null;
		}
		var varData = node.varData;
		if(this.isVariableAgentVarData(varData)) {
			this.push('var agent = '+this.getVariableAgentExpr(varData)+';');
			this.push('if(agent.existSubscript) {')
			this.push('    throw new HSPError(ErrorCode.BAD_ARRAY_EXPRESSION);');
			this.push('}');
			return 'agent.variable';
		}
		return this.getVariableExpr(varData);
	},
	getLiteralExpr: function(literal) {
		var literals = this.literals_;
		var pos = literals.length;
		literals[pos] = literal;
		return 'literals['+pos+']';
	},
	registerStaticVarTags: function(staticVarTag) {
		if(typeof staticVarTag.id != 'undefined') {
			return staticVarTag.id;
		}
		var staticVarTags = this.staticVarTags_;
		var id = staticVarTags.length;
		staticVarTag.id = id;
		staticVarTags[id] = staticVarTag;
		return id;
	},
	registerUserDefFuncs: function(userDefFunc) {
		if(typeof userDefFunc.id != 'undefined') {
			return userDefFunc.id;
		}
		var userDefFuncs = this.userDefFuncs_;
		var id = userDefFuncs.length;
		userDefFuncs[id] = userDefFunc;
		userDefFunc.id = id;
		return id;
	},
	pushStackPopCode: function(size) {
		if(size == 0) {
			// nothing
		} else if(size == 1) {
			this.push('-- stack.length;');
		} else {
			this.push('stack.length -= '+size+';');
		}
	},
	toSimpleExpr: function(expr, defaultVarName) {
		if(/^(?:[$A-Za-z][$0-9A-Za-z]*|-?[0-9]+)$/.test(expr)) {
			// 単一の変数か整数リテラルならそのまま
			return expr;
		}
		this.push('var '+defaultVarName+' = '+expr+';');
		return defaultVarName;
	},
	push: function(line) {
		this.lines_.push(Utils.strTimes('\t', this.indent_) + line);
	},
	incIndent: function() {
		this.indent_ ++;
	},
	decIndent: function() {
		this.indent_ --;
	}
};

if(typeof HSPonJS != 'undefined') {
	HSPonJS.MainLoopGenerator = MainLoopGenerator;
}

