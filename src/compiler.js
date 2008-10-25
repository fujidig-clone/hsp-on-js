function Compiler(ax) {
	this.ax = ax;
	this.tokensPos = 0;
	this.labels = new Array(ax.labels.length); // HSP のラベルIDに対応したラベル
	for(var i = 0; i < ax.labels.length; i ++) {
		this.labels[i] = new Label;
	}
	this.ifLabels = {};
	this.userDefFuncs = [];
}

function CompileError(message, hspFileName, hspLineNumber) {
	this.message = message;
	this.hspFileName = hspFileName;
	this.hspLineNumber = hspLineNumber;
}
CompileError.prototype = new Error;
CompileError.prototype.name = 'CompileError';

Compiler.prototype = {
	compile: function compile() {
		var sequence = [];
		while(this.tokensPos < this.ax.tokens.length) {
			var token = this.ax.tokens[this.tokensPos];
			if(!token.ex1) {
				throw this.error();
			}
			var labelIDs = this.ax.labelsMap[token.pos];
			if(labelIDs) {
				for(var i = 0; i < labelIDs.length; i ++) {
					var labelID = labelIDs[i];
					this.labels[labelID].pos = sequence.length;
				}
			}
			var labels = this.ifLabels[token.pos];
			if(labels) {
				for(var i = 0; i < labels.length; i ++) {
					labels[i].pos = sequence.length;
				}
			}
			switch(token.type) {
			case Token.Type.VAR:
			case Token.Type.STRUCT:
				this.compileAssignment(sequence);
				break;
			case Token.Type.CMPCMD:
				this.compileCompareCommand(sequence);
				break;
			case Token.Type.PROGCMD:
				this.compileProgramCommand(sequence);
				break;
			case Token.Type.MODCMD:
				this.compileUserDefCommand(sequence);
				break;
			case Token.Type.INTCMD:
			case Token.Type.EXTCMD:
			case Token.Type.DLLFUNC:
			case Token.Type.DLLCTRL:
				this.compileCommand(sequence);
				break;
			default:
				throw this.error("命令コード " + token.type + " は解釈できません。");
			}
		}
		return sequence;
	},
	pushNewInsn: function pushNewInsn(sequence, code, opts, token) {
		token || (token = this.ax.tokens[this.tokensPos]);
		sequence.push(new Instruction(code, opts, token.fileName, token.lineNo));
	},
	getFinfoIdByMinfoId: function getFinfoIdByMinfoId(minfoId) {
		var funcsInfo = this.ax.funcsInfo;
		for(var i = 0; i < funcsInfo.length; i ++) {
			var funcInfo = funcsInfo[i];
			if(funcInfo.prmindex <= minfoId && minfoId < funcInfo.prmindex + funcInfo.prmmax) {
				return i;
			}
		}
		return null;
	},
	error: function error(message, token) {
		token || (token = this.ax.tokens[this.tokensPos]);
		return new CompileError(message, token.fileName, token.lineNo);
	},
	compileAssignment: function compileAssignment(sequence) {
		this.compileVariable(sequence);
		var token = this.ax.tokens[this.tokensPos++];
		if(!(token && token.type == Token.Type.MARK)) {
			throw this.error();
		}
		if(this.ax.tokens[this.tokensPos].ex1) {
			if(token.val == 0) { // インクリメント
				this.pushNewInsn(sequence, Instruction.Code.INC, [], token);
				return;
			}
			if(token.val == 1) { // デクリメント
				this.pushNewInsn(sequence, Instruction.Code.DEC, [], token);
				return;
			}
		}
		if(token.val != 8) { // CALCCODE_EQ
			// 複合代入
			this.pushNewInsn(sequence, Instruction.Code.DUP, [], token);
			this.pushNewInsn(sequence, Instruction.Code.EXPANDARRAY, [], token);
			var argc = this.compileParameters(sequence, true);
			if(argc != 1) {
				throw this.error("複合代入のパラメータの数が間違っています。", token);
			}
			this.pushNewInsn(sequence, Instruction.Code.ADD + token.val, [], token);
			this.pushNewInsn(sequence, Instruction.Code.SETVAR, [argc], token);
			return;
		}
		var argc = this.compileParameters(sequence, true);
		if(argc == 0) {
			throw this.error("代入のパラメータの数が間違っています。", token);
		}
		this.pushNewInsn(sequence, Instruction.Code.SETVAR, [argc], token);
	},
	compileProgramCommand: function compileProgramCommand(sequence) {
		var token = this.ax.tokens[this.tokensPos];
		switch(token.code) {
		case 0x00: // goto
			var labelToken = this.ax.tokens[this.tokensPos + 1];
			if(labelToken && labelToken.type == Token.Type.LABEL && !labelToken.ex2 && (!this.ax.tokens[this.tokensPos + 2] || this.ax.tokens[this.tokensPos + 2].ex1)) {
				this.pushNewInsn(sequence, Instruction.Code.GOTO,
				                 [this.labels[labelToken.code]]);
				this.tokensPos += 2;
			} else {
				this.compileCommand(sequence);
			}
			break;
		case 0x02: // return
			this.tokensPos ++;
			var argc = this.compileParameters(sequence);
			if(argc > 1) throw this.error('return の引数が多すぎます', token);
			this.pushNewInsn(sequence, Instruction.Code.RETURN,
			                 [argc == 1], token);
			break;
		case 0x03: // break
		case 0x04: // repeat
		case 0x06: // continue
		case 0x0b: // foreach
		case 0x0c: // eachchk
			this.tokensPos ++;
			var labelToken = this.ax.tokens[this.tokensPos++];
			if(labelToken.type != Token.Type.LABEL) {
				throw this.error();
			}
			this.pushNewInsn(sequence, Instruction.Code.PUSH,
			                 [this.labels[labelToken.code]], labelToken);
			var argc = 1 + this.compileParameters(sequence);
			this.pushNewInsn(sequence, Instruction.Code.CALL_BUILTIN_CMD,
				             [token.type, token.code, argc], token);
			break;
		case 0x12: // newmod
			this.tokensPos ++;
			if(this.ax.tokens[this.tokensPos].ex2) {
				throw this.error('パラメータは省略できません');
			}
			this.compileVariable(sequence);
			var structToken = this.ax.tokens[this.tokensPos++];
			var prmInfo = this.ax.prmsInfo[structToken.code];
			if(structToken.type != Token.Type.STRUCT || prmInfo.mptype != MPType.STRUCTTAG) {
				throw this.error('モジュールが指定されていません', structToken);
			}
			var module = this.getUserDefFunc(prmInfo.subid);
			var argc = 1 + this.compileParametersSub(sequence);
			this.pushNewInsn(sequence, Instruction.Code.NEWMOD,
				             [module, argc], token);
			break;
		case 0x14: // delmod
			this.tokensPos ++;
			var argc = this.compileParameters(sequence);
			if(argc != 1) throw this.error('delmod の引数の数が違います', token);
			this.pushNewInsn(sequence, Instruction.Code.DELMOD, [], token);
			break;
		default:
			this.compileCommand(sequence);
		}
	},
	compileCommand: function compileCommand(sequence) {
		var token = this.ax.tokens[this.tokensPos++];
		var argc = this.compileParameters(sequence);
		this.pushNewInsn(sequence, Instruction.Code.CALL_BUILTIN_CMD,
		                 [token.type, token.code, argc], token);
	},
	compileCompareCommand: function compileCompareCommand(sequence) {
		var token = this.ax.tokens[this.tokensPos++];
		var skipTo = token.pos + token.size + token.skip_offset;
		var label = new Label;
		if(skipTo in this.ifLabels) {
			this.ifLabels[skipTo].push(label);
		} else {
			this.ifLabels[skipTo] = [label];
		}
		var argc = this.compileParameters(sequence);
		if(token.code == 0) { // 'if'
			if(argc != 1) throw this.error("if の引数の数が間違っています。", token);
			this.pushNewInsn(sequence, Instruction.Code.IFEQ,
			                 [label], token);
		} else {
			if(argc != 0) throw this.error("else の引数の数が間違っています。", token);
			this.pushNewInsn(sequence, Instruction.Code.GOTO,
			                 [label], token);
		}
	},
	compileParameters: function compileParameters(sequence, cannotBeOmitted) {
		var argc = 0;
		if(this.ax.tokens[this.tokensPos].ex2) {
			if(cannotBeOmitted) {
				throw this.error('パラメータの省略はできません');
			}
			this.pushNewInsn(sequence, Instruction.Code.PUSH, [undefined]);
			argc ++;
		}
		argc += this.compileParametersSub(sequence, cannotBeOmitted);
		return argc;
	},
	compileParametersSub: function compileParametersSub(sequence, cannotBeOmitted) {
		var argc = 0;
		while(true) {
			var token = this.ax.tokens[this.tokensPos];
			if(!token || token.ex1) return argc;
			if(token.type == Token.Type.PROGCMD) {
				this.compileJumpType(sequence);
				argc ++;
				token = this.ax.tokens[this.tokensPos];
				if(!token || token.ex1) return argc;
			}
			if(token.type == Token.Type.MARK) {
				if(token.code == 63) { // '?'
					if(cannotBeOmitted) {
						throw this.error('パラメータの省略はできません');
					}
					this.pushNewInsn(sequence, Instruction.Code.PUSH, [undefined]);
					this.tokensPos ++;
					argc ++;
					continue;
				}
				if(token.code == 41) { // ')'
					return argc;
				}
			}
			argc ++;
			
			while(true) {
				token = this.ax.tokens[this.tokensPos];
				if(!token || token.ex1) return argc;
				switch(token.type) {
				case Token.Type.MARK:
					if(token.code == 41) { // ')'
						return argc;
					}
					this.compileOperator(sequence);
					break;
				case Token.Type.VAR:
					this.compileStaticVariable(sequence);
					break;
				case Token.Type.STRING:
					this.pushNewInsn(sequence, Instruction.Code.PUSH,
					                 [new StrValue(token.val)]);
					this.tokensPos ++;
					break;
				case Token.Type.DNUM:
					this.pushNewInsn(sequence, Instruction.Code.PUSH,
					                 [new DoubleValue(token.val)]);
					this.tokensPos ++;
					break;
				case Token.Type.INUM:
					this.pushNewInsn(sequence, Instruction.Code.PUSH,
					                 [new IntValue(token.val)]);
					this.tokensPos ++;
					break;
				case Token.Type.STRUCT:
					this.compileStruct(sequence);
					break;
				case Token.Type.LABEL:
					this.pushNewInsn(sequence, Instruction.Code.PUSH,
					                 [this.labels[token.code]]);
					this.tokensPos ++;
					break;
				case Token.Type.EXTSYSVAR:
					this.compileExtSysvar(sequence);
					break;
				case Token.Type.SYSVAR:
					this.compileSysvar(sequence);
					break;
				case Token.Type.MODCMD:
					this.compileUserDefFuncall(sequence);
					break;
				case Token.Type.INTFUNC:
				case Token.Type.DLLFUNC:
				case Token.Type.DLLCTRL:
					this.compileFuncall(sequence);
					break;
				default:
					throw this.error("命令コード " + token.type + " は解釈できません。");
				}
				token = this.ax.tokens[this.tokensPos];
				if(token && token.ex2) break;
			}
		}
	},
	compileOperator: function compileOperator(sequence) {
		var token = this.ax.tokens[this.tokensPos];
		if(!(0 <= token.code && token.code < 16)) {
			throw this.error("演算子コード " + token.code + " は解釈できません。");
		}
		this.pushNewInsn(sequence, Instruction.Code.ADD + token.code, []);
		this.tokensPos ++;
	},
	compileExtSysvar: function compileExtSysvar(sequence) {
		var token = this.ax.tokens[this.tokensPos];
		if(token.code >= 0x100) {
			this.compileFuncall(sequence);
		} else {
			this.compileSysvar(sequence);
		}
	},
	compileStruct: function compileStruct(sequence) {
		var token = this.ax.tokens[this.tokensPos];
		var prmInfo = this.ax.prmsInfo[token.code];
		if(!this.compileProxyVariable(sequence)) {
			var funcInfo = this.ax.funcsInfo[this.getFinfoIdByMinfoId(token.code)];
			this.pushNewInsn(sequence, Instruction.Code.GETARG,
				             [token.code - funcInfo.prmindex], token);
		}
	},
	compileSysvar: function compileSysvar(sequence) {
		var token = this.ax.tokens[this.tokensPos++];
		this.pushNewInsn(sequence, Instruction.Code.CALL_BUILTIN_FUNC,
		                 [token.type, token.code, 0], token);
	},
	compileJumpType: function compileJumpType(sequence) {
		var token = this.ax.tokens[this.tokensPos++];
		switch(token.val) {
		case 0:
			this.pushNewInsn(sequence, Instruction.Code.PUSH, [JumpType.GOTO], token);
			break;
		case 1:
			this.pushNewInsn(sequence, Instruction.Code.PUSH, [JumpType.GOSUB], token);
			break;
		default:
			throw this.error();
		}
	},
	compileUserDefFuncall: function compileUserDefFuncall(sequence) {
		var token = this.ax.tokens[this.tokensPos++];
		var argc = this.compileParenAndParameters(sequence);
		this.pushNewInsn(sequence, Instruction.Code.CALL_USERDEF_FUNC,
		                 [this.getUserDefFunc(token.code), argc], token);
	},
	compileUserDefCommand: function compileUserDefCommand(sequence) {
		var token = this.ax.tokens[this.tokensPos++];
		var argc = this.compileParameters(sequence);
		this.pushNewInsn(sequence, Instruction.Code.CALL_USERDEF_CMD,
		                 [this.getUserDefFunc(token.code), argc], token);
	},
	getUserDefFunc: function getUserDefFunc(finfoId) {
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
	compileFuncall: function compileFuncall(sequence) {
		var token = this.ax.tokens[this.tokensPos++];
		var argc = this.compileParenAndParameters(sequence);
		this.pushNewInsn(sequence, Instruction.Code.CALL_BUILTIN_FUNC,
		                 [token.type, token.code, argc], token);
	},
	compileParenAndParameters: function compileParenAndParameters(sequence) {
		var paren_token = this.ax.tokens[this.tokensPos++];
		if(!(paren_token && paren_token.type == Token.Type.MARK && paren_token.code == 40)) {
			throw this.error('関数名の後ろに開き括弧がありません。', paren_token);
		}
		var argc = this.compileParameters(sequence);
		paren_token = this.ax.tokens[this.tokensPos++];
		if(!(paren_token && paren_token.type == Token.Type.MARK && paren_token.code == 41)) {
			throw this.error('関数パラメータの後ろに閉じ括弧がありません。', paren_token);
		}
		return argc;
	},
	compileVariable: function compileVariable(sequence) {
		switch(this.ax.tokens[this.tokensPos].type) {
		case Token.Type.VAR:
			this.compileStaticVariable(sequence);
			return;
		case Token.Type.STRUCT:
			if(this.compileProxyVariable(sequence)) return;
		}
		throw this.error('変数が指定されていません');
	},
	compileStaticVariable: function compileStaticVariable(sequence) {
		var token = this.ax.tokens[this.tokensPos++];
		var argc = this.compileVariableSubscript(sequence);
		this.pushNewInsn(sequence, Instruction.Code.PUSH_VAR,
		                 [token.code, argc], token);
	},
	compileProxyVariable: function compileProxyVariable(sequence) {
		var token = this.ax.tokens[this.tokensPos++];
		if(token.code == -1) {
			this.pushNewInsn(sequence, Instruction.Code.THISMOD, [], token);
			if(this.ax.tokens[this.tokensPos].type == Token.Type.MARK && this.ax.tokens[this.tokensPos].code == 40) {
				throw this.error('thismod に添字を指定しています');
			}
			return true;
		}
		var prmInfo = this.ax.prmsInfo[token.code];
		var funcInfo = this.ax.funcsInfo[this.getFinfoIdByMinfoId(token.code)];
		if(prmInfo.subid >= 0) {
			var argc = this.compileVariableSubscript(sequence);
			this.pushNewInsn(sequence, Instruction.Code.PUSH_MEMBER,
				             [token.code - funcInfo.prmindex - 1, argc], token);
			return true;
		}
		switch(prmInfo.mptype) {
		case MPType.LOCALVAR:
		case MPType.ARRAYVAR:
			var argc = this.compileVariableSubscript(sequence);
			this.pushNewInsn(sequence, Instruction.Code.PUSH_ARG_VAR,
				             [token.code - funcInfo.prmindex, argc], token);
			return true;
		case MPType.SINGLEVAR:
			this.pushNewInsn(sequence, Instruction.Code.GETARG,
				             [token.code - funcInfo.prmindex], token);
			if(this.ax.tokens[this.tokensPos].type == Token.Type.MARK && this.ax.tokens[this.tokensPos].code == 40) {
				throw this.error('パラメータタイプ var の変数に添字を指定しています');
			}
			return true;
		default:
			return false;
		}
	},
	compileVariableSubscript: function compileVariableSubscript(sequence) {
		var argc = 0;
		var paren_token = this.ax.tokens[this.tokensPos];
		if(paren_token && paren_token.type == Token.Type.MARK && paren_token.code == 40) {
			this.tokensPos ++;
			argc = this.compileParameters(sequence);
			if(argc == 0) {
				throw this.error('配列変数の添字が空です', paren_token);
			}
			paren_token = this.ax.tokens[this.tokensPos++];
			if(!(paren_token && paren_token.type == Token.Type.MARK && paren_token.code == 41)) {
				throw this.error('配列変数の添字の後ろに閉じ括弧がありません。', paren_token);
			}
		}
		return argc;
	}
};

if(typeof HSPonJS != 'undefined') {
	HSPonJS.Compiler = Compiler;
	HSPonJS.CompileError = CompileError;
}

