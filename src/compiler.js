function Compiler(ax) {
	this.ax = ax;
	this.tokensPos = 0;
	this.labels = new Array(ax.labels.length); // HSP のラベルIDに対応したラベル
	for(var i = 0; i < ax.labels.length; i ++) {
		this.labels[i] = new Label;
	}
	this.ifLabels = {};
}

function CompileError(message) {
	this.message = message;
}
CompileError.prototype = new Error;
CompileError.prototype.name = 'CompileError';

Compiler.prototype = {
	compile: function compile() {
		var sequence = [];
		while(this.tokensPos < this.ax.tokens.length) {
			var token = this.ax.tokens[this.tokensPos];
			if(!token.ex1) {
				throw new CompileError();
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
			//case Token.Type.STRUCT:
				this.compileAssignment(sequence);
				break;
			case Token.Type.CMPCMD:
				this.compileCompareCommand(sequence);
				break;
			case Token.Type.PROGCMD:
				this.compileProgramCommand(sequence);
				break;
			case Token.Type.INTCMD:
			case Token.Type.EXTCMD:
			case Token.Type.MODCMD:
			case Token.Type.DLLFUNC:
			case Token.Type.DLLCTRL:
				this.compileCommand(sequence);
				break;
			default:
				throw new CompileError("命令コード " + token.type + " は解釈できません。");
			}
		}
		return sequence;
	},
	pushNewInsn: function pushNewInsn(sequence, code, opts, token) {
		token || (token = this.ax.tokens[this.tokensPos]);
		sequence.push(new Instruction(code, opts, token.fileName, token.lineNo));
	},
	compileAssignment: function compileAssignment(sequence) {
		this.compileVariable(sequence);
		var token = this.ax.tokens[this.tokensPos++];
		if(!(token && token.type == Token.Type.MARK)) {
			throw new CompileError();
		}
		if(this.ax.tokens[this.tokensPos].ex1) {
			// TODO インクリメント デクリメントの命令 inc dec を作る
			if(token.val == 0) { // インクリメント
				this.pushNewInsn(sequence, Instruction.Code.DUP, [], token);
				this.pushNewInsn(sequence, Instruction.Code.EXPANDARRAY, [], token);
				this.pushNewInsn(sequence, Instruction.Code.PUSH, [new IntValue(1)], token);
				this.pushNewInsn(sequence, Instruction.Code.ADD, [], token);
				this.pushNewInsn(sequence, Instruction.Code.SETVAR, [1], token);
				return;
			}
			if(token.val == 1) { // デクリメント
				this.pushNewInsn(sequence, Instruction.Code.DUP, [], token);
				this.pushNewInsn(sequence, Instruction.Code.EXPANDARRAY, [], token);
				this.pushNewInsn(sequence, Instruction.Code.PUSH, [new IntValue(1)], token);
				this.pushNewInsn(sequence, Instruction.Code.SUB, [], token);
				this.pushNewInsn(sequence, Instruction.Code.SETVAR, [1], token);
				return;
			}
		}
		if(token.val != 8) { // CALCCODE_EQ
			// 複合代入
			this.pushNewInsn(sequence, Instruction.Code.DUP, [], token);
			this.pushNewInsn(sequence, Instruction.Code.EXPANDARRAY, [], token);
			var argc = this.compileParameters(sequence, true);
			if(argc != 1) {
				throw new CompileError("複合代入のパラメータの数が間違っています。");
			}
			this.pushNewInsn(sequence, Instruction.Code.ADD + token.val, [], token);
			this.pushNewInsn(sequence, Instruction.Code.SETVAR, [argc], token);
			return;
		}
		var argc = this.compileParameters(sequence, true);
		if(argc == 0) {
			throw new CompileError("代入のパラメータの数が間違っています。");
		}
		this.pushNewInsn(sequence, Instruction.Code.SETVAR, [argc], token);
	},
	compileProgramCommand: function compileProgramCommand(sequence) {
		var token = this.ax.tokens[this.tokensPos];
		switch(token.code) {
		case 0x03: // break
		case 0x04: // repeat
		case 0x06: // continue
		case 0x0b: // foreach
		case 0x0c: // eachchk
			this.tokensPos ++;
			var labelToken = this.ax.tokens[this.tokensPos++];
			if(labelToken.type != Token.Type.LABEL) {
				throw new CompileError();
			}
			this.pushNewInsn(sequence, Instruction.Code.PUSH,
			                 [this.labels[labelToken.code]], labelToken);
			var argc = 1 + this.compileParameters(sequence);
			this.pushNewInsn(sequence, Instruction.Code.CALL_BUILTIN_CMD,
				             [token.type, token.code, argc], token);
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
			if(argc != 1) throw new CompileError("if の引数の数が間違っています。");
			this.pushNewInsn(sequence, Instruction.Code.IFEQ,
			                 [label], token);
		} else {
			if(argc != 0) throw new CompileError("else の引数の数が間違っています。");
			this.pushNewInsn(sequence, Instruction.Code.GOTO,
			                 [label], token);
		}
	},
	compileParameters: function compileParameters(sequence, cannotBeOmitted) {
		var argc = 0;
		if(this.ax.tokens[this.tokensPos].ex2) {
			if(cannotBeOmitted) {
				throw new CompileError('パラメータの省略はできません');
			}
			this.pushNewInsn(sequence, Instruction.Code.PUSH, [undefined]);
			argc ++;
		}
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
						throw new CompileError('パラメータの省略はできません');
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
					this.compileVariable(sequence);
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
				case Token.Type.INTFUNC:
				case Token.Type.DLLFUNC:
				case Token.Type.DLLCTRL:
					this.compileFuncall(sequence);
					break;
				default:
					throw new CompileError("命令コード " + token.type + " は解釈できません。");
				}
				token = this.ax.tokens[this.tokensPos];
				if(token && token.ex2) break;
			}
		}	
	},
	compileOperator: function compileOperator(sequence) {
		var token = this.ax.tokens[this.tokensPos];
		if(!(0 <= token.code && token.code < 16)) {
			throw new CompileError("演算子コード " + token.code + " は解釈できません。");
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
			throw new CompileError();
		}
	},
	compileFuncall: function compileFuncall(sequence) {
		var token = this.ax.tokens[this.tokensPos++];
		var paren_token = this.ax.tokens[this.tokensPos++];
		if(!(paren_token && paren_token.type == Token.Type.MARK && paren_token.code == 40)) {
			throw new CompileError('関数名の後ろに開き括弧がありません。');
		}
		var argc = this.compileParameters(sequence);
		paren_token = this.ax.tokens[this.tokensPos++];
		if(!(paren_token && paren_token.type == Token.Type.MARK && paren_token.code == 41)) {
			throw new CompileError('関数パラメータの後ろに閉じ括弧がありません。');
		}
		this.pushNewInsn(sequence, Instruction.Code.CALL_BUILTIN_FUNC,
		                 [token.type, token.code, argc], token);
	},
	compileVariable: function compileVariable(sequence) {
		var token = this.ax.tokens[this.tokensPos++];
		var paren_token = this.ax.tokens[this.tokensPos];
		var argc = 0;
		if(paren_token && paren_token.type == Token.Type.MARK && paren_token.code == 40) {
			this.tokensPos ++;
			argc = this.compileParameters(sequence);
			if(argc == 0) {
				throw new CompileError('配列変数の添字が空です');
			}
			paren_token = this.ax.tokens[this.tokensPos++];
			if(!(paren_token && paren_token.type == Token.Type.MARK && paren_token.code == 41)) {
				throw new CompileError('配列変数の添字の後ろに閉じ括弧がありません。');
			}
		}
		this.pushNewInsn(sequence, Instruction.Code.PUSH_VAR,
		                 [token.code, argc], token);
	}
};

if(typeof HSPonJS != 'undefined') {
	HSPonJS.Compiler = Compiler;
	HSPonJS.CompileError = CompileError;
}

