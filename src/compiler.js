function Compiler(ax) {
	this.ax = ax;
	this.tokensPos = 0;
	this.labels = this.makeLabels();
	this.ifLabels = {};
	this.userDefFuncs = [];
	this.staticVarTags = this.makeStaticVarTags();
}

function CompileError(message, hspFileName, hspLineNumber) {
	this.message = message;
	this.hspFileName = hspFileName;
	this.hspLineNumber = hspLineNumber;
}
CompileError.prototype = new Error;
CompileError.prototype.name = 'CompileError';

function VariableData(proxyVarType, id) {
	this.proxyVarType = proxyVarType;
	this.id = id;
}

VariableData.prototype = {
	toString: function() {
		var type;
		var outputId = true;
		switch(this.proxyVarType) {
		case ProxyVarType.STATIC:
			type = 'static';
			break;
		case ProxyVarType.THISMOD:
			type = 'thismod';
			outputId = false;
			break;
		case ProxyVarType.MEMBER:
			type = 'member';
			break;
		case ProxyVarType.ARG_VAR:
			type = 'var arg';
			break;
		case ProxyVarType.ARG_ARRAY:
			type = 'array arg';
			break;
		case ProxyVarType.ARG_LOCAL:
			type = 'local arg';
			break;
		case ProxyVarType.ARG_NOTVAR:
			type = 'arg';
			break;
		default:
			type = this.proxyVarType;
		}
		return '<VariableData: '+type+(outputId?'#'+this.id:'')+'>';
	},
	isVariableAgentVarData: function() {
		var type = this.proxyVarType;
		return type == ProxyVarType.THISMOD || type == ProxyVarType.ARG_VAR;
	}
};

function StaticVariableTag(name) {
	this.name = name;
}

StaticVariableTag.prototype.toString = function() {
	return '<StaticVariableTag:'+this.name+'>';
};

var ProxyVarType = {
	STATIC: 0,
	THISMOD: 1,
	MEMBER: 2,
	ARG_VAR: 3,
	ARG_ARRAY: 4,
	ARG_LOCAL: 5,
	ARG_NOTVAR: 6
};

Compiler.prototype = {
	compile: function() {
		var sequence = new ISeq;
		while(this.tokensPos < this.ax.tokens.length) {
			var token = this.ax.tokens[this.tokensPos];
			if(!token.ex1) {
				throw this.error();
			}
			this.pushLabels(sequence, token.pos);
			this.compileStatement(sequence);
		}
		this.removeDeadCode(sequence);
		this.peepholeOptimize(sequence);
		this.defineInsnIndex(sequence);
		this.defineLabelPos(sequence);
		var result = this.sequenceToArray(sequence);
		this.deleteLink(sequence);
		return result;
	},
	pushLabels: function(sequence, pos) {
		var labelIDs = this.ax.labelsMap[pos];
		if(labelIDs) {
			for(var i = 0; i < labelIDs.length; i ++) {
				var labelID = labelIDs[i];
				sequence.push(this.labels[labelID]);
			}
		}
		var labels = this.ifLabels[pos];
		if(labels) {
			for(var i = 0; i < labels.length; i ++) {
				sequence.push(labels[i]);
			}
		}
		delete this.ifLabels[pos];
	},
	makeLabels: function() {
		var len = this.ax.labels.length;
		var labels = [];
		for(var i = 0; i < len; i ++) {
			labels[i] = new Label;
		}
		return labels;
	},
	makeStaticVarTags: function() {
		var tags = [];
		var len = this.ax.max_val;
		var varNames = this.ax.variableNames;
		for(var i = 0; i < len; i ++) {
			tags[i] = new StaticVariableTag(varNames[i]);
		}
		return tags;
	},
	defineInsnIndex: function(sequence) {
		var index = 0;
		sequence.forEachOnlyInsn(function(insn) {
			insn.index = index++;
		});
	},
	defineLabelPos: function(sequence) {
		sequence.forEach(function(elem) {
			if(elem.type != ISeqElem.Type.LABEL) return;
			elem.definePos();
		});
	},
	sequenceToArray: function(sequence) {
		var result = [];
		sequence.forEachOnlyInsn(function(insn) {
			result.push(insn);
		});
		return result;
	},
	deleteLink: function(sequence) {
		var elem = sequence.first();
		while(elem) {
			var next = elem.next;
			elem.next = elem.prev = null;
			elem = next;
		}
		ISeq.link(sequence.firstGuard, sequence.lastGuard);
	},
	removeDeadCode: function(sequence) {
		sequence.forEachOnlyInsn(function(insn) {
			insn.alive = false;
		});
		var insns = [sequence.firstInsn()];
		while(insns.length) {
			var insn = insns.pop();
			while(insn) {
				if(insn.alive) break;
				insn.alive = true;
				var code = insn.code;
				var opts = insn.opts;
				if(code == Insn.Code.GOTO || code == Insn.Code.CONTINUE || code == Insn.Code.BREAK) {
					insn = insn.opts[0].getInsn();
					continue;
				}
				if(code == Insn.Code.CALL_BUILTIN_CMD &&
				   opts[0] == Token.Type.PROGCMD &&
				   (opts[1] == 0x10 ||  // end
				    opts[1] == 0x11)) { // stop
					break;
				}
				this.markInsnOpts(insns, code, opts);
				if(code == Insn.Code.GOTO_EXPR || code == Insn.Code.RETURN) {
					break;
				}
				insn = insn.getNextInsn();
			}
		}
		sequence.forEachOnlyInsn(function(insn) {
			if(!insn.alive) {
				insn.remove();
			}
		});
	},
	markInsnOpts: function(insns, code, opts) {
		switch(code) {
		case Insn.Code.NOP:
			break;
		case Insn.Code.PUSH_VAR:
		case Insn.Code.GET_VAR:
			this.markParamInfos(insns, opts[1]);
			break;
		case Insn.Code.POP:
		case Insn.Code.POP_N:
		case Insn.Code.DUP:
			break;
		case Insn.Code.IFNE:
		case Insn.Code.IFEQ:
			this.markLabel(insns, opts[0]);
			this.markParamInfo(insns, opts[1]);
			break;
		case Insn.Code.ASSIGN:
			this.markParamInfos(insns, opts[1]);
			this.markParamInfos(insns, opts[2]);
			break;
		case Insn.Code.COMPOUND_ASSIGN:
			this.markParamInfos(insns, opts[2]);
			this.markParamInfo(insns, opts[3]);
			break;
		case Insn.Code.INC:
		case Insn.Code.DEC:
			this.markParamInfos(insns, opts[1]);
			break;
		case Insn.Code.CALL_BUILTIN_CMD:
		case Insn.Code.CALL_BUILTIN_FUNC:
			this.markParamInfos(insns, opts[2]);
			break;
		case Insn.Code.CALL_USERDEF_CMD:
		case Insn.Code.CALL_USERDEF_FUNC:
			this.markLabel(insns, opts[0].label);
			this.markParamInfos(insns, opts[1]);
			break;
		case Insn.Code.NEWMOD:
			this.markParamInfo(insns, opts[0]);
			this.markModule(insns, opts[1]);
			if(opts[2]) {
				this.markParamInfos(insns, opts[2]);
			}
			break;
		case Insn.Code.RETURN:
			if(opts[0]) {
				this.markParamInfo(insns, opts[0]);
			}
			break;
		case Insn.Code.REPEAT:
			this.markLabel(insns, opts[0]);
			this.markParamInfos(insns, opts[1]);
			break;
		case Insn.Code.LOOP:
			break;
		case Insn.Code.CONTINUE:
			this.markLabel(insns, opts[0]);
			if(opts[1]) {
				this.markParamInfo(insns, opts[1]);
			}
			break;
		case Insn.Code.BREAK:
			this.markLabel(insns, opts[0]);
			break;
		case Insn.Code.FOREACH:
			break;
		case Insn.Code.EACHCHK:
			this.markLabel(insns, opts[0]);
			this.markParamInfo(insns, opts[1]);
			break;
		case Insn.Code.GOSUB:
			this.markLabel(insns, opts[0]);
			break;
		case Insn.Code.GOTO_EXPR:
		case Insn.Code.GOSUB_EXPR:
			this.markParamInfo(insns, opts[0]);
			break;
		case Insn.Code.EXGOTO:
			this.markParamInfos(insns, opts[0]);
			break;
		case Insn.Code.ON:
			this.markParamInfos(insns, opts[1]);
			this.markParamInfo(insns, opts[2]);
			break;
		default:
			throw new Error('must not happen');
		}
	},
	markLabel: function(insns, label) {
		insns.push(label.getInsn());
	},
	markModule: function(insns, module) {
		if(module.constructor) {
			this.markLabel(insns, module.constructor.label);
		}
		if(module.destructor) {
			this.markLabel(insns, module.destructor.label);
		}
	},
	markParamInfo: function(insns, paramInfo) {
		var self = this;
		traverseParamInfo(paramInfo, function(node) {
			if(!node.isLabelNode()) return;
			self.markLabel(insns, node.lobj);
		});
	},
	markParamInfos: function(insns, paramInfos) {
		for(var i = 0; i < paramInfos.length; i ++) {
			this.markParamInfo(insns, paramInfos[i]);
		}
	},
	peepholeOptimize: function(sequence) {
		var insn = sequence.firstInsn();
		while(insn) {
			var nextInsn = insn.getNextInsn();
			var prevInsn = insn.getPrevInsn();
			if(insn.code == Insn.Code.GOTO) {
				var destInsn = insn.opts[0].getInsn();
				if(destInsn == nextInsn) {
					// GOTO命令でジャンプ先が次の命令の場合、削除する
					insn.remove();
				} else if(destInsn != insn &&
				          destInsn.code == Insn.Code.GOTO &&
				          insn.opts[0] != destInsn.opts[0]) {
					// GOTO命令(a)のジャンプ先がGOTO命令(b)だったら、(a)のジャンプ先を(b)のジャンプ先に変更する
					insn.opts[0] = destInsn.opts[0];
					continue;
				} else if(prevInsn &&
				   (prevInsn.code == Insn.Code.IFEQ ||
				    prevInsn.code == Insn.Code.IFNE) &&
				   nextInsn == prevInsn.opts[0].getInsn()) {
					// 「IFEQ L1; GOTO L2; L1: ...」 => 「IFNE L2」
					if(prevInsn.code == Insn.Code.IFEQ) {
						prevInsn.code = Insn.Code.IFNE;
					}else {
						prevInsn.code = Insn.Code.IFEQ;
					}
					prevInsn.opts[0] = insn.opts[0];
					insn.remove();
				}
			}
			if(insn.code == Insn.Code.IFEQ || insn.code == Insn.Code.IFNE) {
				// 「IFEQ L1; ...; L1: GOTO L2」 => 「IFEQ L2」
				var destInsn = insn.opts[0].getInsn();
				if(destInsn.code == Insn.Code.GOTO) {
					insn.opts[0] = destInsn.opts[0];
				}
			}
			insn = nextInsn;
		}
	},
	pushNewInsn: function(sequence, code, opts, token) {
		if(!token) token = this.ax.tokens[this.tokensPos];
		sequence.push(new Insn(code, opts, token.fileName, token.lineNo));
	},
	getFinfoIdByMinfoId: function(minfoId) {
		var funcsInfo = this.ax.funcsInfo;
		for(var i = 0; i < funcsInfo.length; i ++) {
			var funcInfo = funcsInfo[i];
			if(funcInfo.prmindex <= minfoId && minfoId < funcInfo.prmindex + funcInfo.prmmax) {
				return i;
			}
		}
		return null;
	},
	error: function(message, token) {
		if(!token) token = this.ax.tokens[this.tokensPos];
		return new CompileError(message, token.fileName, token.lineNo);
	},
	compileStatement: function(sequence) {
		var token = this.ax.tokens[this.tokensPos];
		switch(token.type) {
		case Token.Type.VAR:
		case Token.Type.STRUCT:
			this.compileAssignment(sequence);
			break;
		case Token.Type.CMPCMD:
			this.compileBranchCommand(sequence);
			break;
		case Token.Type.PROGCMD:
			this.compileProgramCommand(sequence);
			break;
		case Token.Type.MODCMD:
			this.compileUserDefCommand(sequence);
			break;
		case Token.Type.INTCMD:
			this.compileBasicCommand(sequence);
			break;
		case Token.Type.EXTCMD:
			this.compileGuiCommand(sequence);
			break;
		case Token.Type.DLLFUNC:
		case Token.Type.DLLCTRL:
			this.compileCommand(sequence);
			break;
		default:
			throw this.error("命令コード " + token.type + " は解釈できません。");
		}
	},
	compileAssignment: function(sequence) {
		var varToken = this.ax.tokens[this.tokensPos];
		var varData = this.getVariableData(true);
		++ this.tokensPos;
		var indexNodes = this.getVariableSubscriptNodes();
		var token = this.ax.tokens[this.tokensPos++];
		if(!(token && token.type == Token.Type.MARK)) {
			throw this.error();
		}
		if(this.ax.tokens[this.tokensPos].ex1 && (token.val == 0 || token.val == 1)) {
			// インクリメント / デクリメント
			var indexParamInfos = this.compileNodes(sequence, indexNodes);
			this.pushNewInsn(sequence, Insn.Code.INC + token.val, [varData, indexParamInfos], token);
			return;
		}
		var rhsParamInfos = this.compileParameters(sequence, true, returnTrue);
		var indexParamInfos = this.compileNodes(sequence, indexNodes);
		if(token.val != 8) { // CALCCODE_EQ
			// 複合代入
			if(rhsParamInfos.length != 1) {
				throw this.error("複合代入のパラメータの数が間違っています。", token);
			}
			this.pushNewInsn(sequence, Insn.Code.COMPOUND_ASSIGN, [token.val, varData, indexParamInfos, rhsParamInfos[0]], token);
			return;
		}
		if(rhsParamInfos.length == 0) {
			throw this.error("代入のパラメータの数が間違っています。", token);
		}
		this.pushNewInsn(sequence, Insn.Code.ASSIGN, [varData, indexParamInfos, rhsParamInfos], token);
	},
	compileProgramCommand: function(sequence) {
		var token = this.ax.tokens[this.tokensPos];
		switch(token.code) {
		case 0x00: // goto
			var labelToken = this.ax.tokens[this.tokensPos + 1];
			if(labelToken && labelToken.type == Token.Type.LABEL && !labelToken.ex2 && (!this.ax.tokens[this.tokensPos + 2] || this.ax.tokens[this.tokensPos + 2].ex1)) {
				this.pushNewInsn(sequence, Insn.Code.GOTO,
				                 [this.labels[labelToken.code]]);
				this.tokensPos += 2;
			} else {
				this.tokensPos ++;
				var paramInfos = this.compileParameters(sequence, false, returnTrue);
				if(paramInfos.length != 1) throw this.error('goto の引数の数が違います', token);
				this.pushNewInsn(sequence, Insn.Code.GOTO_EXPR, [paramInfos[0]], token);
			}
			break;
		case 0x01: // gosub
			var labelToken = this.ax.tokens[this.tokensPos + 1];
			if(labelToken && labelToken.type == Token.Type.LABEL && !labelToken.ex2 && (!this.ax.tokens[this.tokensPos + 2] || this.ax.tokens[this.tokensPos + 2].ex1)) {
				this.pushNewInsn(sequence, Insn.Code.GOSUB,
				                 [this.labels[labelToken.code]]);
				this.tokensPos += 2;
			} else {
				this.tokensPos ++;
				var paramInfos = this.compileParameters(sequence, false, returnTrue);
				if(paramInfos.length != 1) throw this.error('gosub の引数の数が違います', token);
				this.pushNewInsn(sequence, Insn.Code.GOSUB_EXPR, [paramInfos[0]], token);
			}
			break;
		case 0x02: // return
			this.tokensPos ++;
			if(this.ax.tokens[this.tokensPos].ex2) throw this.error('パラメータは省略できません', token);
			var existReturnValue = !this.ax.tokens[this.tokensPos].ex1;
			var paramInfo = null;
			if(existReturnValue) {
				paramInfo = this.compileParameter(sequence, true, returnTrue);
				if(this.getParametersNodesSub().length > 0) throw this.error('return の引数が多すぎます', token);
			}
			this.pushNewInsn(sequence, Insn.Code.RETURN, [paramInfo], token);
			break;
		case 0x03: // break
			this.tokensPos ++;
			var labelToken = this.ax.tokens[this.tokensPos++];
			if(labelToken.type != Token.Type.LABEL) {
				throw this.error();
			}
			if(this.getParametersNodes().length > 0) throw this.error('break の引数が多すぎます', token);
			this.pushNewInsn(sequence, Insn.Code.BREAK,
			                 [this.labels[labelToken.code]], token);
			break;
		case 0x04: // repeat
			this.tokensPos ++;
			var labelToken = this.ax.tokens[this.tokensPos++];
			if(labelToken.type != Token.Type.LABEL) {
				throw this.error();
			}
			var paramInfos = this.compileParameters(sequence, false, returnTrue, paramInfos);
			if(paramInfos.length > 2) throw this.error('repeat の引数が多すぎます', token);
			this.pushNewInsn(sequence, Insn.Code.REPEAT,
			                 [this.labels[labelToken.code], paramInfos], token);
			break;
		case 0x05: // loop
			this.tokensPos ++;
			if(this.getParametersNodes().length > 0) throw this.error('loop の引数が多すぎます', token);
			this.pushNewInsn(sequence, Insn.Code.LOOP, [], token);
			break;
		case 0x06: // continue
			this.tokensPos ++;
			var labelToken = this.ax.tokens[this.tokensPos++];
			if(labelToken.type != Token.Type.LABEL) {
				throw this.error();
			}
			var paramInfos = this.compileParameters(sequence, false, returnTrue);
			if(paramInfos.length > 1) throw this.error('continue の引数が多すぎます', token);
			this.pushNewInsn(sequence, Insn.Code.CONTINUE,
			                 [this.labels[labelToken.code], paramInfos[0]], token);
			break;
		case 0x0b: // foreach
			this.tokensPos ++;
			var labelToken = this.ax.tokens[this.tokensPos++];
			if(labelToken.type != Token.Type.LABEL) {
				throw this.error();
			}
			if(this.getParametersNodes().length > 0) throw this.error();
			this.pushNewInsn(sequence, Insn.Code.FOREACH,
			                 [this.labels[labelToken.code]], token);
			break;
		case 0x0c: // eachchk
			this.tokensPos ++;
			var labelToken = this.ax.tokens[this.tokensPos++];
			if(labelToken.type != Token.Type.LABEL) {
				throw this.error();
			}
			var paramInfos = this.compileParameters(sequence);
			if(paramInfos.length != 1) throw this.error('foreach の引数の数が違います', token);
			this.pushNewInsn(sequence, Insn.Code.EACHCHK,
			                 [this.labels[labelToken.code], paramInfos[0]], token);
			break;
		case 0x12: // newmod
			this.tokensPos ++;
			if(this.ax.tokens[this.tokensPos].ex2) {
				throw this.error('パラメータは省略できません');
			}
			var varNode = this.getVarNode(true, false);
			var structToken = this.ax.tokens[this.tokensPos++];
			var prmInfo = this.ax.prmsInfo[structToken.code];
			if(structToken.type != Token.Type.STRUCT || prmInfo.mptype != MPType.STRUCTTAG) {
				throw this.error('モジュールが指定されていません', structToken);
			}
			var module = this.getUserDefFunc(prmInfo.subid);
			var paramInfos = null;
			var argc;
			if(module.constructor) {
				paramInfos = this.compileNodes(sequence, this.getUserDefFuncallParamNodes(module.constructor, false, false));
				argc = paramInfos.length;
			} else {
				argc = this.getParametersNodesSub().length;
			}
			this.pushNewInsn(sequence, Insn.Code.NEWMOD,
				             [this.compileNode(sequence, varNode), module, paramInfos, argc], token);
			break;
		case 0x18: // exgoto
			// exgoto の第一引数は変数だが、値しか使わない
			// FIXME 添え字つきのときに配列拡張していない
			this.tokensPos ++;
			var paramInfos = this.compileParameters(sequence, false, returnTrue);
			if(paramInfos.length != 4) throw this.error('exgoto の引数の数が違います', token);
			this.pushNewInsn(sequence, Insn.Code.EXGOTO, [paramInfos], token);
			break;
		case 0x19: // on
			// ON 命令はラベルを評価してから、インデックスを評価するのでコンパイルする順番は インデックス -> ラベルで問題ない
			this.tokensPos ++;
			var paramToken = this.ax.tokens[this.tokensPos];
			if(paramToken.ex1 || paramToken.ex2) {
				throw this.error('パラメータは省略できません', token);
			}
			var indexParamInfo = this.compileParameter(sequence, true);
			var jumpTypeToken = this.ax.tokens[this.tokensPos];
			if(jumpTypeToken.ex1 || jumpTypeToken.type != Token.Type.PROGCMD || jumpTypeToken.code > 1) {
				throw this.error('goto / gosub が指定されていません', token);
			}
			var isGosub = jumpTypeToken.code == 1;
			this.tokensPos ++;
			var labelParamInfos = this.compileParametersSub(sequence, false, returnTrue);
			this.pushNewInsn(sequence, Insn.Code.ON, [isGosub, labelParamInfos, indexParamInfo], token);
			break;
		default:
			this.compileCommand(sequence);
		}
	},
	compileBasicCommand: function(sequence) {
		var token = this.ax.tokens[this.tokensPos];
		switch(token.code) {
		case 0x00: // onexit
		case 0x01: // onerror
		case 0x02: // onkey
		case 0x03: // onclick
		case 0x04: // oncmd
			this.tokensPos ++;
			var paramInfos = [this.compileOptionalJumpType(sequence)];
			this.compileParameters(sequence, false, returnTrue, paramInfos);
			this.pushNewInsn(sequence, Insn.Code.CALL_BUILTIN_CMD,
			                 [token.type, token.code, paramInfos], token);
			break;
		default:
			this.compileCommand(sequence);
		}
	},
	compileGuiCommand: function(sequence) {
		var token = this.ax.tokens[this.tokensPos];
		switch(token.code) {
		case 0x00: // button
			this.tokensPos ++;
			var paramInfos = [this.compileOptionalJumpType(sequence)];
			this.compileParameters(sequence, false, returnTrue, paramInfos);
			this.pushNewInsn(sequence, Insn.Code.CALL_BUILTIN_CMD,
			                 [token.type, token.code, paramInfos], token);
			break;
		default:
			this.compileCommand(sequence);
		}
	},
	compileCommand: function(sequence) {
		var token = this.ax.tokens[this.tokensPos++];
		var paramInfos = this.compileParameters(sequence, false, this.builtinFuncParametersCallback(token.type, token.code));
		this.pushNewInsn(sequence, Insn.Code.CALL_BUILTIN_CMD,
		                 [token.type, token.code, paramInfos], token);
	},
	builtinFuncParametersCallback: function(type, subid) {
		var i = 0;
		var info = BuiltinFuncInfos[type][subid];
		return info ? function() { return info.notReceiveVar(i++) } : returnFalse;
	},
	compileBranchCommand: function(sequence) {
		var token = this.ax.tokens[this.tokensPos++];
		var skipTo = token.pos + token.size + token.skipOffset;
		var label = new Label;
		if(skipTo in this.ifLabels) {
			this.ifLabels[skipTo].push(label);
		} else {
			this.ifLabels[skipTo] = [label];
		}
		var nodes = this.getParametersNodes(true, returnTrue);
		if(token.code == 0) { // 'if'
			if(nodes.length != 1) throw this.error("if の引数の数が間違っています。", token);
			var paramInfo = this.compileNode(sequence, nodes[0]);
			// if の条件式がリテラルのとき最適化
			var node = paramInfo.node;
			if(node.isLiteralNode() &&
			   (node.val.type == VarType.INT || node.val.type == VarType.DOUBLE)) {
				if(!node.val._value) {
					this.pushNewInsn(sequence, Insn.Code.GOTO, [label], token);
				}
				return;
			}
			this.pushNewInsn(sequence, Insn.Code.IFEQ, [label, paramInfo], token);
		} else {
			if(nodes.length != 0) throw this.error("else の引数の数が間違っています。", token);
			this.pushNewInsn(sequence, Insn.Code.GOTO, [label], token);
		}
	},
	compileParameters: function(sequence, cannotBeOmitted, notReceiveVarCallback, result) {
		return this.compileParameters0(sequence, cannotBeOmitted, notReceiveVarCallback, result, true);
	},
	compileParametersSub: function(sequence, cannotBeOmitted, notReceiveVarCallback, result) {
		return this.compileParameters0(sequence, cannotBeOmitted, notReceiveVarCallback, result, false);
	},
	compileParameters0: function(sequence, cannotBeOmitted, notReceiveVarCallback, result, isHead) {
		if(!result) result = [];
		var len = result.length;
		this.getParametersNodes0(cannotBeOmitted, notReceiveVarCallback, result, isHead);
		for(var i = result.length - 1; i >= len; i --) {
			result[i] = this.compileNode(sequence, result[i]);
		}
		return result;
	},
	compileParameter: function(sequence, notReceiveVar) {
		return this.compileNode(sequence, this.getParameterNode(notReceiveVar));
	},
	compileNodes: function(sequence, nodes) {
		var paramInfos = [];
		for(var i = nodes.length - 1; i >= 0; i --) {
			paramInfos[i] = this.compileNode(sequence, nodes[i]);
		}
		return paramInfos;
	},
	compileNode: function(sequence, root) {
		var stackSize = 0;
		var propname = 0;
		var rootWrapper = [root];
		var self = this;
		function traverse(parent, propname) {
			var node = parent[propname];
			switch(node.nodeType) {
			case NodeType.VAR:
				if(node.indexNodes.length > 0) {
					parent[propname] = new GetStackNode(node);
					stackSize ++;
					self.pushNewInsn(sequence,
					                 node.onlyValue ? Insn.Code.GET_VAR : Insn.Code.PUSH_VAR,
					                 [node.varData, self.compileNodes(sequence, node.indexNodes)],
					                 node.token);
				}
				break;
			case NodeType.ARG:
				break;
			case NodeType.LITERAL:
				break;
			case NodeType.LABEL:
				break;
			case NodeType.DEFAULT:
				break;
			case NodeType.OPERATE:
				traverse(node, 'rhsNode');
				traverse(node, 'lhsNode');
				break;
			case NodeType.USERDEF_FUNCALL:
				parent[propname] = new GetStackNode(node);
				stackSize ++;
				var paramInfos = self.compileNodes(sequence, node.paramNodes);
				self.pushNewInsn(sequence,
				                 Insn.Code.CALL_USERDEF_FUNC,
				                 [node.userDefFunc, paramInfos],
				                 node.token);
				break;
			case NodeType.BUILTIN_FUNCALL:
				var paramInfos = self.compileNodes(sequence, node.paramNodes);
				var info = BuiltinFuncInfos[node.groupId][node.subId];
				if(info && info.isInlineExpr) {
					parent[propname] = new InlineExprBuiltinFuncall(node.groupId, node.subId, info, paramInfos);
					break;
				}
				parent[propname] = new GetStackNode(node);
				stackSize ++;
				self.pushNewInsn(sequence,
				                 Insn.Code.CALL_BUILTIN_FUNC,
				                 [node.groupId, node.subId, paramInfos],
				                 node.token);
				break;
			default:
				throw new Error('must not happen');
			}
		}
		traverse(rootWrapper, 0);
		return new ParamInfo(rootWrapper[0], stackSize);
	},
	getParametersNodes: function(cannotBeOmitted, notReceiveVarCallback, nodes) {
		return this.getParametersNodes0(cannotBeOmitted, notReceiveVarCallback, nodes, true);
	},
	getParametersNodesSub: function(cannotBeOmitted, notReceiveVarCallback, nodes) {
		return this.getParametersNodes0(cannotBeOmitted, notReceiveVarCallback, nodes, false);
	},
	getParametersNodes0: function(cannotBeOmitted, notReceiveVarCallback, nodes, isHead) {
		if(!notReceiveVarCallback) notReceiveVarCallback = returnFalse;
		if(!nodes) nodes = [];
		if(isHead && this.ax.tokens[this.tokensPos].ex2) {
			if(cannotBeOmitted) {
				throw this.error('パラメータの省略はできません');
			}
			nodes.push(new DefaultNode);
		}
		while(true) {
			var token = this.ax.tokens[this.tokensPos];
			if(!token || token.ex1) break;
			if(token.type == Token.Type.MARK) {
				if(token.code == 63) { // '?'
					if(cannotBeOmitted) {
						throw this.error('パラメータの省略はできません');
					}
					nodes.push(new DefaultNode);
					this.tokensPos ++;
					continue;
				}
				if(token.code == 41) { // ')'
					break;
				}
			}
			var notReceiveVar = notReceiveVarCallback();
			nodes.push(this.getParameterNode(notReceiveVar));
		}
		return nodes;
	},
	getParameterNode: function(notReceiveVar) {
		var headPos = this.tokensPos;
		var stack = [];
		LOOP: while(true) {
			var token = this.ax.tokens[this.tokensPos];
			if(!token || token.ex1) break;
			switch(token.type) {
			case Token.Type.MARK:
				var calcCode = token.code;
				if(calcCode == 41) { // ')'
					break LOOP;
				}
				if(stack.length < 2) {
					throw this.error("演算のためのオペランドが足りません");
				}
				var rhs = stack.pop();
				var lhs = stack.pop();
				stack.push(this.compileOperator(calcCode, lhs, rhs));
				this.tokensPos ++;
				break;
			case Token.Type.VAR:
			case Token.Type.STRUCT:
				stack.push(this.getVarNode(false, true));
				break;
			case Token.Type.STRING:
				stack.push(new LiteralNode(new StrValue(token.val)));
				this.tokensPos ++;
				break;
			case Token.Type.DNUM:
				stack.push(new LiteralNode(new DoubleValue(token.val)));
				this.tokensPos ++;
				break;
			case Token.Type.INUM:
				stack.push(new LiteralNode(new IntValue(token.val)));
				this.tokensPos ++;
				break;
			case Token.Type.LABEL:
				stack.push(new LabelNode(this.labels[token.code]));
				this.tokensPos ++;
				break;
			case Token.Type.EXTSYSVAR:
				stack.push(this.getExtSysvarCallNode());
				break;
			case Token.Type.SYSVAR:
				stack.push(this.getSysvarCallNode());
				break;
			case Token.Type.MODCMD:
				stack.push(this.getUserDefFuncallNode());
				break;
			case Token.Type.INTFUNC:
			case Token.Type.DLLFUNC:
			case Token.Type.DLLCTRL:
				stack.push(this.getFuncallNode());
				break;
			default:
				throw this.error("命令コード " + token.type + " は解釈できません。");
			}
			token = this.ax.tokens[this.tokensPos];
			if(token && token.ex2) break;
		}
		if(stack.length > 1) {
			throw this.error("オペランドが余っています");
		}
		var node = stack[0];
		if(!notReceiveVar && node.isVarNode()) {
			node.onlyValue = false;
		}
		return node;
	},
	isOnlyVar: function(pos, headPos) {
		if(pos != headPos) return false;
		var nextTokenPos = pos + 1;
		nextTokenPos += this.skipParenAndParameters(nextTokenPos);
		var nextToken = this.ax.tokens[nextTokenPos];
		return (!nextToken || nextToken.ex1 || nextToken.ex2 || this.isRightParenToken(nextToken));
	},
	skipParameter: function(pos) {
		var size = 0;
		var parenLevel = 0;
		while(true) {
			var token = this.ax.tokens[pos + size];
			if(!token || token.ex1) return size;
			if(token.type == Token.Type.MARK) {
				switch(token.val) {
				case 40:
					parenLevel ++;
					break;
				case 41:
					if(parenLevel == 0) return size;
					parenLevel --;
					break;
				case 63:
					return size + 1;
					break;
				}
			}
			size ++;
			token = this.ax.tokens[pos + size];
			if(parenLevel == 0 && token && token.ex2) {
				return size;
			}
		}
	},
	skipParameters: function(pos) {
		var skipped = 0;
		var size = 0;
		while((skipped = this.skipParameter(pos + size))) {
			size += skipped;
		}
		return size;
	},
	skipParenAndParameters: function(pos) {
		var parenToken = this.ax.tokens[pos];
		if(!(parenToken && parenToken.type == Token.Type.MARK && parenToken.code == 40)) {
			return 0;
		}
		var size = 1;
		size += this.skipParameters(pos + size);
		parenToken = this.ax.tokens[pos + size];
		if(!(parenToken && parenToken.type == Token.Type.MARK && parenToken.code == 41)) {
			throw this.error('関数パラメータの後ろに閉じ括弧がありません。', parenToken);
		}
		return size + 1;
	},
	compileOperator: function(calcCode, lhs, rhs) {
		if(!(0 <= calcCode && calcCode < 16)) {
			throw this.error("演算子コード " + token.code + " は解釈できません。", token);
		}
		if(lhs.isLiteralNode() && rhs.isLiteralNode()) {
			try {
				var result = this.operate(lhs.val, rhs.val, calcCode);
				return new LiteralNode(result);
			} catch(e) {
				if(!(e instanceof HSPError)) throw e;
			}
		}
		return new OperateNode(calcCode, lhs, rhs);
	},
	operate: function(lhs, rhs, calcCode) {
		switch(calcCode) {
		case  0: return lhs.add(rhs);
		case  1: return lhs.sub(rhs);
		case  2: return lhs.mul(rhs);
		case  3: return lhs.div(rhs);
		case  4: return lhs.mod(rhs);
		case  5: return lhs.and(rhs);
		case  6: return lhs.or(rhs);
		case  7: return lhs.xor(rhs);
		case  8: return lhs.eq(rhs);
		case  9: return lhs.ne(rhs);
		case 10: return lhs.gt(rhs);
		case 11: return lhs.lt(rhs);
		case 12: return lhs.gteq(rhs);
		case 13: return lhs.lteq(rhs);
		case 14: return lhs.rsh(rhs);
		case 15: return lhs.lsh(rhs);
		default:  throw new Error('must not happen');
		}
	},
	getVarNode: function(mustBeVar, onlyValue) {
		var token = this.ax.tokens[this.tokensPos];
		var varData = this.getVariableData(mustBeVar);
		++ this.tokensPos;
		if(varData.proxyVarType == ProxyVarType.ARG_NOTVAR) {
			return new ArgNode(varData.id);
		}
		var indexNodes = this.getVariableSubscriptNodes();
		return new VarNode(varData, indexNodes, onlyValue, token);
	},
	getExtSysvarCallNode: function() {
		var token = this.ax.tokens[this.tokensPos];
		if(token.code >= 0x100) {
			return this.getFuncallNode();
		} else {
			return this.getSysvarCallNode();
		}
	},
	getSysvarCallNode: function() {
		var token = this.ax.tokens[this.tokensPos++];
		return new BuiltinFuncallNode(token.type, token.code, [], token);
	},
	compileOptionalJumpType: function(sequence) {
		var token = this.ax.tokens[this.tokensPos];
		var jumpType;
		if(!token.ex1 && token.type == Token.Type.PROGCMD && token.val == 0) {
			this.tokensPos ++;
			return this.compileNode(sequence, new LiteralNode(JumpType.GOTO));
		} else if(!token.ex1 && token.type == Token.Type.PROGCMD && token.val == 1) {
			this.tokensPos ++;
			return this.compileNode(sequence, new LiteralNode(JumpType.GOSUB));
		} else {
			return this.compileNode(sequence, new DefaultNode);
		}
	},
	getUserDefFuncallNode: function() {
		var token = this.ax.tokens[this.tokensPos++];
		var userDefFunc = this.getUserDefFunc(token.code);
		var nodes = this.getUserDefFuncallParamNodes(userDefFunc, true, true);
		return new UserDefFuncallNode(userDefFunc, nodes, token);
	},
	compileUserDefCommand: function(sequence) {
		var token = this.ax.tokens[this.tokensPos++];
		var userDefFunc = this.getUserDefFunc(token.code);
		var paramInfos = this.compileNodes(sequence, this.getUserDefFuncallParamNodes(userDefFunc, false, true));
		this.pushNewInsn(sequence, Insn.Code.CALL_USERDEF_CMD,
		                 [userDefFunc, paramInfos], token);
	},
	getUserDefFuncallParamNodes: function(userDefFunc, isCType, isHead) {
		var argsCount = 0; // 仮引数の現在位置
		var nodes = [];
		function nextMPType() {
			do {
				var mptype = userDefFunc.paramTypes[argsCount++];
			} while(mptype == MPType.LOCALVAR);
			return mptype;
		}
		if(isHead && isCType) this.compileLeftParen();
		if(isHead && this.ax.tokens[this.tokensPos].ex2) {
			nodes.push(new DefaultNode());
			nextMPType();
		}
		while(true) {
			var token = this.ax.tokens[this.tokensPos];
			if(!token || token.ex1) break;
			if(token.type == Token.Type.MARK) {
				if(token.code == 63) { // '?'
					this.tokensPos ++;
					nodes.push(new DefaultNode());
					nextMPType();
					continue;
				}
				if(token.code == 41) { // ')'
					break;
				}
			}
			var mptype = nextMPType();
			var notReceiveVar = mptype != MPType.SINGLEVAR &&
			                    mptype != MPType.MODULEVAR &&
			                    mptype != MPType.ARRAYVAR;
			var node = this.getParameterNode(notReceiveVar);
			nodes.push(node);
		}
		if(isCType) this.compileRightParen();
		return nodes;
	},
	getUserDefFunc: function(finfoId) {
		var func = this.userDefFuncs[finfoId];
		if(func) return func;
		var funcInfo = this.ax.funcsInfo[finfoId];
		if(funcInfo.index == -3) { // STRUCTDAT_INDEX_STRUCT
			var destructor = funcInfo.otindex != 0 ? this.getUserDefFunc(funcInfo.otindex) : null;
			var constructorFinfoId = this.ax.prmsInfo[funcInfo.prmindex].offset;
			var constructor = constructorFinfoId != -1 ? this.getUserDefFunc(constructorFinfoId) : null;
			return this.userDefFuncs[finfoId] = new Module(funcInfo.name, constructor, destructor, funcInfo.prmmax - 1);
		}
		var isCType = funcInfo.index == -2; // STRUCTDAT_INDEX_CFUNC
		var paramTypes = [];
		for(var i = 0; i < funcInfo.prmmax; i ++) {
			paramTypes[i] = this.ax.prmsInfo[funcInfo.prmindex + i].mptype;
		}
		return this.userDefFuncs[finfoId] = new UserDefFunc(isCType, funcInfo.name, this.labels[funcInfo.otindex], paramTypes);
	},
	getFuncallNode: function() {
		var token = this.ax.tokens[this.tokensPos++];
		this.compileLeftParen();
		var nodes = this.getParametersNodes(false, this.builtinFuncParametersCallback(token.type, token.code));
		this.compileRightParen();
		var groupId = token.type;
		var subId = token.code;
		var allLiteralParam = true;
		for(var i = 0; i < nodes.length; i ++) {
			if(!nodes[i].isLiteralNode()) {
				allLiteralParam = false;
				break;
			}
		}
		if(allLiteralParam) {
			var func = BuiltinFuncInfos[groupId];
			func = func && func[subId];
			func = func && func.compileTimeFunc;
			if(func) {
				var args = [];
				for(var i = 0; i < nodes.length; i ++) {
					args[i] = nodes[i].val;
				}
				try {
					return new LiteralNode(func.apply(null, args));
				} catch(e) {
					if(!(e instanceof HSPError)) {
						throw e;
					}
				}
			}
		}
		return new BuiltinFuncallNode(groupId, subId, nodes, token);
	},
	compileLeftParen: function() {
		var parenToken = this.ax.tokens[this.tokensPos++];
		if(!(parenToken && parenToken.type == Token.Type.MARK && parenToken.code == 40)) {
			throw this.error('関数名の後ろに開き括弧がありません。', parenToken);
		}
	},
	compileRightParen: function() {
		var parenToken = this.ax.tokens[this.tokensPos++];
		if(!(parenToken && parenToken.type == Token.Type.MARK && parenToken.code == 41)) {
			throw this.error('関数パラメータの後ろに閉じ括弧がありません。', parenToken);
		}
	},
	getVariableData: function(mustBeVar) {
		var token = this.ax.tokens[this.tokensPos];
		var type;
		var id;
		if(token.type == Token.Type.VAR) {
			type = ProxyVarType.STATIC;
			id = this.staticVarTags[token.code];
		} else if(token.type == Token.Type.STRUCT) {
			type = this.getProxyVarType();
			if(mustBeVar && type == ProxyVarType.ARG_NOTVAR) {
				throw this.error('変数が指定されていません');
			}
			if(type != ProxyVarType.THISMOD) {
				var funcInfo = this.ax.funcsInfo[this.getFinfoIdByMinfoId(token.code)];
				if(type == ProxyVarType.MEMBER) {
					id = token.code - funcInfo.prmindex - 1;
				} else {
					id = token.code - funcInfo.prmindex;
				}
			}
		} else {
			if(!mustBeVar) throw new Error('must not happen');
			throw this.error('変数が指定されていません');
		}
		return new VariableData(type, id);
	},
	getProxyVarType: function() {
		var token = this.ax.tokens[this.tokensPos];
		if(token.code == -1) {
			if(this.isLeftParenToken(this.ax.tokens[this.tokensPos + 1])) {
				throw this.error('thismod に添字を指定しています');
			}
			return ProxyVarType.THISMOD;
		}
		var prmInfo = this.ax.prmsInfo[token.code];
		if(prmInfo.subid >= 0) {
			return ProxyVarType.MEMBER;
		}
		switch(prmInfo.mptype) {
		case MPType.LOCALVAR:
			return ProxyVarType.ARG_LOCAL;
		case MPType.ARRAYVAR:
			return ProxyVarType.ARG_ARRAY;
		case MPType.SINGLEVAR:
			if(this.isLeftParenToken(this.ax.tokens[this.tokensPos + 1])) {
				throw this.error('パラメータタイプ var の変数に添字を指定しています');
			}
			return ProxyVarType.ARG_VAR;
		default:
			if(this.isLeftParenToken(this.ax.tokens[this.tokensPos + 1])) {
				throw this.error('変数でないエイリアスに添字を指定しています');
			}
			return ProxyVarType.ARG_NOTVAR;
		}
	},
	isLeftParenToken: function(token) {
		return token && token.type == Token.Type.MARK && token.code == 40;
	},
	isRightParenToken: function(token) {
		return token && token.type == Token.Type.MARK && token.code == 41;
	},
	getVariableSubscriptNodes: function() {
		if(!this.isLeftParenToken(this.ax.tokens[this.tokensPos])) {
			return [];
		}
		this.tokensPos ++;
		var nodes = this.getParametersNodes(true, returnTrue);
		if(nodes.length == 0) {
			throw this.error('配列変数の添字が空です');
		}
		if(!this.isRightParenToken(this.ax.tokens[this.tokensPos++])) {
			throw this.error('配列変数の添字の後ろに閉じ括弧がありません。', parenToken);
		}
		return nodes;
	}
};

if(typeof HSPonJS != 'undefined') {
	HSPonJS.Compiler = Compiler;
	HSPonJS.CompileError = CompileError;
	HSPonJS.VariableData = VariableData;
	HSPonJS.ProxyVarType = ProxyVarType;
	HSPonJS.StaticVariableTag = StaticVariableTag;
}

