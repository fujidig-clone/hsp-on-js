var BuiltinFuncInfos = [];

(function(){
	for(var i = 0; i < 18; i ++) {
		BuiltinFuncInfos[i] = [];
	}
})();

function BuiltinFuncInfo() {
	this.func = null;
	this.isInlineExpr = false;
	this.receiveVarList = null;
	this.defaultReceiveVar = true;
	this.argsMax = null;
	this.returnValueType = null;
	this.compileTimeFunc = null;
}

BuiltinFuncInfo.prototype = {
	notReceiveVar: function(n) {
		if(this.receiveVarList && 0 <= n && n <= this.receiveVarList.length) {
			return !this.receiveVarList[n];
		}
		return !this.defaultReceiveVar;
	},
	reset: function() {
		BuiltinFuncInfo.call(this);
	}
};

function builtinFunc(name) {
	var typeAndSubid = BuiltinFuncNameToIdTable[name];
	if(!typeAndSubid) throw new Error("unknown builtin func name: `"+name+"'");
	var type = getTypeByTypeAndSubid(typeAndSubid);
	var subid = getSubidByTypeAndSubid(typeAndSubid);
	var infos = BuiltinFuncInfos[type];
	var info = infos[subid];
	if(info) return info;
	return infos[subid] = new BuiltinFuncInfo;
}

function defineInlineBuiltinFunc(name, receiveVarList, func) {
	var info = builtinFunc(name);
	info.reset();
	info.func = func;
	info.isExprCallback = returnFalse;
	info.receiveVarList = receiveVarList;
	info.argsMax = receiveVarList.length;
}

function defineInlineExprBuiltinFunc(name, receiveVarList, returnValueType, func) {
	var info = builtinFunc(name);
	info.reset();
	info.func = func;
	info.isInlineExpr = true;
	info.isExprCallback = returnTrue;
	info.receiveVarList = receiveVarList;
	info.argsMax = receiveVarList.length;
	info.returnValueType = returnValueType;
}

function defineCompileTimeBuiltinFunc(name, func) {
	var info = builtinFunc(name);
	info.compileTimeFunc = func;
}

function defineSysVar(name, returnValueType, expr) {
	defineInlineExprBuiltinFunc(name, [], returnValueType, function(){ return expr; });
}

defineInlineBuiltinFunc('wait', [false], function(g, paramInfos) {
	g.push('throw new WaitException('+g.getIntParamNativeValueExpr(paramInfos[0], 100)+' * 10);');
});

defineInlineBuiltinFunc('await', [false], function(g, paramInfos) {
	g.push('if(this.lastWaitTime) {');
	g.push('    throw new WaitException(this.lastWaitTime + '+g.getIntParamNativeValueExpr(paramInfos[0], 0)+' - new Date);');
	g.push('} else {');
	g.push('    throw new WaitException('+g.getIntParamNativeValueExpr(paramInfos[0], 0)+');');
	g.push('}');
});

defineInlineBuiltinFunc('dim', [true, false, false, false, false], function(g, paramInfos) {
	var variableExpr = g.getNoSubscriptVariableParamExpr(paramInfos[0]);
	var l0Expr = g.getIntParamNativeValueExpr(paramInfos[1], 0);
	var l1Expr = g.getIntParamNativeValueExpr(paramInfos[2], 0);
	var l2Expr = g.getIntParamNativeValueExpr(paramInfos[3], 0);
	var l3Expr = g.getIntParamNativeValueExpr(paramInfos[4], 0);
	g.push(variableExpr+'.dim('+VarType.INT+', '+l0Expr+', '+l1Expr+', '+l2Expr+', '+l3Expr+');');
});

defineInlineBuiltinFunc('sdim', [true, false, false, false, false, false], function(g, paramInfos) {
	var variableExpr = g.getNoSubscriptVariableParamExpr(paramInfos[0]);
	var strLenExpr = g.getIntParamNativeValueExpr(paramInfos[1], 64);
	var l0Expr = g.getIntParamNativeValueExpr(paramInfos[2], 0);
	var l1Expr = g.getIntParamNativeValueExpr(paramInfos[3], 0);
	var l2Expr = g.getIntParamNativeValueExpr(paramInfos[4], 0);
	var l3Expr = g.getIntParamNativeValueExpr(paramInfos[5], 0);
	g.push('('+variableExpr+'.value = new StrArray).strDim('+strLenExpr+', '+l0Expr+', '+l1Expr+', '+l2Expr+', '+l3Expr+');');
});

defineInlineBuiltinFunc('dimtype', [true, false, false, false, false, false], function(g, paramInfos) {
	var variableExpr = g.getNoSubscriptVariableParamExpr(paramInfos[0]);
	var typeExpr = g.getIntParamNativeValueExpr(paramInfos[1], 0);
	var l0Expr = g.getIntParamNativeValueExpr(paramInfos[2], 0);
	var l1Expr = g.getIntParamNativeValueExpr(paramInfos[3], 0);
	var l2Expr = g.getIntParamNativeValueExpr(paramInfos[4], 0);
	var l3Expr = g.getIntParamNativeValueExpr(paramInfos[5], 0);
	g.push(variableExpr+'.dim('+typeExpr+', '+l0Expr+', '+l1Expr+', '+l2Expr+', '+l3Expr+');');
});

defineInlineBuiltinFunc('dup', [true, true], function(g, paramInfos) {
	var destVarExpr = g.getNoSubscriptVariableParamExpr(paramInfos[0]);
	var srcVarAgentExpr = g.getVariableAgentParamExpr(paramInfos[1]);
	g.push(destVarExpr+'.value = '+srcVarAgentExpr+'.ref();');
});

defineInlineBuiltinFunc('end', [false], function(g, paramInfos) {
	g.push('throw new EndException('+g.getIntParamNativeValueExpr(paramInfos[0], 0)+');');
});

defineInlineBuiltinFunc('stop', [false], function(g, paramInfos) {
	g.push('throw new StopException;');
});

defineInlineBuiltinFunc('delmod', [true], function(g, paramInfos) {
	g.push('var agent = '+g.getVariableAgentParamExpr(paramInfos[0])+';');
	g.push('if(agent.getType() != '+VarType.STRUCT+') {');
	g.push('    throw new HSPError(ErrorCode.TYPE_MISMATCH);');
	g.push('}');
	g.push('agent.assign(StructValue.EMPTY);');
});

defineInlineBuiltinFunc('mref', [true, false], function(g, paramInfos) {
	g.push('var variable = '+g.getNoSubscriptVariableParamExpr(paramInfos[0])+';');
	g.push('switch('+g.getIntParamNativeValueExpr(paramInfos[1], 0)+') {');
	g.push('case 64:');
	g.push('    variable.value = this.stat;');
	g.push('    break;');
	g.push('case 65:');
	g.push('    variable.value = this.refstr;');
	g.push('    break;');
	g.push('default:');
	g.push('    throw new HSPError(ErrorCode.UNSUPPORTED_FUNCTION);');
	g.push('}');
});

defineSysVar('system', VarType.INT, 'new IntValue(0)');
defineSysVar('stat', VarType.INT, 'this.stat.at(0)');
defineSysVar('cnt', VarType.INT, 'new IntValue(this.cnt)');
defineSysVar('err', VarType.INT, 'new IntValue(this.err)');
defineSysVar('strsize', VarType.INT, 'new IntValue(this.strsize)');
defineSysVar('looplev', VarType.INT, 'new IntValue(this.looplev)');
defineSysVar('sublev', VarType.INT, 'new IntValue(this.frameStack.length)');
defineSysVar('iparam', VarType.INT, 'new IntValue(this.iparam)');
defineSysVar('wparam', VarType.INT, 'new IntValue(this.wparam)');
defineSysVar('lparam', VarType.INT, 'new IntValue(this.lparam)');
defineSysVar('refstr', VarType.STR, 'this.refstr.at(0)');
defineSysVar('refdval', VarType.DOUBLE, 'this.refdval.at(0)');

defineInlineBuiltinFunc('onerror', [false, false], function(g, paramInfos) {
	var jumpType = getJumpType(paramInfos[0]);
	if(jumpType == JumpType.GOSUB) {
		g.push('throw new HSPError(ErrorCode.UNSUPPORTED_FUNCTION);');
		return;
	}
	var paramInfo = paramInfos[1];
	if(!paramInfo) {
		g.push('throw new HSPError(ErrorCode.NO_DEFAULT);');
		return;
	}
	var node = paramInfo.node;
	var type = node.getValueType();
	if(type == VarType.INT || type == VarType.DOUBLE) {
		setEnabled();
		return;
	}
	if(type == VarType.LABEL) {
		setPos();
		return;
	}
	
	if(jumpType) {
		setPos();
	} else {
		g.push('var val = '+g.getParamExpr(paramInfo)+';');
		g.push('switch(val.getType()) {');
		g.push('case '+VarType.LABEL+':');
		setPos();
		g.push('break;');
		g.push('case '+VarType.DOUBLE+':');
		g.push('case '+VarType.INT+':');
		setEnabled();
		g.push('break;');
		g.push('default:');
		g.push('throw new HSPError(ErrorCode.TYPE_MISMATCH);');
		g.push('}');
	}
	
	function getJumpType(paramInfo) {
		var node = paramInfo.node;
		if(node.isLiteralNode() && (node.val == JumpType.GOTO || node.val == JumpType.GOSUB)) {
			return node.val;
		} else if(node.isDefaultNode()) {
			return null;
		} else {
			throw new Error('must not happen');
		}
	}
	function setPos() {
		g.push('this.onerrorEvent.pos = '+g.getLabelParamNativeValueExpr(paramInfo)+';');
		g.push('this.onerrorEvent.enabled = true;');
	}
	function setEnabled() {
		if(jumpType) {
			g.push('throw new HSPError(ErrorCode.LABEL_REQUIRED);');
		} else {
			g.push('this.onerrorEvent.enabled = '+g.getIntParamNativeValueExpr(paramInfo)+' != 0;');
		}
	}
});

defineInlineBuiltinFunc('exist', [false], function(g, paramInfos) {
	var successCallbackExpr = 'function(data) { this.strsize = data.length; }';
	var errorCallbackExpr = 'function() { this.strsize = -1; }';
	g.push('this.fileRead('+g.getStrParamNativeValueExpr(path)+', '+successCallbackExpr+', '+errorCallbackExpr+')');
});

defineInlineBuiltinFunc('bload', [false, true], function(g, paramInfos) {
	// FIXME 第三引数のサイズ、第四引数のオフセットに対応
	var funcExpr = g.getRegisteredObjectExpr(bload_internal);
	g.push(funcExpr+'(this, '+g.getStrParamNativeValueExpr(paramInfos[0])+', '+g.getVariableAgentParamExpr(paramInfos[1])+');');
});
function bload_internal(evaluator, path, v) {
	evaluator.fileRead(
		path,
		function(data) {
			var size = v.getByteSize();
			v.setbytes(0, CP932.encode(data).substr(0, size));
		},
		function() {
			throw new HSPError(ErrorCode.FILE_IO);
		});
}

function getArrayOrAgentExpr(g, paramInfo) {
	var node = paramInfo && paramInfo.node;
	if(paramInfo && node.isVarNode() && !node.varData.isVariableAgentVarData()) {
		return [g.getVariableExpr(node.varData)+'.value', true];
	} else {
		var expr = g.getVariableAgentParamExpr(paramInfo);
		return [expr, false];
	}
}

defineInlineBuiltinFunc('poke', [true, false, false], function(g, paramInfos) {
	var r = getArrayOrAgentExpr(g, paramInfos[0]);
	var arrayExpr = r[0];
	if(paramInfos[0].stackSize) {
		g.push('var agent = '+arrayExpr+';');
		arrayExpr = 'agent';
	}
	var arrayIndexArg = r[1] ? '0, ' : '';
	var valueParamInfo = paramInfos[2];
	var type = valueParamInfo ? valueParamInfo.node.getValueType() : 0;
	var offsetExpr = g.getIntParamNativeValueExpr(paramInfos[1]);
	if(type == VarType.INT) {
		g.push(arrayExpr+'.setbyte('+arrayIndexArg+offsetExpr+', '+g.getIntParamNativeValueExpr(valueParamInfo)+');');
		return;
	}
	if(paramInfos[1].stackSize) {
		g.push('var offset = '+offsetExpr+';');
		offsetExpr = 'offset';
	}
	if(type == VarType.STR) {
		g.push('var val = '+g.getStrParamNativeValueExpr(valueParamInfo)+';');
		g.push(arrayExpr+'.setbytes('+arrayIndexArg+offsetExpr+', val + "\\0");');
		g.push('this.strsize = val.length;');
		return;
	}
	g.push('var val = '+g.getParamExpr(valueParamInfo)+';');
	g.push('switch(val.getType()) {');
	g.push('case '+VarType.STR+':');
	g.push('    '+arrayExpr+'.setbytes('+arrayIndexArg+offsetExpr+', val._value + "\\0");');
	g.push('    this.strsize = val._value.length;');
	g.push('    break;');
	g.push('case '+VarType.INT+':');
	g.push('    '+arrayExpr+'.setbyte('+arrayIndexArg+offsetExpr+', val._value);');
	g.push('    break;');
	g.push('default:');
	g.push('    throw new HSPError(ErrorCode.TYPE_MISMATCH);');
	g.push('}');
});

defineInlineBuiltinFunc('wpoke', [true, false, false], function(g, paramInfos) {
	var r = getArrayOrAgentExpr(g, paramInfos[0]);
	var arrayExpr = g.toSimpleExpr(r[0], r[1] ? 'array' : 'agent');
	var arrayIndexArg = r[1] ? '0, ' : '';
	var offsetExpr = g.toSimpleExpr(g.getIntParamNativeValueExpr(paramInfos[1], 0), 'offset');
	var valExpr = g.toSimpleExpr(g.getIntParamNativeValueExpr(paramInfos[2], 0), 'val');
	g.push(arrayExpr+'.setbyte('+arrayIndexArg+offsetExpr+', '+valExpr+');');
	g.push(arrayExpr+'.setbyte('+arrayIndexArg+offsetExpr+' + 1, '+valExpr+' >> 8);');
});

defineInlineBuiltinFunc('lpoke', [true, false, false], function(g, paramInfos) {
	var r = getArrayOrAgentExpr(g, paramInfos[0]);
	var arrayExpr = g.toSimpleExpr(r[0], r[1] ? 'array' : 'agent');
	var arrayIndexArg = r[1] ? '0, ' : '';
	var offsetExpr = g.toSimpleExpr(g.getIntParamNativeValueExpr(paramInfos[1], 0), 'offset');
	var valExpr = g.toSimpleExpr(g.getIntParamNativeValueExpr(paramInfos[2], 0), 'val');
	g.push(arrayExpr+'.setbyte('+arrayIndexArg+offsetExpr+', '+valExpr+');');
	g.push(arrayExpr+'.setbyte('+arrayIndexArg+offsetExpr+' + 1, '+valExpr+' >> 8);');
	g.push(arrayExpr+'.setbyte('+arrayIndexArg+offsetExpr+' + 2, '+valExpr+' >> 16);');
	g.push(arrayExpr+'.setbyte('+arrayIndexArg+offsetExpr+' + 3, '+valExpr+' >> 24);');
});

defineInlineBuiltinFunc('getstr', [true, false, false, false, false], function(g, paramInfos) {
	var destExpr = g.getVariableAgentParamExpr(paramInfos[0]);
	var srcExpr = g.getVariableAgentParamExpr(paramInfos[1]);
	var indexExpr = g.getIntParamNativeValueExpr(paramInfos[2], 0);
	var separatorExpr = g.getIntParamNativeValueExpr(paramInfos[3], 0)+' & 0xff';
	var lengthExpr = g.getIntParamNativeValueExpr(paramInfos[4], 1024);
	g.push(g.getRegisteredObjectExpr(getstr_internal)+'(this, '+destExpr+', '+srcExpr+', '+indexExpr+', '+separatorExpr+', '+lengthExpr+');');
});

function getstr_internal(evaluator, dest, src, index, separator, length) {
	var result = "";
	var i = 0;
	var c;
	while(i < length) {
		c = src.getbyte(index + i);
		if(c == 0) break;
		i ++;
		if(c == separator) {
			break;
		}
		if(c == 13) {
			if(src.getbyte(index + i) == 10) i ++;
			break;
		}
		result += String.fromCharCode(c);
		if((0x81 <= c && c <= 0x9F) || (0xE0 <= c && c <= 0xFC)) {
			if(i >= length) break;
			var c2 = src.getbyte(index + i);
			if(c2 == 0) break;
			result += String.fromCharCode(c2);
			i ++;
		}
	}
	dest.assign(new StrValue(result));
	evaluator.strsize = i;
	evaluator.stat.assign(0, new IntValue(c));
}

defineInlineBuiltinFunc('memexpand', [true, false], function(g, paramInfos) {
	g.push(g.getVariableAgentParamExpr(paramInfos[0])+'.expandByteSize('+g.getIntParamNativeValueExpr(paramInfos[1], 0)+');');
});

function toSimpleExprIfUsedStack(g, varName, paramInfo, expr) {
	if(paramInfo && paramInfo.stackSize) {
		return g.toSimpleExpr(expr, varName);
	} else {
		return expr;
	}
}

defineInlineBuiltinFunc('memcpy', [true, true, false, false, false], function(g, paramInfos) {
	var destExpr       = g.getVariableAgentParamExpr (paramInfos[0]);
	var srcExpr        = g.getVariableAgentParamExpr (paramInfos[1]);
	var lengthExpr     = g.getIntParamNativeValueExpr(paramInfos[2], 0);
	var destOffsetExpr = g.getIntParamNativeValueExpr(paramInfos[3], 0);
	var srcOffsetExpr  = g.getIntParamNativeValueExpr(paramInfos[4], 0);
	g.push(g.getRegisteredObjectExpr(memcpy_internal)+'('+destExpr+', '+srcExpr+', '+lengthExpr+', '+destOffsetExpr+', '+srcOffsetExpr+');');
});

function memcpy_internal(dest, src, length, destOffset, srcOffset) {
	dest.setbytes(destOffset, src.getbytes(srcOffset, length));
}

defineInlineBuiltinFunc('memset', [true, false, false, false], function(g, paramInfos) {
	var agentExpr  = g.getVariableAgentParamExpr (paramInfos[0]);
	var valExpr    = g.getIntParamNativeValueExpr(paramInfos[1], 0) + ' & 0xff';
	var lengthExpr = g.getIntParamNativeValueExpr(paramInfos[2], 0);
	var offsetExpr = g.getIntParamNativeValueExpr(paramInfos[3], 0);
	g.push(g.getRegisteredObjectExpr(memset_internal)+'('+agentExpr+', '+valExpr+', '+lengthExpr+', '+offsetExpr+');');
});

function memset_internal(agent, val, length, offset) {
	agent.setbytes(offset, Utils.strTimes(String.fromCharCode(val), length));
}

defineInlineBuiltinFunc('notesel', [true], function(g, paramInfos) {
	g.push('var agent = '+g.getVariableAgentParamExpr(paramInfos[0])+';');
	g.push('if(agent.getType() != VarType.STR) {');
	g.push('    agent.assign(StrValue.EMPTY_STR);');
	g.push('}');
	g.push('this.selectNote(agent);');
});

defineInlineBuiltinFunc('noteadd', [false, false, false], function(g, paramInfos) {
	g.push(g.getRegisteredObjectExpr(noteadd_internal)+'(this.getNote(), '+g.getStrParamExpr(paramInfos[0])+', '+g.getIntParamNativeValueExpr(paramInfos[1], 0)+', '+g.getIntParamNativeValueExpr(paramInfos[1], 0)+' != 0);');
});

function noteadd_internal(note, line, lineNumber, overwrite) {
	var index = note.getValue().lineIndex(lineNumber);
	if(index == null) {
		if(lineNumber >= 0) return;
		var str = note.getValue()._value;
		index = str.length;
		if(index != 0) {
			var c = str.charCodeAt(index - 1);
			if(c != 0x0d && c != 0x0a) {
				note.assign(new StrValue(str + "\r\n"));
				index += 2;
			}
		}
	}
	if(!overwrite) {
		note.splice(index, 0, line._value + "\r\n");
		return;
	}
	var length = note.getValue().lineLength(index);
	note.splice(index, length, line._value);
}

defineInlineBuiltinFunc('notedel', [false], function(g, paramInfos) {
	g.push(g.getRegisteredObjectExpr(notedel_internal)+'(this.getNote(), '+g.getIntParamNativeValueExpr(paramInfos[0], 0)+');');
});

function notedel_internal(note, lineNumber) {
	var val = note.getValue();
	var index = val.lineIndex(lineNumber);
	if(index == null) return;
	var length = val.lineLengthIncludeCR(index);
	note.splice(index, length, '');
}

defineInlineBuiltinFunc('noteload', [false], function(g, paramInfos) {
	g.push(g.getRegisteredObjectExpr(noteload_internal)+'(this, '+g.getStrParamNativeValueExpr(paramInfos[0])+');');
});

function noteload_internal(evaluator, path) {
	var note = evaluator.getNote();
	evaluator.fileRead(
		path,
		function(data) {
			data = CP932.encode(data) + "\0";
			note.expandByteSize(data.length);
			note.setbytes(0, data);
		},
		function() {
			throw new HSPError(ErrorCode.FILE_IO);
		});
}

defineInlineBuiltinFunc('randomize', [false], function(g, paramInfos) {
	g.push('this.random.srand('+g.getIntParamNativeValueExpr(paramInfos[0], 'new Date()|0')+');');
});

defineInlineBuiltinFunc('noteunsel', [], function(g, paramInfos) {
	g.push('this.undoNote();');
});

defineInlineBuiltinFunc('noteget', [true, false], function(g, paramInfos) {
	g.push(g.getRegisteredObjectExpr(noteget_internal)+'(this.getNote().getValue(), '+g.getVariableAgentParamExpr(paramInfos[0])+', '+g.getIntParamNativeValueExpr(paramInfos[1])+');');
});

function noteget_internal(val, dest, lineNumber) {
	var str = val._value;
	var index = val.lineIndex(lineNumber);
	if(index == null) {
		dest.assign(StrValue.EMPTY_STR);
		return;
	}
	var length = val.lineLength(index);
	dest.assign(new StrValue(str.substr(index, length)));
}

defineInlineExprBuiltinFunc('int', [false], VarType.INT, function(g, paramInfos) {
	return g.getIntConvertedParamExpr(paramInfos[0]);
});

defineCompileTimeBuiltinFunc('int', function(val) {
	scanArgs(arguments, '.', 1);
	return val.toIntValue();
});

defineInlineExprBuiltinFunc('rnd', [false], VarType.INT, function(g, paramInfos) {
	var paramInfo = paramInfos[0];
	var value = g.getParamIntLiteralValue(paramInfo);
	if(value != null && value != 0) {
		return 'new IntValue(this.random.rand() % '+value+')';
	}
	return g.getRegisteredObjectExpr(rnd_internal)+'(this, '+g.getIntParamNativeValueExpr(paramInfos[0])+')';
});
function rnd_internal(evaluator, n) {
	if(n == 0) {
		throw new HSPError(ErrorCode.DIVIDED_BY_ZERO);
	}
	return new IntValue(evaluator.random.rand() % n);
}

defineInlineExprBuiltinFunc('strlen', [false], VarType.INT, function(g, paramInfos) {
	return 'new IntValue('+g.getStrParamNativeValueExpr(paramInfos[0])+'.length)';
});

defineCompileTimeBuiltinFunc('strlen', function(str) {
	scanArgs(arguments, 's', 1);
	return new IntValue(str._value.length);
});

defineInlineExprBuiltinFunc('length', [true], VarType.INT, function(g, paramInfos) {
	var variableExpr = g.getNoSubscriptVariableParamExpr(paramInfos[0]);
	return 'new IntValue('+variableExpr+'.getL0())';
});

defineInlineExprBuiltinFunc('length2', [true], VarType.INT, function(g, paramInfos) {
	var variableExpr = g.getNoSubscriptVariableParamExpr(paramInfos[0]);
	return 'new IntValue('+variableExpr+'.getL1())';
});

defineInlineExprBuiltinFunc('length3', [true], VarType.INT, function(g, paramInfos) {
	var variableExpr = g.getNoSubscriptVariableParamExpr(paramInfos[0]);
	return 'new IntValue('+variableExpr+'.getL2())';
});

defineInlineExprBuiltinFunc('length4', [true], VarType.INT, function(g, paramInfos) {
	var variableExpr = g.getNoSubscriptVariableParamExpr(paramInfos[0]);
	return 'new IntValue('+variableExpr+'.getL3())';
});

defineInlineExprBuiltinFunc('vartype', [true], VarType.INT, function(g, paramInfos) {
	if(paramInfos[0] && paramInfos[0].getPureNode().isVarNode()) {
		return 'new IntValue('+g.getVariableParamExpr(paramInfos[0])+'.getType())';
	} else {
		return g.getRegisteredObjectExpr(vartype_internal)+'('+g.getStrParamNativeValueExpr(paramInfos[0])+')';
	}
}); 
function vartype_internal(name) {
	for(var i = 0; i < VarTypeNames.length; i ++) {
		if(VarTypeNames[i] == name) {
			return new IntValue(i);
		}
	}
	throw new HSPError(ErrorCode.ILLEGAL_FUNCTION, '指定された名前の変数型は存在しません');
}

defineCompileTimeBuiltinFunc('vartype', function(name) {
	scanArgs(arguments, 's', 1);
	return vartype_internal(name._value);
});

(function() {
	var internalFunc = createInternalFunc();
	defineInlineExprBuiltinFunc('gettime', [false], VarType.INT, function(g, paramInfos) {
		if(ommitable(paramInfos[0])) {
			return getExpr(paramInfos[0].node.val._value, 'new Date()');
		} else {
			return g.getRegisteredObjectExpr(internalFunc)+'('+g.getIntParamNativeValueExpr(paramInfos[0])+')';
		}
	});

	function ommitable(paramInfo) {
		if(!paramInfo) return false;
		var node = paramInfo.node;
		if(!node.isLiteralNode()) return false;
		var val = node.val;
		return val.getType() == VarType.INT && -1 <= val._value && val._value <= 7;
	}
	function createInternalFunc() {
		var code = '';
		code += 'var IntValue = HSPonJS.IntValue;\n';
		code += 'return function(n) {\n';
		code += 'var date = new Date;\n';
		code += 'switch(n) {\n';
		for(var i = -1; i <= 7; i ++) {
			code += 'case '+i+':\n';
			code += '    return '+getExpr(i, 'date')+';\n';
		}
		code += 'default:\n';
		code += '    throw new HSPError(ErrorCode.ILLEGAL_FUNCTION);\n';
		code += '}\n'
		code += '};';
		return new Function(code)();
	}
	function getExpr(n, dateExpr) {
		switch(n) {
		case -1:
			return 'new IntValue('+dateExpr+' - this.startTime)';
		case 0:
			return 'new IntValue('+dateExpr+'.getFullYear())';
		case 1:
			return 'new IntValue('+dateExpr+'.getMonth() + 1)';
		case 2:
			return 'new IntValue('+dateExpr+'.getDay())';
		case 3:
			return 'new IntValue('+dateExpr+'.getDate())';
		case 4:
			return 'new IntValue('+dateExpr+'.getHours())';
		case 5:
			return 'new IntValue('+dateExpr+'.getMinutes())';
		case 6:
			return 'new IntValue('+dateExpr+'.getSeconds())';
		case 7:
			return 'new IntValue('+dateExpr+'.getMilliseconds())';
		default:
			throw new Error('must not happen');
		}
	}
})();

defineInlineExprBuiltinFunc('peek', [true, false], VarType.INT, function(g, paramInfos) {
	return g.getRegisteredObjectExpr(peek_internal)+'('+g.getVariableAgentParamExpr(paramInfos[0])+', '+g.getIntParamNativeValueExpr(paramInfos[1], 0)+')';
});

function peek_internal(v, n) {
	if(n < 0) {
		throw new HSPError(ErrorCode.ILLEGAL_FUNCTION);
	}
	return new IntValue(v.getbyte(n));
}

defineInlineExprBuiltinFunc('wpeek', [true, false], VarType.INT, function(g, paramInfos) {
	return g.getRegisteredObjectExpr(wpeek_internal)+'('+g.getVariableAgentParamExpr(paramInfos[0])+', '+g.getIntParamNativeValueExpr(paramInfos[1], 0)+')';
});

function wpeek_internal(v, n) {
	if(n < 0) {
		throw new HSPError(ErrorCode.ILLEGAL_FUNCTION);
	}
	return new IntValue(v.getbyte(n) | v.getbyte(n + 1) << 8);
}

defineInlineExprBuiltinFunc('lpeek', [true, false], VarType.INT, function(g, paramInfos) {
	return g.getRegisteredObjectExpr(lpeek_internal)+'('+g.getVariableAgentParamExpr(paramInfos[0])+', '+g.getIntParamNativeValueExpr(paramInfos[1], 0)+')';
});

function lpeek_internal(v, n) {
	if(n < 0) {
		throw new HSPError(ErrorCode.ILLEGAL_FUNCTION);
	}
	return new IntValue(v.getbyte(n) | v.getbyte(n + 1) << 8 | v.getbyte(n + 2) << 16 | v.getbyte(n + 3) << 24);
}

defineInlineExprBuiltinFunc('varuse', [false], VarType.INT, function(g, paramInfos) {
	return g.getRegisteredObjectExpr(varuse_internal)+'('+g.getParamExpr(paramInfos[0])+')';
});

function varuse_internal(v) {
	var using = v.isUsing();
	if(using == null) {
		throw new HSPError(ErrorCode.TYPE_MISMATCH, VarTypeNames[v.getType()] + ' 型は varuse をサポートしていません');
	}
	return new IntValue(using);
}

defineInlineExprBuiltinFunc('noteinfo', [false], VarType.INT, function(g, paramInfos) {
	return g.getRegisteredObjectExpr(noteinfo_internal)+'('+g.getIntParamNativeValueExpr(paramInfos[0])+')';
});

function noteinfo_internal(evaluator, n) {
	switch(n) {
	case 0: // notemax
		var lines = this.getNote().getValue()._value.split(/\r\n|[\r\n]/);
		var len = lines.length;
		if(!lines[len-1]) len --;
		return new IntValue(len);
	case 1: // notesize
		return new IntValue(this.getNote().getValue()._value.length);
	default:
		throw new HSPError(ErrorCode.ILLEGAL_FUNCTION);
	}
}

defineInlineExprBuiltinFunc('instr', [false, false, false], VarType.INT, function(g, paramInfos) {
	return g.getRegisteredObjectExpr(instr_internal)+'('+g.getStrParamExpr(paramInfos[0])+', '+g.getIntParamNativeValueExpr(paramInfos[1], 0)+', '+g.getStrParamNativeValueExpr(paramInfos[2])+')';
});

function instr_internal(str, fromIndex, pattern) {
	var index = str.toStrValue().indexOf(pattern, fromIndex);
	if(index >= 0) index -= fromIndex;
	return new IntValue(index);
}

defineInlineExprBuiltinFunc('abs', [false], VarType.INT, function(g, paramInfos) {
	return 'new IntValue(Math.abs('+g.getIntParamNativeValueExpr(paramInfos[0])+'))';
});

defineInlineExprBuiltinFunc('limit', [false, false, false], VarType.INT, function(g, paramInfos) {
	return 'new IntValue('+g.getRegisteredObjectExpr(limit_internal)+'('+g.getIntParamNativeValueExpr(paramInfos[0])+', '+g.getIntParamNativeValueExpr(paramInfos[1])+', '+g.getIntParamNativeValueExpr(paramInfos[2])+'))';
});

function limit_internal(val, min, max) {
	if(val > max) {
		return max;
	}
	if(val < min) {
		return min;
	}
	return val;
}

defineInlineExprBuiltinFunc('str', [false], VarType.STR, function(g, paramInfos) {
	return g.getStrConvertedParamExpr(paramInfos[0]);
});

defineCompileTimeBuiltinFunc('str', function(val) {
	scanArgs(arguments, '.', 1);
	return val.toStrValue();
});

defineInlineExprBuiltinFunc('strmid', [false, false, false], VarType.STR, function(g, paramInfos) {
	return g.getRegisteredObjectExpr(strmid_internal)+'('+g.getStrParamNativeValueExpr(paramInfos[0])+', '+g.getIntParamNativeValueExpr(paramInfos[1])+', '+g.getIntParamNativeValueExpr(paramInfos[2])+')';
});

function strmid_internal(str, index, length) {
	if(index < 0) {
		index = str.length - length;
		if(index < 0) index = 0;
	}
	return new StrValue(str.substr(index, length));
}

defineInlineExprBuiltinFunc('strf', [], VarType.STR, function(g, paramInfos) {
	var args = '';
	for(var i = 1; i < paramInfos.length; i ++) {
		if (i != 1) args += ',';
		args += g.getParamExpr(paramInfos[i]);
	}
	return 'new StrValue(Formatter.sprintf('+g.getStrParamNativeValueExpr(paramInfos[0])+', ['+args+']))';
});
builtinFunc('strf').argsMax = null;
builtinFunc('strf').defaultReceiveVar = false;

defineInlineExprBuiltinFunc('getpath', [false], VarType.STR, function(g, paramInfos) {
	return g.getRegisteredObjectExpr(getpath_internal)+'('+g.getStrParamNativeValueExpr(paramInfos[0])+', '+g.getIntParamNativeValueExpr(paramInfos[1])+')';
});

function getpath_internal(path, flags) {
	if(flags & 16) {
		var re = /((?:[\x81-\x9f\xe0-\xfc][\s\S]|[^A-Z])*)([A-Z]*)/g;
		path = path.replace(re, function(s,a,b) {
			return a + b.toLowerCase();
		});
	}
	var dir = /^(?:\w:)?(?:(?:[^\x81-\x9f\xe0-\xfc]|[\x81-\x9f\xe0-\xfc][\s\S])*[\/\\])?/.exec(path)[0];
	var ext = /(?:\.[^.\/\\]*)?$/.exec(path)[0];
	var basename = path.slice(dir.length, path.length - ext.length);
	if(flags & 8) {
		path = basename + ext;
	} else if(flags & 32) {
		path = dir;
	}
	var result = path;
	switch(flags & 7) {
	case 1:
		result = path.slice(0, path.length - ext.length);
		break;
	case 2:
		result = ext;
		break;
	}
	return new StrValue(result);
}

defineInlineExprBuiltinFunc('sin', [false], VarType.DOUBLE, function(g, paramInfos) {
	return 'new DoubleValue(Math.sin('+g.getDoubleParamNativeValueExpr(paramInfos[0])+'))';
});

defineInlineExprBuiltinFunc('cos', [false], VarType.DOUBLE, function(g, paramInfos) {
	return 'new DoubleValue(Math.cos('+g.getDoubleParamNativeValueExpr(paramInfos[0])+'))';
});

defineInlineExprBuiltinFunc('tan', [false], VarType.DOUBLE, function(g, paramInfos) {
	return 'new DoubleValue(Math.tan('+g.getDoubleParamNativeValueExpr(paramInfos[0])+'))';
});

defineInlineExprBuiltinFunc('atan', [false, false], VarType.DOUBLE, function(g, paramInfos) {
	return 'new DoubleValue(Math.atan2('+g.getDoubleParamNativeValueExpr(paramInfos[0])+', '+g.getDoubleParamNativeValueExpr(paramInfos[1], 1)+'))';
});

defineInlineExprBuiltinFunc('sqrt', [false], VarType.DOUBLE, function(g, paramInfos) {
	return 'new DoubleValue(Math.sqrt('+g.getDoubleParamNativeValueExpr(paramInfos[0])+'))';
});

defineInlineExprBuiltinFunc('double', [false], VarType.DOUBLE, function(g, paramInfos) {
	return g.getDoubleConvertedParamExpr(paramInfos[0]);
});

defineCompileTimeBuiltinFunc('double', function(val) {
	scanArgs(arguments, '.', 1);
	return val.toDoubleValue();
});

defineInlineExprBuiltinFunc('absf', [false], VarType.DOUBLE, function(g, paramInfos) {
	return 'new DoubleValue(Math.abs('+g.getDoubleParamNativeValueExpr(paramInfos[0])+'))';
});

defineInlineExprBuiltinFunc('expf', [false], VarType.DOUBLE, function(g, paramInfos) {
	return 'new DoubleValue(Math.exp('+g.getDoubleParamNativeValueExpr(paramInfos[0])+'))';
});

defineInlineExprBuiltinFunc('logf', [false], VarType.DOUBLE, function(g, paramInfos) {
	return 'new DoubleValue(Math.log('+g.getDoubleParamNativeValueExpr(paramInfos[0])+'))';
});

defineInlineExprBuiltinFunc('limitf', [false, false, false], VarType.DOUBLE, function(g, paramInfos) {
	return 'new IntValue('+g.getRegisteredObjectExpr(limitf_internal)+'('+g.getDoubleParamNativeValueExpr(paramInfos[0])+', '+g.getDoubleParamNativeValueExpr(paramInfos[1])+', '+g.getDoubleParamNativeValueExpr(paramInfos[2])+'))';
});

function limitf_internal(val, min, max) {
	if(val > max) {
		return max;
	}
	if(val < min) {
		return min;
	}
	return val;
}

if(typeof HSPonJS != 'undefined') {
	HSPonJS.BuiltinFuncInfos = BuiltinFuncInfos;
	HSPonJS.BuiltinFuncInfo = BuiltinFuncInfo;
	HSPonJS.builtinFunc = builtinFunc;
	HSPonJS.defineInlineBuiltinFunc = defineInlineBuiltinFunc;
	HSPonJS.defineInlineExprBuiltinFunc = defineInlineExprBuiltinFunc;
	HSPonJS.defineCompileTimeBuiltinFunc = defineCompileTimeBuiltinFunc;
	HSPonJS.defineSysVar = defineSysVar;
}


