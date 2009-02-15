function Evaluator(sequence, generateResult, options) {
	this.options = Utils.objectMerge(options, Evaluator.defaultOptions);
	this.stack = [];
	this.pc = 0;
	this.sequence = sequence;
	this.mainLoop = generateResult.mainLoop;
	this.literals = generateResult.literals;
	this.staticVarTags = generateResult.staticVarTags;
	this.registeredObjects = generateResult.registeredObjects;
	this.variables = null;
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
	this.startTime = 0;
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

function _assert(cond) {
	if(!cond) throw new Error('assertion fault');
}

_assert(VarType.LABEL === 1);
_assert(VarType.STR === 2);
_assert(VarType.DOUBLE === 3);
_assert(VarType.INT === 4);

function checkTypeInt(val) {
	if(val.getType() != 4) { // VarType.INT
		throw typeMismatchError(val.getType(), 4);
	}
	return val;
}

function checkTypeDouble(val) {
	if(val.getType() != 3) { // VarType.DOUBLE
		throw typeMismatchError(val.getType(), 3);
	}
	return val;
}

function checkTypeNumber(val) {
	var type = val.getType();
	if(type != 4 && // VarType.INT
	   type != 3) { // VarType.DOUBLE
		throw typeMismatchErrorIntOrDouble(type);
	}
	return val;
}

function checkTypeStr(val) {
	if(val.getType() != 2) { // VarType.STR
		throw typeMismatchError(val.getType(), 2);
	}
	return val;
}

function checkTypeLabel(val) {
	if(val.getType() != 1 || // VarType.LABEL
	   !val.isUsing()) {
		throw new HSPError(ErrorCode.LABEL_REQUIRED);
	}
	return val;
}

function scanArgs(args, format, requiredArgsCount) {
	for(var i = 0; i < format.length; i ++) {
		scanArg(args[i], format.charAt(i), i >= requiredArgsCount);
	}
	if(i < args.length) {
		throw new HSPError(ErrorCode.TOO_MANY_PARAMETERS);
	}
}

function scanArg(arg, c, isOptionalArguments) {
	if(arg == undefined) {
		if(isOptionalArguments) {
			return arg;
		} else {
			throw new HSPError(ErrorCode.NO_DEFAULT);
		}
	}
	switch(c) {
	case 'i':
		checkTypeInt(arg);
		break;
	case 'd':
		checkTypeDouble(arg);
		break;
	case 'n':
		checkTypeNumber(arg);
		break;
	case 's':
		checkTypeStr(arg);
		break;
	case 'l':
		checkTypeLabel(arg);
		break;
	case '.':
		break;
	}
	return arg;
}
function typeMismatchError(actualType, expectedType) {
	return typeMismatchError0(actualType, VarTypeNames[expectedType]+' 型');
}
function typeMismatchErrorIntOrDouble(actualType) {
	return typeMismatchError0(actualType, 'int 型か double 型');
}
function typeMismatchError0(actualType, expected) {
	return new HSPError(ErrorCode.TYPE_MISMATCH, 'パラメータの型が違います。'+VarTypeNames[actualType]+' 型ではなく、'+expected+'の値を指定しなければいけません');
}

Evaluator.prototype = {
	evaluate: function() {
		this.variables = this.buildVariables();
		this.startTime = +new Date;
		try {
			this.mainLoop();
		} catch(e) {
			this.disposeException(e);
		}
	},
	resume: function(callback) {
		try {
			if(callback) callback();
			this.pc ++;
			this.mainLoop();
		} catch(e) {
			this.disposeException(e);
		}
	},
	resumeWithEvent: function(event) {
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
			this.mainLoop();
		} catch(e) {
			this.disposeException(e);
		}
	},
	buildVariables: function() {
		var varCount = this.staticVarTags.length;
		var variables = new Array(varCount);
		for(var i = 0; i < varCount; i ++) {
			variables[i] = new Variable;
		}
		if(this.options.errorAtUseOfUninitializedVariable) {
			for(var i = 0; i < varCount; i ++) {
				variables[i].value = new UninitializedArray(this.staticVarTags[i].name);
			}
		}
		return variables;
	},
	disposeException: function(e) {
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
	onInternalError: function(e) {
		throw e;
	},
	onStop: function() {
	},
	selectNote: function(v) {
		if(this.note) {
			this.oldNotes[this.oldNotesPos] = this.note;
			this.oldNotesPos = (this.oldNotesPos + 1) % 256;
		}
		this.note = v;
	},
	undoNote: function() {
		this.oldNotesPos = (this.oldNotesPos - 1 + 256) % 256;
		this.note = this.oldNotes[this.oldNotesPos];
		this.oldNotes[this.oldNotesPos] = null;
	},
	getNote: function() {
		if(!this.note) {
			throw new HSPError(ErrorCode.ILLEGAL_FUNCTION, 'ノートパッドが選択されていません');
		}
		return this.note.getBuffer();
	},
	fileRead: function(path, success, error) {
		throw new FileReadException(path, success, error);
	},
	getArg: function(argNum) {
		var args = this.args;
		if(!args) {
			throw new HSPError(ErrorCode.INVALID_PARAMETER);
		}
		return args[argNum];
	},
	getThismod: function() {
		var thismod = this.getArg(0);
		if(!(thismod instanceof VariableAgent && thismod.getType() == VarType.STRUCT && thismod.isUsing())) {
			throw new HSPError(ErrorCode.INVALID_STRUCT_SOURCE);
		}
		return thismod;
	},
	getErrorOutput: function(e) {
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
	getBackTrace: function() {
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
	getBuiltinFuncName: function(insn) {
		if(insn.code != Insn.Code.CALL_BUILTIN_CMD &&
		   insn.code != Insn.Code.CALL_BUILTIN_FUNC) {
			return undefined;
		}
		var type = insn.opts[0];
		var subid = insn.opts[1];
		var names = BuiltinFuncNames[type];
		if(!names) return undefined;
		return names[subid];
	}
};

if(typeof HSPonJS != 'undefined') {
	HSPonJS.Evaluator = Evaluator;
	HSPonJS.LoopData = LoopData;
	HSPonJS.Frame = Frame;
	HSPonJS.Event = Event;
	HSPonJS.throwHSPError = throwHSPError;
	HSPonJS.checkTypeInt = checkTypeInt;
	HSPonJS.checkTypeDouble = checkTypeDouble;
	HSPonJS.checkTypeNumber = checkTypeNumber;
	HSPonJS.checkTypeStr = checkTypeStr;
	HSPonJS.checkTypeLabel = checkTypeLabel;
	HSPonJS.scanArgs = scanArgs;
	HSPonJS.scanArg = scanArg;
}


