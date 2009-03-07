function MainLoopGenerator(sequence) {
	this.sequence_ = sequence;
	this.literals_ = [];
	this.staticVarTags_ = [];
	this.registeredObjects_ = [];
	this.registeredObjectTags_ = [];
	this.lines_ = [];
	this.indent_ = 0;
	this.id = MainLoopGenerator.count++;
	this.registerPropName = '_hsponjs_mainloop_registered_id_' + this.id;
}

MainLoopGenerator.count = 0;

MainLoopGenerator.Result = function(mainLoop, literals, staticVarTags, registeredObjects) {
	this.mainLoop = mainLoop;
	this.literals = literals;
	this.staticVarTags = staticVarTags;
	this.registeredObjects = registeredObjects;
}

function _defaultExpr(expr) {
	if(expr != null) {
		return expr;
	}
	return 'throwHSPError('+ErrorCode.NO_DEFAULT+')';
}

var _isDefault = isDefaultParamInfo;

MainLoopGenerator.prototype = {
	generate: function() {
		try {
			var mainLoop = this.generateMainLoop();
			return new MainLoopGenerator.Result(mainLoop, this.literals_, this.staticVarTags_, this.registeredObjects_);
		} finally {
			this.removeRegisteredObjectsPropName();
		}
	},
	generateMainLoop: function() {
		var src = '';
		for(var prop in HSPonJS) {
			src += 'var '+prop+' = HSPonJS.'+prop+';\n';
		}
		src += 'return function() {\n';
		src += this.generateMainLoopSrc() + '\n};';
		return Function(src)();
	},
	generateMainLoopSrc: function() {
		var sequence = this.sequence_;
		this.push('var stack = this.stack;');
		this.push('var literals = this.literals;');
		this.push('var variables = this.variables;');
		this.push('var registeredObjects = this.registeredObjects;');
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
		var moduleExpr = this.getRegisteredObjectExpr(module);
		var constructor = module.constructor;
		if(!constructor && argc > 0) {
			this.push('throw new HSPError(ErrorCode.TOO_MANY_PARAMETERS);')
			return;
		}
		var variableExpr = this.getNoSubscriptVariableParamExpr(varParamInfo);
		this.push('var variable = '+variableExpr+';');
		this.push('if(variable.value.type != '+VarType.STRUCT+') {');
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
			this.push('switch(val.type) {');
			this.push('case '+VarType.STR+':');
			this.push('    this.refstr.assign(0, val);');
			this.push('    break;');
			this.push('case '+VarType.DOUBLE+':');
			this.push('    this.refdval.assign(0, val);');
			this.push('    break;');
			this.push('case '+VarType.INT+':');
			this.push('    this.stat.assign(0, val);');
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
		this.pushStartLoopCode();
		if(paramInfos.length >= 1 && !paramInfos[0].node.isDefaultNode()) {
			this.push('this.cntEnd = '+this.getIntParamNativeValueExpr(paramInfos[0])+';');
			this.push('if(this.cntEnd < 0) this.cntEnd = Infinity;');
		} else {
			this.push('this.cntEnd = Infinity;');
		}
		if(paramInfos.length == 2) {
			this.push('this.cnt = '+this.getIntParamNativeValueExpr(paramInfos[1])+';');
		} else {
			this.push('this.cnt = 0;');
		}
		this.push('if(this.cntEnd == 0) {');
		this.push('    this.pc = '+label.getPos()+';');
		this.push('    continue;');
		this.push('}');
		this.push('this.cntEnd += this.cnt;');
		this.push('this.loopStartPos = '+(pc + 1)+';');
		this.push('this.looplev ++;');
	},
	pushCode_LOOP: function(insn, pc) {
		this.push('if(this.looplev == 0) {');
		this.push('    throw new HSPError(ErrorCode.LOOP_WITHOUT_REPEAT);');
		this.push('}');
		this.push('this.cnt ++;');
		this.push('if(this.cnt < this.cntEnd) {');
		this.push('    this.pc = this.loopStartPos;');
		this.push('    continue;');
		this.push('}');
		this.pushEndLoopCode();
	},
	pushCode_CONTINUE: function(insn, pc, label, paramInfo) {
		this.push('if(this.looplev == 0) {');
		this.push('    throw new HSPError(ErrorCode.LOOP_WITHOUT_REPEAT);');
		this.push('}');
		var newCntExpr;
		if(paramInfo) {
			newCntExpr = '(this.cnt = '+this.getIntParamNativeValueExpr(paramInfo)+')';
		} else {
			newCntExpr = '++this.cnt';
		}
		this.push('if('+newCntExpr+' >= this.cntEnd) {');
		this.incIndent();
		this.pushEndLoopCode();
		this.push('this.pc = '+label.getPos()+';');
		this.decIndent();
		this.push('} else {');
		this.push('    this.pc = this.loopStartPos;');
		this.push('}');
		this.push('continue;');
	},
	pushCode_BREAK: function(insn, pc, label) {
		this.push('if(this.looplev == 0) {');
		this.push('    throw new HSPError(ErrorCode.LOOP_WITHOUT_REPEAT);');
		this.push('}');
		this.pushEndLoopCode();
		this.push('this.pc = '+label.getPos()+';');
		this.push('continue;');
	},
	pushCode_FOREACH: function(insn, pc) {
		this.pushStartLoopCode();
		this.push('this.cnt = 0;');
		this.push('this.cntEnd = Infinity;');
		this.push('this.loopStartPos = '+(pc + 1)+';');
		this.push('this.looplev ++;');
	},
	pushCode_EACHCHK: function(insn, pc, label, paramInfo) {
		var pos = label.getPos();
		this.push('if(this.looplev == 0) {');
		this.push('    throw new HSPError(ErrorCode.LOOP_WITHOUT_REPEAT);')
		this.push('}')
		this.push('var array = '+this.getNoSubscriptVariableParamExpr(paramInfo)+'.value;');
		this.push('if(this.cnt >= array.getL0()) {')
		this.pushEndLoopCode();
		this.push('    this.pc = '+pos+';');
		this.push('    continue;');
		this.push('}');
		this.push('if(array.at(this.cnt).isUsing() == false) {'); // label 型 や struct 型の empty を飛ばす
		this.push('    this.cnt ++;');
		this.push('    if(this.cnt >= this.cntEnd) {');
		this.pushEndLoopCode();
		this.push('        this.pc = '+pos+';');
		this.push('    } else {');
		this.push('        this.pc = this.loopStartPos;');
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
		var expr = this.getIntParamNativeValueExpr(paramInfo);
		if(reverse) {
			expr = '!' + expr;
		}
		this.push('if('+expr+') {');
		this.push('    this.pc = '+label.getPos()+';');
		this.push('    continue;');
		this.push('}');
	},
	pushStartLoopCode: function() {
		this.push('if(this.looplev >= 31) {');
		this.push('    throw new HSPError(ErrorCode.TOO_MANY_NEST);');
		this.push('}');
		this.push('this.cntStack[this.looplev] = this.cnt;');
		this.push('this.cntEndStack[this.looplev] = this.cntEnd;');
		this.push('this.loopStartPosStack[this.looplev] = this.loopStartPos;');
	},
	pushEndLoopCode: function() {
		this.push('this.looplev --;');
		this.push('this.cnt = this.cntStack[this.looplev];');
		this.push('this.cntEnd = this.cntEndStack[this.looplev];');
		this.push('this.loopStartPos = this.loopStartPosStack[this.looplev];');
	},
	pushCallBuiltinFuncCode: function(type, subid, paramInfos, ctype) {
		var info = BuiltinFuncInfos[type][subid];
		if(info && info.func) {
			this.pushBuiltinFuncInlineCode(info, paramInfos);
			return;
		}
		this.push('throw new HSPError(ErrorCode.UNSUPPORTED_FUNCTION);');
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
		if(varData.isVariableAgentVarData()) {
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
		if(varData.isVariableAgentVarData()) {
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
			this.push('if(variable.value.type != rhs.type) {');
			this.push('    variable.reset(rhs.type);');
			this.push('}');
			this.push('variable.value.assign(0, rhs);');
		} else {
			this.push('var rhs = '+this.getParamExpr(paramInfos[0])+';');
			this.push('var type = rhs.type;');
			this.push('if(variable.value.type != type) {');
			this.push('    variable.reset(type);');
			this.push('}');
			this.push('var array = variable.value;');
			this.push('array.expand1D('+(paramInfos.length-1)+');');
			this.push('array.assign(0, rhs);');
			for(var i = 1; i < paramInfos.length; i ++) {
				this.push('var rhs = '+this.getParamExpr(paramInfos[i])+';');
				this.push('if(rhs.type != type) throw new HSPError(ErrorCode.INVALID_ARRAYSTORE);');
				this.push('array.assign('+i+', rhs);');
			}
		}
	},
	push1DAssignCode: function(indexParamInfo, rhsParamInfos) {
		this.push('var offset = '+this.getStrictIntParamNativeValueExpr(indexParamInfo)+';');
		if(rhsParamInfos.length == 1) {
			this.push('var rhs = '+this.getParamExpr(rhsParamInfos[0])+';');
			this.push('if(variable.value.type != rhs.type) {');
			this.push('    if(offset == 0) {');
			this.push('        variable.reset(rhs.type);');
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
		this.push('var type = rhs.type;');
		this.push('if(variable.value.type != type) {');
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
			this.push('if(rhs.type != type) throw new HSPError(ErrorCode.INVALID_ARRAYSTORE);');
			this.push('array.assign(offset + '+i+', rhs);');
		}
	},
	pushCompoundAssignCode: function(calcCode, varData, indexParamInfos, rhsParamInfo) {
		if(varData.isVariableAgentVarData()) {
			this.push('var agent = '+this.getVariableAgentExpr(varData)+';');
			this.push('agent.assign(agent.toValue().'+getCalcCodeName(calcCode)+'('+this.getParamExpr(rhsParamInfo)+'));');
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
			this.push('if(array.type != '+VarType.INT+') {');
			this.push('    throw new HSPError(ErrorCode.TYPE_MISMATCH);');
			this.push('}');
			this.push('array.assign(0, array.at(0).'+getCalcCodeName(calcCode)+'('+this.getParamExpr(rhsParamInfo)+'));');
		} else if(indexParamInfos.length == 1) {
			this.push('var offset = '+this.getStrictIntParamNativeValueExpr(indexParamInfos[0])+';');
			this.push('if(array.type != '+VarType.INT+') {');
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
			this.push('if(array.type != '+VarType.INT+') {');
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
		if(varData.isVariableAgentVarData()) {
			this.push('var agent = '+this.getVariableAgentExpr(varData)+';');
			this.push('agent.expand().'+methodName+'();');
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
		var userDefFuncExpr = this.getRegisteredObjectExpr(userDefFunc);
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
		this.push('this.frameStack.push(new Frame('+(pc + 1)+', '+userDefFuncExpr+', args, this.args));');
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
					this.push('args['+i+'] = '+this.getParamExpr(paramInfo)+'.expand().variable;');
				}
				break;
			case MPType.SINGLEVAR:
			case MPType.MODULEVAR:
				var node = paramInfo.node;
				if(node.isVarNode()) {
					this.push('args['+i+'] = '+this.getNewVariableAgentExpr(node.varData)+';');
				} else if(node.isGetStackNode() && node.originalNode.isVarNode()) {
					this.push('args['+i+'] = '+this.getParamExpr(paramInfo)+'.expand();');
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
	getArrayAndOffsetExpr: function(varData, indexParamInfos) {
		if(varData.isVariableAgentVarData()) {
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
	getNoSubscriptVariableParamExpr: function(paramInfo) {
		if(isDefaultParamInfo(paramInfo)) {
			return 'throwHSPError('+ErrorCode.VARIABLE_REQUIRED+')';
		}
		var node = paramInfo.node.toPureNode();
		if(!node.isVarNode() || node.onlyValue) {
			return 'throwHSPError('+ErrorCode.VARIABLE_REQUIRED+')';
		}
		if(node.indexNodes.length > 0) {
			// 添え字指定があってスタック上に VariableAgent が積まれていてもエラーで落とすので pop する必要はない
			return 'throwHSPError('+ErrorCode.BAD_ARRAY_EXPRESSION+')';
		}
		var varData = node.varData;
		if(node.varData.isVariableAgentVarData()) {
			this.push('var agent = '+this.getVariableAgentExpr(varData)+';');
			this.push('if(agent.existSubscript) {')
			this.push('    throw new HSPError(ErrorCode.BAD_ARRAY_EXPRESSION);');
			this.push('}');
			return 'agent.variable';
		}
		return this.getVariableExpr(varData);
	},
	getVariableParamExpr: function(paramInfo) {
		if(isDefaultParamInfo(paramInfo)) {
			return 'throwHSPError('+ErrorCode.VARIABLE_REQUIRED+')';
		}
		var node = paramInfo.node;
		if(node.isVarNode()) {
			return this.getVariableExpr(node.varData);
		} else if(node.isGetStackNode() && node.originalNode.isVarNode()) {
			return this.getParamExpr(paramInfo)+'.expand().variable';
		} else {
			return 'throwHSPError('+ErrorCode.VARIABLE_REQUIRED+')';
		}
	},
	getVariableAgentParamExpr: function(paramInfo) {
		if(isDefaultParamInfo(paramInfo)) {
			return 'throwHSPError('+ErrorCode.VARIABLE_REQUIRED+')';
		}
		var node = paramInfo.node;
		if(node.isVarNode()) {
			return this.getNewVariableAgentExpr(node.varData);
		} else if(node.isGetStackNode() && node.originalNode.isVarNode()) {
			return this.getParamExpr(paramInfo)+'.expand()';
		} else {
			return 'throwHSPError('+ErrorCode.VARIABLE_REQUIRED+')';
		}
	},
	getIntParamExpr: function(paramInfo, defaultExpr) {
		if(_isDefault(paramInfo)) return _defaultExpr(defaultExpr);
		var node = paramInfo.node;
		if(node.getValueType() == VarType.INT) {
			return this.getParamExpr(paramInfo);
		}
		if(node.isLiteralNode() && node.val.type == VarType.DOUBLE) {
			return this.getParamExpr(new ParamInfo(new LiteralNode(node.val.toIntValue())));
		}
		if(node.getValueType() == VarType.DOUBLE) {
			return this.getParamExpr(paramInfo)+'.toIntValue()';
		}
		return 'checkTypeNumber('+this.getParamExpr(paramInfo)+').toIntValue()';
	},
	getDoubleParamExpr: function(paramInfo, defaultExpr) {
		if(_isDefault(paramInfo)) return _defaultExpr(defaultExpr);
		var node = paramInfo.node;
		if(node.getValueType() == VarType.DOUBLE) {
			return this.getParamExpr(paramInfo);
		}
		if(node.isLiteralNode() && node.val.type == VarType.INT) {
			return this.getParamExpr(new ParamInfo(new LiteralNode(node.val.toDoubleValue())));
		}
		if(node.getValueType() == VarType.INT) {
			return this.getParamExpr(paramInfo)+'.toDoubleValue()';
		}
		return 'checkTypeNumber('+this.getParamExpr(paramInfo)+').toDoubleValue()';
	},
	getStrParamExpr: function(paramInfo, defaultExpr) {
		if(_isDefault(paramInfo)) return _defaultExpr(defaultExpr);
		var node = paramInfo.node;
		if(node.getValueType() == VarType.STR) {
			return this.getParamExpr(paramInfo);
		}
		return 'checkTypeStr('+this.getParamExpr(paramInfo)+')';
	},
	getIntParamNativeValueExpr: function(paramInfo, defaultExpr) {
		if(_isDefault(paramInfo)) return _defaultExpr(defaultExpr);
		var node = paramInfo.node;
		if(node.isLiteralNode() && 
		   (node.val.type == VarType.INT || node.val.type == VarType.DOUBLE)) {
			return '' + node.val.toIntValue()._value;
		}
		if(node.getValueType() == VarType.INT) {
			return this.getParamExpr(paramInfo)+'._value';
		}
		if(node.getValueType() == VarType.DOUBLE) {
			return '('+this.getParamExpr(paramInfo)+'._value|0)';
		}
		return '(checkTypeNumber('+this.getParamExpr(paramInfo)+')._value|0)';
	},
	getStrictIntParamNativeValueExpr: function(paramInfo, defaultExpr) {
		if(_isDefault(paramInfo)) return _defaultExpr(defaultExpr);
		var node = paramInfo.node;
		if(node.isLiteralNode() && node.val.type == VarType.INT) {
			return '' + node.val._value;
		}
		if(node.getValueType() == VarType.INT) {
			return this.getParamExpr(paramInfo)+'._value';
		}
		return 'checkTypeInt('+this.getParamExpr(paramInfo)+')._value';
	},
	getDoubleParamNativeValueExpr: function(paramInfo, defaultExpr) {
		if(_isDefault(paramInfo)) return _defaultExpr(defaultExpr);
		var node = paramInfo.node;
		var type = node.getValueType();
		if(node.isLiteralNode() && (type == VarType.INT || type == VarType.DOUBLE)) {
			return Utils.numToSource(node.val._value);
		}
		if(type == VarType.INT || type == VarType.DOUBLE) {
			return this.getParamExpr(paramInfo)+'._value';
		}
		return 'checkTypeNumber('+this.getParamExpr(paramInfo)+')._value';
	},
	getStrParamNativeValueExpr: function(paramInfo, defaultExpr) {
		if(_isDefault(paramInfo)) return _defaultExpr(defaultExpr);
		var node = paramInfo.node;
		if(node.isLiteralNode() && node.getValueType() == VarType.STR) {
			return Utils.strToSource(node.val._value);
		}
		return this.getStrParamExpr(paramInfo)+'._value';
	},
	getLabelParamNativeValueExpr: function(paramInfo, defaultExpr) {
		if(_isDefault(paramInfo)) return _defaultExpr(defaultExpr);
		var node = paramInfo.node;
		if(node.isLabelNode()) {
			return '' + node.getLabelPos();
		}
		return 'checkTypeLabel('+this.getParamExpr(paramInfo)+').pos';
	},
	getIntConvertedParamExpr: function(paramInfo, defaultExpr) {
		if(_isDefault(paramInfo)) return _defaultExpr(defaultExpr);
		var node = paramInfo.node;
		if(node.isLiteralNode()) {
			try {
				return this.getParamExpr(new ParamInfo(new LiteralNode(node.val.toIntValue())));
			} catch(e) {
				if(!(e instanceof HSPError)) throw e;
			}
		}
		return this.getParamExpr(paramInfo)+'.toIntValue()';
	},
	getDoubleConvertedParamExpr: function(paramInfo, defaultExpr) {
		if(_isDefault(paramInfo)) return _defaultExpr(defaultExpr);
		var node = paramInfo.node;
		if(node.isLiteralNode()) {
			try {
				return this.getParamExpr(new ParamInfo(new LiteralNode(node.val.toDoubleValue())));
			} catch(e) {
				if(!(e instanceof HSPError)) throw e;
			}
		}
		return this.getParamExpr(paramInfo)+'.toDoubleValue()';
	},
	getStrConvertedParamExpr: function(paramInfo, defaultExpr) {
		if(_isDefault(paramInfo)) return _defaultExpr(defaultExpr);
		var node = paramInfo.node;
		if(node.isLiteralNode()) {
			try {
				return this.getParamExpr(new ParamInfo(new LiteralNode(node.val.toStrValue())));
			} catch(e) {
				if(!(e instanceof HSPError)) throw e;
			}
		}
		return this.getParamExpr(paramInfo)+'.toStrValue()';
	},
	getIntConvertedNativeValueParamExpr: function(paramInfo, defaultExpr) {
		if(_isDefault(paramInfo)) return _defaultExpr(defaultExpr);
		var node = paramInfo.node;
		if(node.isLiteralNode()) {
			try {
				return '' + node.val.toIntValue()._value;
			} catch(e) {
				if(!(e instanceof HSPError)) throw e;
			}
		}
		if(node.getValueType() == VarType.INT) {
			return this.getParamExpr(paramInfo)+'._value';
		}
		if(node.getValueType() == VarType.DOUBLE) {
			return '('+this.getParamExpr(paramInfo)+'._value|0)';
		}
		return this.getParamExpr(paramInfo)+'.toIntValue()._value';
	},
	getDoubleConvertedNativeValueParamExpr: function(paramInfo, defaultExpr) {
		if(_isDefault(paramInfo)) return _defaultExpr(defaultExpr);
		var node = paramInfo.node;
		if(node.isLiteralNode()) {
			try {
				return Utils.numToSource(node.val.toDoubleValue()._value);
			} catch(e) {
				if(!(e instanceof HSPError)) throw e;
			}
		}
		if(node.getValueType() == VarType.INT) {
			return this.getParamExpr(paramInfo)+'._value';
		}
		if(node.getValueType() == VarType.DOUBLE) {
			return this.getParamExpr(paramInfo)+'._value';
		}
		return this.getParamExpr(paramInfo)+'.toDoubleValue()._value';
	},
	getStrConvertedNativeValueParamExpr: function(paramInfo, defaultExpr) {
		if(_isDefault(paramInfo)) return _defaultExpr(defaultExpr);
		var node = paramInfo.node;
		if(node.isLiteralNode()) {
			try {
				return Utils.strToSource(node.val.toStrValue()._value);
			} catch(e) {
				if(!(e instanceof HSPError)) throw e;
			}
		}
		if(node.getValueType() == VarType.STR) {
			return this.getParamExpr(paramInfo)+'._value';
		}
		if(node.getValueType() == VarType.INT) {
			return '("" + '+this.getParamExpr(paramInfo)+'._value)';
		}
		return this.getParamExpr(paramInfo)+'.toStrValue()._value';
	},
	getParamIntLiteralValue: function(paramInfo) {
		if(!paramInfo) return null;
		var node = paramInfo.node;
		if(!node.isLiteralNode()) return null;
		var value = node.val;
		var type = value.type;
		if(type == VarType.INT || type == VarType.DOUBLE) {
			return value._value | 0;
		}
		return null;
	},
	getParamExpr: function(paramInfo) {
		if(!paramInfo) {
			return 'throwHSPError('+ErrorCode.NO_DEFAULT+')';
		}
		var result = this.getParamExpr0(paramInfo.node);
		return result;
	},
	getParamExpr0: function(node) {
		switch(node.nodeType) {
		case NodeType.VAR:
			if(node.indexNodes.length > 0) {
				throw new Error('must not happen');
			}
			if(node.varData.isVariableAgentVarData()) {
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
		case NodeType.INLINE_EXPR_BUILTIN_FUNCALL:
			var info = node.builtinFuncInfo;
			return this.pushBuiltinFuncInlineCode(info, node.paramInfos);
		case NodeType.GET_STACK:
			return 'stack.pop()';
		default:
			throw new Error('must not happen');
		}
	},
	pushBuiltinFuncInlineCode: function(builtinFuncInfo, paramInfos) {
		var len = paramInfos.length;
		var argsMax = builtinFuncInfo.argsMax;
		if(argsMax != null && argsMax < len) {
			this.push('throw new HSPError(ErrorCode.TOO_MANY_PARAMETERS);');
			return void 0;
		}
		paramInfos = paramInfos.concat();
		for(var i = len; i < argsMax; i++) {
			paramInfos[i] = null;
		}
		return builtinFuncInfo.func(this, paramInfos);
	},
	getNewVariableAgentExpr: function(varData) {
		if(varData.isVariableAgentVarData()) {
			return this.getVariableAgentExpr(varData);
		}
		return 'new VariableAgent0D('+this.getVariableExpr(varData)+')';
	},
	getVariableExpr: function(varData) {
		if(varData.isVariableAgentVarData()) {
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
	getRegisteredObjectExpr: function(object, tag) {
		var propname = this.registerPropName;
		var id;
		if(!tag) tag = object;
		if(propname in tag) {
			id = tag[propname];
		} else {
			var list = this.registeredObjects_;
			id = list.length;
			list[id] = object;
			this.registeredObjectTags_[id] = tag;
			tag[propname] = id;
		}
		return 'registeredObjects['+id+']';
	},
	removeRegisteredObjectsPropName: function() {
		var propname = this.registerPropName;
		var objects = this.registeredObjectTags_;
		for(var i = 0; i < objects.length; i ++) {
			delete objects[i][propname];
		}
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

