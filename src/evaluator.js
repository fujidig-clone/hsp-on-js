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
	errorAtUseOfUninitializedVariable: false
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

function throwHSPError(errorCode) {
	throw new HSPError(errorCode);
}

Evaluator.prototype = {
	evaluate: function evaluate() {
		this.mainLoop = this.createMainLoop();
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
		if(this.options.errorAtUseOfUninitializedVariable) {
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
	createMainLoop: function createMainLoop() {
		var src = '';
		for(var prop in HSPonJS) {
			src += 'var '+prop+' = HSPonJS.'+prop+';\n';
		}
		src += 'return function mainLoop(stack, literals, variables, userDefFuncs) {\n';
		src += this.createMainLoopSrc() + '\n};';
		return Function(src)();
	},
	createMainLoopSrc: function createMainLoopSrc() {
		function push(line) {
			lines.push(Utils.strTimes('\t', indent) + line);
		}
		function pushJumpingSubroutineCode() {
			push('if(this.frameStack.length >= 256) {');
			push('    throw new HSPError(ErrorCode.STACK_OVERFLOW);');
			push('}');
			push('this.frameStack.push(new Frame(this.pc + 1, null, this.args));');
		}
		function pushGettingArrayValueCode(varData, indexParamInfos) {
			var result = paramInfoGetExprBlock(indexParamInfos, function() {
				return getArrayAndOffsetExpr(varData, indexParamInfos);
			});
			var arrayExpr = result[0];
			var offsetExpr = result[1];
			push('stack.push('+arrayExpr+'.at('+offsetExpr+'));');
		}
		function pushGettingVariableCode(varData, indexParamInfos) {
			var result;
			paramInfoGetExprBlock(indexParamInfos, function() {
				if(isVariableAgentVarData(varData)) {
					result = getVariableAgentExpr(varData);
				} else {
					var variableExpr = getVariableExpr(varData);
					if(indexParamInfos.length == 0) {
						result = 'new VariableAgent0D('+variableExpr+')';
					} else if(indexParamInfos.length == 1) {
						var paramInfo = indexParamInfos[0];
						push('var offset = '+getStrictIntParamNativeValueExpr(paramInfo)+';');
						result = 'new VariableAgent1D('+variableExpr+', offset)';
					} else {
						pushGettingIndicesCode(indexParamInfos);
						result = 'new VariableAgentMD('+variableExpr+', indices)';
					}
				}
			});
			push('stack.push('+result+');');
		}
		function pushAssignCode(varData, indexParamInfos, rhsParamInfos) {
			paramInfoGetExprBlock(indexParamInfos, rhsParamInfos, function() {
				if(isVariableAgentVarData(varData)) {
					pushVariableAgentAssignCode(varData, rhsParamInfos);
				} else {
					push('var variable = '+getVariableExpr(varData)+';');
					if(indexParamInfos.length == 0) {
						push0DAssignCode(rhsParamInfos);
					} else if(indexParamInfos.length == 1) {
						push1DAssignCode(indexParamInfos[0], rhsParamInfos);
					} else {
						pushMDAssignCode(indexParamInfos, rhsParamInfos);
					}
				}
			});
		}
		function pushVariableAgentAssignCode(varData, paramInfos) {
			if(paramInfos.length == 1) {
				push(getVariableAgentExpr(varData)+'.assign('+getParamExpr(paramInfos[0])+');');
			} else {
				push('var agent = '+getVariableAgentExpr(varData)+';');
				push('var variable = agent.variable;');
				push('if(agent.indices) {');
				push('    var indices = agent.indices.slice();');
				for(var i = 0; i < paramInfos.length; i ++) {
					push('    variable.assign(indices, '+getParamExpr(paramInfos[i])+');');
					if(i != paramInfos.length - 1) {
						push('    indices[0] ++;');
					}
				}
				push('} else {'); indent ++;
				push('var offset = agent.offset;');
				push1DMultipleAssignCode(paramInfos);
				indent --; push('}');
			}
		}
		function push0DAssignCode(paramInfos) {
			if(paramInfos.length == 1) {
				push('var rhs = '+getParamExpr(paramInfos[0])+';');
				push('if(variable.value.getType() != rhs.getType()) {');
				push('    variable.reset(rhs.getType());');
				push('}');
				push('variable.value.assign(0, rhs);');
			} else {
				push('var rhs = '+getParamExpr(paramInfos[0])+';');
				push('var type = rhs.getType();');
				push('if(variable.value.getType() != type) {');
				push('    variable.reset(type);');
				push('}');
				push('var array = variable.value;');
				push('array.expand1D('+(paramInfos.length-1)+');');
				push('array.assign(0, rhs);');
				for(var i = 1; i < paramInfos.length; i ++) {
					push('var rhs = '+getParamExpr(paramInfos[i])+';');
					push('if(rhs.getType() != type) throw new HSPError(ErrorCode.INVALID_ARRAYSTORE);');
					push('array.assign('+i+', rhs);');
				}
			}
		}
		function push1DAssignCode(indexParamInfo, rhsParamInfos) {
			push('var offset = '+getStrictIntParamNativeValueExpr(indexParamInfo)+';');
			if(rhsParamInfos.length == 1) {
				push('var rhs = '+getParamExpr(rhsParamInfos[0])+';');
				push('if(variable.value.getType() != rhs.getType()) {');
				push('    if(offset == 0) {');
				push('        variable.reset(rhs.getType());');
				push('    } else {');
				push('        throw new HSPError(ErrorCode.INVALID_ARRAYSTORE);');
				push('    }');
				push('}');
				push('variable.value.expand1D(offset);');
				push('variable.value.assign(offset, rhs);');
			} else {
				push1DMultipleAssignCode(rhsParamInfos);
			}
		}
		function pushMDAssignCode(indexParamInfos, rhsParamInfos) {
			pushGettingIndicesCode(indexParamInfos);
			for(var i = 0; i < rhsParamInfos.length; i ++) {
				push('variable.assign(indices, '+getParamExpr(rhsParamInfos[i])+');');
				if(i != rhsParamInfos.length - 1) {
					push('indices[0] ++;');
				}
			}
		}
		function push1DMultipleAssignCode(paramInfos) {
			push('if(offset < 0) throw new HSPError(ErrorCode.ARRAY_OVERFLOW);');
			push('var rhs = '+getParamExpr(paramInfos[0])+';');
			push('var type = rhs.getType();');
			push('if(variable.value.getType() != type) {');
			push('    if(offset == 0) {');
			push('        variable.reset(type);');
			push('    } else {');
			push('        throw new HSPError(ErrorCode.INVALID_ARRAYSTORE);');
			push('    }');
			push('}');
			push('var array = variable.value;');
			push('array.expand1D(offset + '+(paramInfos.length-1)+');');
			push('array.assign(offset, rhs);');
			for(var i = 1; i < paramInfos.length; i ++) {
				push('var rhs = stack[len - '+getParamExpr(paramInfos[i])+'];');
				push('if(rhs.getType() != type) throw new HSPError(ErrorCode.INVALID_ARRAYSTORE);');
				push('array.assign(offset + '+i+', rhs);');
			}
		}
		function pushCompoundAssignCode0(calcCode, varData, indexParamInfos, rhsParamInfo) {
			if(isVariableAgentVarData(varData)) {
				push('var agent = '+getVariableAgentExpr(varData)+';');
				push('agent.assign(agent.'+getCalcCodeName(calcCode)+'('+getParamExpr(rhsParamInfo)+'));');
				return;
			}
			if(!isCompareCalcCode(calcCode)) {
				push('var array = '+getVariableExpr(varData)+'.value;');
				if(indexParamInfos.length == 0) {
					push('array.assign(0, array.at(0).'+getCalcCodeName(calcCode)+'('+getParamExpr(rhsParamInfo)+'));');
				} else if(indexParamInfos.length == 1) {
					push('var offset = '+getStrictIntParamNativeValueExpr(indexParamInfos[0])+';');
					push('array.expand1D(offset);');
					push('array.assign(offset, array.at(offset).'+getCalcCodeName(calcCode)+'('+getParamExpr(rhsParamInfo)+'));');
				} else {
					pushGettingIndicesCode(indexParamInfos);
					push('array.expand(indices);');
					push('var offset = array.getOffset(indices);');
					push('array.assign(offset, array.at(offset).'+getCalcCodeName(calcCode)+'('+getParamExpr(rhsParamInfo)+'));');
				}
				return;
			} 
			push('var variable = '+getVariableExpr(varData)+';');
			push('var array = variable.value;');
			if(indexParamInfos.length == 0) {
				push('if(array.getType() != '+VarType.INT+') {');
				push('    variable.reset('+VarType.INT+');');
				push('}');
				push('array.assign(0, array.at(0).'+getCalcCodeName(calcCode)+'('+getParamExpr(rhsParamInfo)+'));');
			} else if(indexParamInfos.length == 1) {
				push('var offset = '+getStrictIntParamNativeValueExpr(indexParamInfos[0])+';');
				push('if(array.getType() != '+VarType.INT+') {');
				push('    if(offset == 0) {');
				push('        variable.reset('+VarType.INT+');');
				push('        array = variable.value;');
				push('    } else {');
				push('        throw new HSPError(ErrorCode.INVALID_ARRAYSTORE);');
				push('    }');
				push('}');
				push('array.expand1D(offset);');
				push('array.assign(offset, array.at(offset).'+getCalcCodeName(calcCode)+'('+getParamExpr(rhsParamInfo)+'));');
			} else {
				pushGettingIndicesCode(indexParamInfos);
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
				push('array.assign(offset, array.at(offset).'+getCalcCodeName(calcCode)+'('+getParamExpr(rhsParamInfo)+'));');
			}
		}
		function pushCompoundAssignCode(calcCode, varData, indexParamInfos, rhsParamInfo) {
			paramInfoGetExprBlock(indexParamInfos, rhsParamInfo, function() {
				pushCompoundAssignCode0(calcCode, varData, indexParamInfos, rhsParamInfo);
			});
		}
		function pushIncDecCode(methodName, varData, indexParamInfos) {
			if(isVariableAgentVarData(varData)) {
				push('var agent = '+getVariableAgentExpr(varData)+';');
				push('agent.expand();');
				push('agent.'+methodName+'();');
				return;
			}
			paramInfoGetExprBlock(indexParamInfos, function() {
				push('var array = '+getVariableExpr(varData)+'.value;');
				if(indexParamInfos.length == 0) {
					push('array.'+methodName+'(0);');
				} else if(indexParamInfos.length == 1) {
					push('var offset = '+getStrictIntParamNativeValueExpr(indexParamInfos[0])+';');
					push('array.expand1D(offset);');
					push('array.'+methodName+'(offset);');
				} else {
					pushGettingIndicesCode(indexParamInfos);
					push('array.expand(indices);');
					push('var offset = array.getOffset(indices);');
					push('array.'+methodName+'(offset);');
				}
			});
		}
		function pushIncCode(varData, indexParamInfos) {
			pushIncDecCode('inc', varData, indexParamInfos);
		}
		function pushDecCode(varData, indexParamInfos) {
			pushIncDecCode('dec', varData, indexParamInfos);
		}
		function pushCallingUserdefFuncCode(userDefFunc, paramInfos, pc, constructorThismodExpr) {
			if(!userDefFuncs[userDefFunc.id]) {
				userDefFuncs[userDefFunc.id] = userDefFunc;
			}
			var paramMax = paramInfos.length;
			var mptypes = userDefFunc.paramTypes;
			var argMax = mptypes.length;
			var recvArgMax = 0; // local を除いた仮引数の数
			for(var i = 0; i < argMax; i ++) {
				var mptype = mptypes[i];
				var paramInfo = paramInfos[recvArgMax];
				if(mptype == MPType.LOCALVAR || mptype == MPType.IMODULEVAR) continue;
				if(mptype == MPType.ARRAYVAR && paramInfo &&
				   !paramInfo.node.toPureNode().isVarNode()) {
					push('throw new HSPError(ErrorCode.VARIABLE_REQUIRED);');
					return;
				} else if((!paramInfo || paramInfo.node.isDefaultNode()) && mptype != MPType.INUM) {
					push('throw new HSPError(ErrorCode.NO_DEFAULT);');
					return;
				}
				recvArgMax ++;
			}
			if(recvArgMax < paramMax) {
				push('throw new HSPError(ErrorCode.TOO_MANY_PARAMETERS);');
				return;
			}
			push('var args = [];');
			paramInfoGetExprBlock(paramInfos, function() {
				pushCallingUserdefFuncCode0(mptypes, paramInfos, constructorThismodExpr);
			});
			push('if(this.frameStack.length >= 256) {');
			push('    throw new HSPError(ErrorCode.STACK_OVERFLOW);');
			push('}');
			push('this.frameStack.push(new Frame('+(pc + 1)+', userDefFuncs['+userDefFunc.id+'], args, this.args));');
			push('this.args = args;');
			push('this.pc = '+userDefFunc.label.pos+';');
		}
		function pushCallingUserdefFuncCode0(mptypes, paramInfos, constructorThismodExpr) {
			var argMax = mptypes.length;
			var origArgsCount = 0;
			for(var i = 0; i < argMax; i ++) {
				var mptype = mptypes[i];
				var paramInfo = paramInfos[origArgsCount];
				switch(mptype) {
				case MPType.DNUM:
					push('args['+i+'] = '+getDoubleParamExpr(paramInfo)+';');
					break;
				case MPType.INUM:
					if(!paramInfo || paramInfo.node.isDefaultNode()) {
						push('args['+i+'] = IntValue.of(0);');
					} else {
						push('args['+i+'] = '+getIntParamExpr(paramInfo)+';');
					}
					break;
				case MPType.LOCALVAR:
					push('args['+i+'] = new Variable;');
					continue;
				case MPType.ARRAYVAR:
					var node = paramInfo.node;
					if(node.isVarNode()) {
						push('args['+i+'] = '+getVariableExpr(node.varData)+';');
					} else {
						push('var arg = '+getParamExpr(paramInfo)+';');
						push('arg.expand();');
						push('args['+i+'] = arg.variable;');
					}
					break;
				case MPType.SINGLEVAR:
				case MPType.MODULEVAR:
					var node = paramInfo.node;
					if(node.isVarNode()) {
						push('args['+i+'] = '+getNewVariableAgentExpr(node.varData)+';');
					} else if(node.isGetStackNode() && node.originalNode.isVarNode()) {
						push('var arg = '+getParamExpr(paramInfo)+';');
						push('arg.expand();');
						push('args['+i+'] = arg;');
					} else {
						push('var arg = new VariableAgent0D(new Variable);');
						push('arg.assign('+getParamExpr(paramInfo)+');');
						push('args['+i+'] = arg;');
					}
					break;
				case MPType.LOCALSTRING:
					push('args['+i+'] = '+getStrParamExpr(paramInfo)+';');
					break;
				case MPType.IMODULEVAR:
					push('args['+i+'] = '+constructorThismodExpr+';');
					continue;
				default:
					throw new Error('未対応のパラメータタイプ: '+mptype);
				}
				origArgsCount ++;
			}
		}
		function pushGettingIndicesCode(indexParamInfos) {
			push('var indices = [];');
			for(var i = 0; i < indexParamInfos.length; i ++) {
				push('indices['+i+'] = '+getStrictIntParamNativeValueExpr(indexParamInfos[i])+';');
			}
		}
		function getVariableExpr(varData) {
			if(isVariableAgentVarData(varData)) {
				return getVariableAgentExpr(varData)+'.variable';
			}
			var type = varData.proxyVarType;
			var id = varData.id;
			switch(type) {
			case ProxyVarType.STATIC:
				return 'variables['+id+']';
			case ProxyVarType.MEMBER:
				return 'this.getThismod().toValue().members['+id+']';
			case ProxyVarType.ARG_ARRAY:
			case ProxyVarType.ARG_LOCAL:
				return 'this.getArg('+id+')';
			default:
				throw new Error('must not happen');
			}
		}
		function isVariableAgentVarData(varData) {
			var type = varData.proxyVarType;
			return type == ProxyVarType.THISMOD || type == ProxyVarType.ARG_VAR;
		}
		function getNewVariableAgentExpr(varData) {
			if(isVariableAgentVarData(varData)) {
				return getVariableAgentExpr(varData);
			}
			return 'new VariableAgent0D('+getVariableExpr(varData)+')';
		}
		function getVariableAgentExpr(varData) {
			switch(varData.proxyVarType) {
			case ProxyVarType.THISMOD:
				return 'this.getThismod()';
			case ProxyVarType.ARG_VAR:
				return 'this.getArg('+varData.id+')';
			default:
				throw new Error('must not happen');
			}
		}
		function getArrayAndOffsetExpr(varData, indexParamInfos) {
			if(isVariableAgentVarData(varData)) {
				push('var agent = '+getVariableAgentExpr(varData)+';');
				return ['agent.variable.value', 'agent.getOffset()'];
			}
			var arrayExpr = getVariableExpr(varData)+'.value';
			var offsetExpr = 'offset';
			if(indexParamInfos.length == 0) {
				offsetExpr = '0';
			} else if(indexParamInfos.length == 1) {
				var paramInfo = indexParamInfos[0];
				push('var array = '+arrayExpr+';');
				arrayExpr = 'array';
				push('var offset = '+getStrictIntParamNativeValueExpr(paramInfo)+';');
				push('if(!(0 <= offset && offset < array.getL0())) {');
				push('    throw new HSPError(ErrorCode.ARRAY_OVERFLOW);');
				push('}');
			} else {
				push('var array = '+arrayExpr+';');
				arrayExpr = 'array';
				pushGettingIndicesCode(indexNodes);
				push('var offset = array.getOffset(indices);');
				push('if(offset == null) throw new HSPError(ErrorCode.ARRAY_OVERFLOW);');
			}
			return [arrayExpr, offsetExpr];
		}
		function getLiteralExpr(literal) {
			literals.push(literal);
			return 'literals['+(literals.length - 1)+']';
		}
		function stackSizeSum(paramInfos) {
			var sum = 0;
			for(var i = 0; i < paramInfos.length; i ++) {
				sum += paramInfos[i].stackSize;
			}
			return sum;
		}
		function getParamExpr(paramInfo) {
			if(useStackPop == null) {
				throw new Error('getParamExpr without paramInfoGetExprBlock');
			}
			var result = getParamExpr0(paramInfo.node);
			stackPos -= paramInfo.stackSize;
			return result;
		}
		function getParamExpr0(node) {
			switch(node.nodeType) {
			case NodeType.VAR:
				if(node.indexNodes.length > 0) {
					throw new Error('must not happen');
				}
				return getVariableExpr(node.varData)+'.value.at(0)';
			case NodeType.ARG:
				return 'this.getArg('+node.id+')';
			case NodeType.LITERAL:
				return getLiteralExpr(node.val);
			case NodeType.DEFAULT:
				return 'throwHSPError('+ErrorCode.NO_DEFAULT+')';
			case NodeType.OPERATE:
				return '('+getParamExpr0(node.lhsNode)+').'+getCalcCodeName(node.calcCode)+'('+getParamExpr0(node.rhsNode)+')';
			case NodeType.GET_STACK:
				if(useStackPop) {
					return 'stack.pop()';
				}
				return 'stack[stack.length - '+(stackPos-node.offset)+']';
			default:
				throw new Error('must not happen');
			}
		}
		function getNoSubscriptVariableExpr(paramInfo) {
			var node = paramInfo.node;
			if(node.isGetStackNode()) {
				node = node.originalNode;
			}
			if(!node.isVarNode() || node.onlyValue) {
				push('throw new HSPError(ErrorCode.VARIABLE_REQUIRED);');
				return null;
			}
			if(node.indexNodes.length > 0) {
				push('throw new HSPError(ErrorCode.BAD_ARRAY_EXPRESSION);');
				return null;
			}
			var varData = node.varData;
			if(isVariableAgentVarData(varData)) {
				push('var agent = '+getVariableAgentExpr(varData)+';');
				push('if(agent.existSubscript) {')
				push('    throw new HSPError(ErrorCode.BAD_ARRAY_EXPRESSION);');
				push('}');
				return 'agent.variable';
			}
			return getVariableExpr(varData);
		}
		function getIntParamExpr(paramInfo) {
			var node = paramInfo.node;
			if(node.getValueType() == VarType.INT) {
				return getParamExpr(paramInfo);
			}
			if(node.isLiteralNode() && node.val.getType() == VarType.DOUBLE) {
				return getParamExpr(new ParamInfo(new LiteralNode(node.val.toIntValue())));
			}
			if(node.getValueType() == VarType.DOUBLE) {
				return getParamExpr(paramInfo)+'.toIntValue()';
			}
			return 'this.scanArg('+getParamExpr(paramInfo)+', "n").toIntValue()';
		}
		function getDoubleParamExpr(paramInfo) {
			var node = paramInfo.node;
			if(node.getValueType() == VarType.DOUBLE) {
				return getParamExpr(paramInfo);
			}
			if(node.isLiteralNode() && node.val.getType() == VarType.INT) {
				return getParamExpr(new ParamInfo(new LiteralNode(node.val.toDoubleValue())));
			}
			if(node.getValueType() == VarType.INT) {
				return getParamExpr(paramInfo)+'.toDoubleValue()';
			}
			return 'this.scanArg('+getParamExpr(paramInfo)+', "n").toDoubleValue()';
		}
		function getStrParamExpr(paramInfo) {
			var node = paramInfo.node;
			if(node.getValueType() == VarType.STR) {
				return getParamExpr(paramInfo);
			}
			return 'this.scanArg('+getParamExpr(paramInfo)+', "s").toStrValue()';
		}
		function getIntParamNativeValueExpr(paramInfo) {
			var node = paramInfo.node;
			if(node.isLiteralNode() && 
			   (node.val.getType() == VarType.INT || node.val.getType() == VarType.DOUBLE)) {
				return '' + node.val.toIntValue()._value;
			}
			if(node.getValueType() == VarType.INT) {
				return getParamExpr(paramInfo)+'._value';
			}
			if(node.getValueType() == VarType.DOUBLE) {
				return '('+getParamExpr(paramInfo)+'._value|0)';
			}
			return 'this.scanArg('+getParamExpr(paramInfo)+', "n").toIntValue()._value';
		}
		function getStrictIntParamNativeValueExpr(paramInfo) {
			var node = paramInfo.node;
			if(node.isLiteralNode() && node.val.getType() == VarType.INT) {
				return '' + node.val._value;
			}
			if(node.getValueType() == VarType.INT) {
				return getParamExpr(paramInfo)+'._value';
			}
			return 'this.scanArg('+getParamExpr(paramInfo)+', "i").toIntValue()._value';
		}
		function getLabelParamNativeValueExpr(paramInfo) {
			var node = paramInfo.node;
			if(node.isLiteralNode() && node.val.getType() == VarType.LABEL) {
				return '' + node.val.pos;
			}
			return 'this.scanArg('+getParamExpr(paramInfo)+', "l").toValue().pos';
		}
		function paramInfoGetExprBlock(/*paramInfo0, paramInfo1, ... paramInfoN, callback*/) {
			var callback = arguments[arguments.length - 1];
			var paramInfos = Array.prototype.slice.call(arguments, 0, -1);
			paramInfos = Array.prototype.concat.apply([], paramInfos); // flatten
			if(useStackPop != null) {
				throw new Error('paramInfoGetExprBlock nesting');
			}
			var sum = stackSizeSum(paramInfos);
			useStackPop = sum == 1;
			if(useStackPop) {
				sum = 0;
			}
			stackPos = sum;
			
			var result = callback();
			useStackPop = null;
			pushStackPopCode(sum);
			return result;
		}
		function pushStackPopCode(size) {
			if(size == 0) {
				// nothing
			} else if(size == 1) {
				push('-- stack.length;');
			} else {
				push('stack.length -= '+size+';');
			}
		}
		function toSimpleExpr(expr, defaultVarName) {
			if(/^(?:[$A-Za-z][$0-9A-Za-z]*|-?[0-9]+)$/.test(expr)) {
				// 単一の変数か整数リテラルならそのまま
				return expr;
			}
			push('var '+defaultVarName+' = '+expr+';');
			return defaultVarName;
		}
		var stackPos = 0;
		var literals = this.literals;
		var userDefFuncs = this.userDefFuncs;
		var lines = [];
		var indent = 0;
		var sequence = this.sequence;
		var useStackPop = null;
		
		push('for(;;) {'); indent ++;
		push('switch(this.pc) {');
		for(var pc = 0; pc < sequence.length; pc ++) {
			var insn = sequence[pc];
			push('case '+pc+':'); indent ++;
			switch(insn.code) {
			case Instruction.Code.NOP:
				break;
			case Instruction.Code.PUSH_VAR:
				var varData = insn.opts[0];
				var indexParamInfos = insn.opts[1];
				pushGettingVariableCode(varData, indexParamInfos);
				break;
			case Instruction.Code.GET_VAR:
				var varData = insn.opts[0];
				var indexParamInfos = insn.opts[1];
				pushGettingArrayValueCode(varData, indexParamInfos);
				break;
			case Instruction.Code.POP:
				push('stack.pop();');
				break;
			case Instruction.Code.POP_N:
				pushStackPopCode(insn.opts[0]);
				break;
			case Instruction.Code.DUP:
				push('stack.push(stack[stack.length-1]);');
				break;
			case Instruction.Code.GOTO:
				push('this.pc = '+insn.opts[0].pos+';');
				push('continue;');
				break;
			case Instruction.Code.IFNE:
			case Instruction.Code.IFEQ:
				var label = insn.opts[0];
				var paramInfo = insn.opts[1];
				var expr;
				paramInfoGetExprBlock(paramInfo, function() {
					var stackSize = stackPos;
					expr = getParamExpr(paramInfo)+'.toIntValue()._value';
					if(stackSize > 0) {
						push('var val = '+expr+';');
						expr = 'val';
					}
				});
				if(insn.code == Instruction.Code.IFEQ) {
					expr = '!' + expr;
				}
				push('if('+expr+') {');
				push('    this.pc = '+insn.opts[0].pos+';');
				push('    continue;');
				push('}');
				break;
			case Instruction.Code.ASSIGN:
				var varData = insn.opts[0];
				var indexParamInfos = insn.opts[1];
				var rhsParamInfos = insn.opts[2];
				pushAssignCode(varData, indexParamInfos, rhsParamInfos);
				break;
			case Instruction.Code.COMPOUND_ASSIGN:
				var calcCode = insn.opts[0];
				var varData = insn.opts[1];
				var indexParamInfos = insn.opts[2];
				var rhsParamInfo = insn.opts[3];
				pushCompoundAssignCode(calcCode, varData, indexParamInfos, rhsParamInfo);
				break;
			case Instruction.Code.INC:
				var varData = insn.opts[0];
				var indexParamInfos = insn.opts[1];
				pushIncCode(varData, indexParamInfos);
				break;
			case Instruction.Code.DEC:
				var varData = insn.opts[0];
				var indexParamInfos = insn.opts[1];
				pushDecCode(varData, indexParamInfos);
				break;
			case Instruction.Code.CALL_BUILTIN_CMD:
			case Instruction.Code.CALL_BUILTIN_FUNC:
				var type = insn.opts[0];
				var subid = insn.opts[1];
				var paramInfos = insn.opts[2];
				push('var func = BuiltinFuncs['+type+']['+subid+'];');
				push('if(!func) throw new HSPError(ErrorCode.UNSUPPORTED_FUNCTION);');
				push('var args = [];');
				paramInfoGetExprBlock(paramInfos, function() {
					for(var i = 0; i < paramInfos.length; i ++) {
						var paramInfo = paramInfos[i];
						var node = paramInfo.node;
						if(node.isDefaultNode()) {
							push('args['+i+'] = void 0;');
						} else if(node.isVarNode() && !node.onlyValue) {
							push('args['+i+'] = '+getNewVariableAgentExpr(node.varData)+';');
						} else {
							push('args['+i+'] = '+getParamExpr(paramInfo)+';');
						}
					}
				});
				if(insn.code == Instruction.Code.CALL_BUILTIN_FUNC) {
					push('stack.push(func.apply(this, args));');
				} else {
					push('func.apply(this, args);');
				}
				break;
			case Instruction.Code.CALL_USERDEF_CMD:
			case Instruction.Code.CALL_USERDEF_FUNC:
				var userDefFunc = insn.opts[0];
				var paramInfos = insn.opts[1];
				pushCallingUserdefFuncCode(userDefFunc, paramInfos, pc);
				push('continue;');
				break;
			case Instruction.Code.NEWMOD:
				var varParamInfo = insn.opts[0];
				var module = insn.opts[1];
				var paramInfos = insn.opts[2];
				var argc = insn.opts[3];
				if(!userDefFuncs[module.id]) {
					userDefFuncs[module.id] = module;
				}
				var moduleExpr = 'userDefFuncs['+module.id+']';
				var constructor = module.constructor;
				if(!constructor && argc > 0) {
					push('throw new HSPError(ErrorCode.TOO_MANY_PARAMETERS);')
					break;
				}
				var variableExpr = getNoSubscriptVariableExpr(varParamInfo);
				if(!variableExpr) break;
				push('var variable = '+variableExpr+';');
				push('if(variable.getType() != '+VarType.STRUCT+') {');
				push('    variable.value = new StructArray();');
				push('}');
				push('var array = variable.value;');
				push('var offset = array.newmod('+moduleExpr+');');
				if(constructor) {
					pushCallingUserdefFuncCode(constructor, paramInfos, pc, 'new VariableAgent1D(variable, offset)');
					push('continue;');
				}
				break;
			case Instruction.Code.RETURN:
				var paramInfo = insn.opts[0];
				push('if(this.frameStack.length == 0) {');
				push('    throw new HSPError(ErrorCode.RETURN_WITHOUT_GOSUB);');
				push('}');
				if(paramInfo) {
					paramInfoGetExprBlock(paramInfo, function() {
						push('var val = '+getParamExpr(paramInfo)+';');
					});
					push('var frame = this.frameStack.pop();');
					push('this.args = frame.prevArgs;');
					push('if(frame.userDefFunc && frame.userDefFunc.isCType) {');
					push('stack.push(val);');
					push('} else {'); indent ++;
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
					push('var frame = this.frameStack.pop();');
					push('this.args = frame.prevArgs;');
					push('if(frame.userDefFunc && frame.userDefFunc.isCType) {');
					push('    throw new HSPError(ErrorCode.NORETVAL);');
					push('}');
				}
				push('this.pc = frame.pc;');
				push('continue;');
				break;
			case Instruction.Code.REPEAT:
				var pos = insn.opts[0].pos;
				var paramInfos = insn.opts[1];
				push('if(this.loopStack.length >= 31) {');
				push('    throw new HSPError(ErrorCode.TOO_MANY_NEST);');
				push('}');
				paramInfoGetExprBlock(paramInfos, function() {
					if(paramInfos.length >= 1 && !paramInfos[0].node.isDefaultNode()) {
						push('var end = '+getIntParamNativeValueExpr(paramInfos[0])+';');
						push('if(end < 0) end = Infinity;');
					} else {
						push('var end = Infinity;');
					}
					if(paramInfos.length == 2) {
						push('var begin = '+getIntParamNativeValueExpr(paramInfos[1])+';');
					} else {
						push('var begin = 0;');
					}
				});
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
				var paramInfo = insn.opts[1];
				push('if(this.loopStack.length == 0) {');
				push('    throw new HSPError(ErrorCode.LOOP_WITHOUT_REPEAT);');
				push('}');
				push('var data = this.loopStack[this.loopStack.length - 1];');
				function pushContinueCode(newCntExpr) {
					push('if('+newCntExpr+' >= data.end) {');
					push('    this.loopStack.pop();');
					push('    this.pc = '+pos+';');
					push('} else {');
					push('    this.pc = data.pc;');
					push('}');
				}
				if(paramInfo) {
					paramInfoGetExprBlock(paramInfo, function() {
						pushContinueCode('(data.cnt = '+getIntParamNativeValueExpr(paramInfo)+')');
					});
				} else {
					pushContinueCode('++data.cnt');
				}
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
				var paramInfo = insn.opts[1];
				push('var array = '+getNoSubscriptVariableExpr(paramInfo)+'.value;');
				push('var data = this.loopStack[this.loopStack.length - 1];');
				push('if(data.cnt >= array.getL0()) {')
				push('    this.loopStack.pop();');
				push('    this.pc = '+pos+';');
				push('    continue;');
				push('}');
				push('if(array.at(data.cnt).isUsing() == false) {'); // label 型 や struct 型の empty を飛ばす
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
				pushJumpingSubroutineCode();
				push('this.pc = '+insn.opts[0].pos+';');
				push('continue;');
				break;
			case Instruction.Code.GOTO_EXPR:
			case Instruction.Code.GOSUB_EXPR:
				var paramInfo = insn.opts[0];
				if(insn.code == Instruction.Code.GOSUB_EXPR) {
					pushJumpingSubroutineCode();
				}
				paramInfoGetExprBlock(paramInfo, function() {
					push('this.pc = '+getLabelParamNativeValueExpr(paramInfo)+';');
				});
				push('continue;');
				break;
			case Instruction.Code.EXGOTO:
				var paramInfos = insn.opts[0];
				// TODO
				break;
			case Instruction.Code.ON:
				var indexParamInfo = insn.opts[0];
				var isGosub = insn.opts[1];
				var labelParamInfos = insn.opts[2];
				// TODO
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
				throw this.typeMismatchError(arg.getType(), VarType.INT);
			}
			break;
		case 'd':
			if(arg.getType() != VarType.DOUBLE) {
				throw this.typeMismatchError(arg.getType(), VarType.DOUBLE);
			}
			break;
		case 'n':
			if(arg.getType() != VarType.INT && arg.getType() != VarType.DOUBLE) {
				throw this.typeMismatchErrorIntOrDouble(arg.getType());
			}
			break;
		case 's':
			if(arg.getType() != VarType.STR) {
				throw this.typeMismatchError(arg.getType(), VarType.STR);
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
	},
	typeMismatchError: function typeMismatchError(actualType, expectedType) {
		return this.typeMismatchError0(actualType, VarTypeNames[expectedType]+' 型');
	},
	typeMismatchErrorIntOrDouble: function typeMismatchErrorIntOrDouble(actualType) {
		return this.typeMismatchError0(actualType, 'int 型か double 型');
	},
	typeMismatchError0: function typeMismatchError0(actualType, expected) {
		return new HSPError(ErrorCode.TYPE_MISMATCH, 'パラメータの型が違います。'+VarTypeNames[actualType]+' 型ではなく、'+expected+'の値を指定しなければいけません');
	}
};

if(typeof HSPonJS != 'undefined') {
	HSPonJS.Evaluator = Evaluator;
	HSPonJS.LoopData = LoopData;
	HSPonJS.Frame = Frame;
	HSPonJS.Event = Event;
	HSPonJS.throwHSPError = throwHSPError;
}


