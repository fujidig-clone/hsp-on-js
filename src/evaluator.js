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
	evaluate: function evaluate() {
		try {
			while(true) {
				var insn = this.sequence[this.pc];
				this.dispatch(insn);
			}
		} catch(e) {
			if(!(e instanceof HSPException)) {
				throw e;
			}
			this.disposeException(e);
		}
	},
	resume: function resume(callback) {
		try {
			if(callback) callback();
			this.pc ++;
			while(true) {
				var insn = this.sequence[this.pc];
				this.dispatch(insn);
			}
		} catch(e) {
			if(!(e instanceof HSPException)) {
				throw e;
			}
			this.disposeException(e);
		}
	},
	dispatch: function dispatch(insn) {
		var lhs, rhs;
		switch(insn.code) {
		case Instruction.Code.NOP:
			break;
		case Instruction.Code.PUSH:
			this.stack.push(insn.opts[0]);
			break;
		case Instruction.Code.PUSH_VAR:
			var varId = insn.opts[0];
			var argc = insn.opts[1];
			var indices = this.popIndices(argc);
			this.stack.push(new VariableAgent(this.variables[varId], indices));
			break;
		case Instruction.Code.POP:
			this.stack.pop();
			break;
		case Instruction.Code.DUP:
			this.stack.push(this.stack[this.stack.length-1]);
			break;
		case Instruction.Code.ADD:
			rhs = this.stack.pop(), lhs = this.stack.pop();
			this.stack.push(lhs.add(rhs));
			break;
		case Instruction.Code.SUB:
			rhs = this.stack.pop(), lhs = this.stack.pop();
			this.stack.push(lhs.sub(rhs));
			break;
		case Instruction.Code.MUL:
			rhs = this.stack.pop(), lhs = this.stack.pop();
			this.stack.push(lhs.mul(rhs));
			break;
		case Instruction.Code.DIV:
			rhs = this.stack.pop(), lhs = this.stack.pop();
			this.stack.push(lhs.div(rhs));
			break;
		case Instruction.Code.MOD:
			rhs = this.stack.pop(), lhs = this.stack.pop();
			this.stack.push(lhs.mod(rhs));
			break;
		case Instruction.Code.AND:
			rhs = this.stack.pop(), lhs = this.stack.pop();
			this.stack.push(lhs.and(rhs));
			break;
		case Instruction.Code.OR:
			rhs = this.stack.pop(), lhs = this.stack.pop();
			this.stack.push(lhs.or(rhs));
			break;
		case Instruction.Code.XOR:
			rhs = this.stack.pop(), lhs = this.stack.pop();
			this.stack.push(lhs.xor(rhs));
			break;
		case Instruction.Code.EQ:
			rhs = this.stack.pop(), lhs = this.stack.pop();
			this.stack.push(lhs.eq(rhs));
			break;
		case Instruction.Code.NE:
			rhs = this.stack.pop(), lhs = this.stack.pop();
			this.stack.push(lhs.ne(rhs));
			break;
		case Instruction.Code.GT:
			rhs = this.stack.pop(), lhs = this.stack.pop();
			this.stack.push(lhs.gt(rhs));
			break;
		case Instruction.Code.LT:
			rhs = this.stack.pop(), lhs = this.stack.pop();
			this.stack.push(lhs.lt(rhs));
			break;
		case Instruction.Code.GTEQ:
			rhs = this.stack.pop(), lhs = this.stack.pop();
			this.stack.push(lhs.gteq(rhs));
			break;
		case Instruction.Code.LTEQ:
			rhs = this.stack.pop(), lhs = this.stack.pop();
			this.stack.push(lhs.lteq(rhs));
			break;
		case Instruction.Code.RSH:
			rhs = this.stack.pop(), lhs = this.stack.pop();
			this.stack.push(lhs.rsh(rhs));
			break;
		case Instruction.Code.LSH:
			rhs = this.stack.pop(), lhs = this.stack.pop();
			this.stack.push(lhs.lsh(rhs));
			break;
		case Instruction.Code.GOTO:
			this.pc = insn.opts[0].pos;
			return;
		case Instruction.Code.IFNE:
			if(this.stack.pop().toIntValue()._value) {
				this.pc = insn.opts[0].pos;
				return;
			}
			break;
		case Instruction.Code.IFEQ:
			if(!this.stack.pop().toIntValue()._value) {
				this.pc = insn.opts[0].pos;
				return;
			}
			break;
		case Instruction.Code.SETVAR:
			var argc = insn.opts[0];
			var args = Utils.aryPopN(this.stack, argc);
			var agent = this.stack.pop();
			var variable = agent.variable;
			var indices = agent.indices.slice();
			variable.assign(indices, args[0]);
			if(indices.length == 0) indices[0] = 0;
			indices[0] ++;
			for(var i = 1; i < argc; i ++) {
				variable.assign(indices, args[i]);
				indices[0] ++;
			}
			break;
		case Instruction.Code.EXPANDARRAY:
			var agent = this.stack[this.stack.length - 1];
			agent.variable.expand(agent.indices);
			break;
		case Instruction.Code.INC:
			var agent = this.stack.pop();
			agent.variable.expand(agent.indices);
			agent.assign(agent.add(new IntValue(1)));
			break;
		case Instruction.Code.DEC:
			var agent = this.stack.pop();
			agent.variable.expand(agent.indices);
			agent.assign(agent.sub(new IntValue(1)));
			break;
		case Instruction.Code.CALL_BUILTIN_CMD:
			this.callBuiltinFunc(insn);
			break;
		case Instruction.Code.CALL_BUILTIN_FUNC:
			this.stack.push(this.callBuiltinFunc(insn));
			break;
		case Instruction.Code.CALL_USERDEF_CMD:
		case Instruction.Code.CALL_USERDEF_FUNC:
			var userDefFunc = insn.opts[0];
			var argc = insn.opts[1];
			var args = Utils.aryPopN(this.stack, argc);
			this.callUserDefFunc(userDefFunc, args);
			break;
		case Instruction.Code.GETARG:
			var argNum = insn.opts[0];
			this.stack.push(this.getArg(argNum));
			break;
		case Instruction.Code.PUSH_ARG_VAR:
			var argNum = insn.opts[0];
			var argc = insn.opts[1];
			var variable = this.getArg(argNum);
			var indices = this.popIndices(argc);
			this.stack.push(new VariableAgent(variable, indices));
			break;
		case Instruction.Code.PUSH_MEMBER:
			var memberNum = insn.opts[0];
			var argc = insn.opts[1];
			var struct = this.getThismod().toValue();
			var indices = this.popIndices(argc);
			this.stack.push(new VariableAgent(struct.members[memberNum], indices));
			break;
		case Instruction.Code.THISMOD:
			this.stack.push(this.getThismod());
			break;
		case Instruction.Code.NEWMOD:
			var module = insn.opts[0];
			var argc = insn.opts[1];
			var args = Utils.aryPopN(this.stack, argc);
			var agent = args[0];
			this.scanArg(agent, 'a', false);
			if(agent.getType() != VarType.STRUCT) {
				agent.variable.dim(VarType.STRUCT, 1, 0, 0, 0);
			}
			var array = agent.variable.value;
			var offset = array.newmod(module);
			if(module.constructor) {
				args[0] = new VariableAgent(agent.variable, [offset]);
				this.callUserDefFunc(module.constructor, args);
			} else if(args.length > 1) {
				throw new HSPError(ErrorCode.TOO_MANY_PARAMETERS);
			}
			break;
		case Instruction.Code.RETURN:
			var val = insn.opts[0] ? this.stack.pop() : undefined;
			if(this.frameStack.length == 0) {
				throw new HSPError(ErrorCode.RETURN_WITHOUT_GOSUB);
			}
			var frame = this.frameStack.pop();
			if(frame.userDefFunc && frame.userDefFunc.isCType) {
				if(!val) throw new HSPError(ErrorCode.NORETVAL);
				this.stack.push(val.toValue());
			} else if(val) {
				switch(val.getType()) {
				case VarType.STR:
					this.refstr.assign(0, val.toStrValue());
					break;
				case VarType.DOUBLE:
					this.refdval.assign(0, val.toDoubleValue());
					break;
				case VarType.INT:
					this.stat.assign(0, val.toIntValue());
					break;
				default:
					throw new HSPError(ErrorCode.TYPE_MISMATCH);
				}
			}
			this.pc = frame.pc - 1;
			var runCallback = function() {
				if(frame.callback) {
					var fn = frame.callback();
					while(fn) {
						fn = fn();
					}
				}
			};
			if(frame.userDefFunc) {
				this.deleteLocalVars(frame.userDefFunc.paramTypes, frame.args, runCallback);
			} else {
				runCallback();
			}
			break;
		case Instruction.Code.DELMOD:
			var v = this.stack.pop();
			this.scanArg(v, 'v', false);
			if(v.getType() != VarType.STRUCT) {
				throw new HSPError(ErrorCode.TYPE_MISMATCH);
			}
			this.deleteStruct(v);
			break;
		default:
			throw new Error("未対応の命令コード: "+insn.code);
		}
		this.pc ++;
	},
	callBuiltinFunc: function callBuiltinFunc(insn) {
		var type = insn.opts[0];
		var subid = insn.opts[1];
		var argc = insn.opts[2];
		var func = BuiltinFuncs[type][subid];
		if(!func) {
			var name = this.getBuiltinFuncName(insn);
			if(name) {
				throw new HSPError(ErrorCode.UNSUPPORTED_FUNCTION, name + ' はサポートされていません');
			} else {
				throw new HSPError(ErrorCode.UNSUPPORTED_FUNCTION);
			}
		}
		var args = Utils.aryPopN(this.stack, argc);
		return func.apply(this, args);
	},
	callUserDefFunc: function callUserDefFunc(userDefFunc, origArgs, callback) {
		var args = [];
		var origArgsCount = 0;
		for(var i = 0; i < userDefFunc.paramTypes.length; i ++) {
			var mptype = userDefFunc.paramTypes[i];
			var arg = origArgs[origArgsCount];
			switch(mptype) {
			case MPType.DNUM:
				this.scanArg(arg, 'n', false);
				args.push(arg.toDoubleValue());
				origArgsCount ++;
				break;
			case MPType.INUM:
				this.scanArg(arg, 'n', true);
				args.push(arg ? arg.toIntValue() : new IntValue(0));
				origArgsCount ++;
				break;
			case MPType.LOCALVAR:
				args.push(new Variable);
				break;
			case MPType.ARRAYVAR:
				this.scanArg(arg, 'v', false);
				args.push(arg.variable);
				origArgsCount ++;
				break;
			case MPType.SINGLEVAR:
				this.scanArg(arg, 'v', false);
				args.push(arg);
				origArgsCount ++;
				break;
			case MPType.LOCALSTRING:
				this.scanArg(arg, 's', false);
				args.push(arg.toStrValue());
				origArgsCount ++;
				break;
			case MPType.MODULEVAR:
			case MPType.IMODULEVAR:
			case MPType.TMODULEVAR:
				this.scanArg(arg, 'v', false);
				args.push(new ModVarData(arg.variable, arg.indices));
				origArgsCount ++;
				break;
			default:
				throw new HSPError(ErrorCode.INVALID_STRUCT_SOURCE);
			}
		}
		if(origArgsCount < origArgs.length) {
			throw new HSPError(ErrorCode.TOO_MANY_PARAMETERS);
		}
		if(this.frameStack.length >= 256) {
			throw new HSPError(ErrorCode.STACK_OVERFLOW);
		}
		this.frameStack.push(new Frame(this.pc + 1, userDefFunc, args, callback));
		this.pc = userDefFunc.label.pos - 1;
	},
	subroutineJump: function subroutineJump(label) {
		if(this.frameStack.length >= 256) {
			throw new HSPError(ErrorCode.STACK_OVERFLOW);
		}
		this.frameStack.push(new Frame(this.pc + 1, null, null));
		this.pc = label.pos - 1;
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
		return this.note;
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
	deleteStruct: function deleteStruct(agent, callback) {
		var fn = this.deleteStruct0(agent, callback);
		while(fn) {
			fn = fn();
		}
	},
	deleteAllStruct: function deleteAllStruct(variable, callback) {
		var fn = this.deleteAllStruct0(variable, callback);
		while(fn) {
			fn = fn();
		}
	},
	deleteStruct0: function deleteStruct0(agent, callback) {
		this.deleteStructRecursionLevel = 0;
		var struct = agent.toValue();
		var self = this;
		if(struct.isUsing() != 1) {
			if(callback) return callback();
			return null;
		}
		var myCallback = function() {
			var i = 0;
			return (function() {
				if(++self.deleteStructRecursionLevel >= 128) {
					self.deleteStructRecursionLevel = 0;
					return arguments.callee;
				}
				while(i < struct.members.length) {
					var member = struct.members[i];
					i ++;
					if(member.getType() == VarType.STRUCT) {
						return self.deleteAllStruct0(member, arguments.callee);
					}
				}
				agent.assign(StructValue.EMPTY);
				if(callback) return callback();
				return null;
			})();
		}
		if(struct.module.destructor) {
			this.callUserDefFunc(struct.module.destructor, [agent], myCallback);
			return null;
		} else {
			return myCallback;
		}
	},
	deleteAllStruct0: function deleteAllStruct0(variable, callback) {
		var i = 0;
		var self = this;
		return (function() {
			while(i < variable.getL0()) {
				var agent = new VariableAgent(variable, [i]);
				i ++;
				if(agent.isUsing() == 1) {
					return self.deleteStruct0(agent, arguments.callee);
				}
			}
			return callback();
		})();
	},
	deleteLocalVars: function deleteLocalVars(paramTypes, args, callback) {
		var i = 0;
		var self = this;
		(function() {
			while(i < args.length) {
				var paramType = paramTypes[i];
				var arg = args[i];
				i ++;
				if(paramType == MPType.LOCALVAR && arg.getType() == VarType.STRUCT) {
					self.deleteAllStruct(arg, arguments.callee);
					return;
				}
			}
			callback();
			return;
		})();
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
				return;
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
	}
};

if(typeof HSPonJS != 'undefined') {
	HSPonJS.Evaluator = Evaluator;
	HSPonJS.LoopData = LoopData;
	HSPonJS.Frame = Frame;
}


