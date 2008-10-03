var BuiltinFuncs = [];
(function(){
	for(var i = 0; i < 18; i ++) {
		BuiltinFuncs[i] = {};
	}
})();


function LoopData(cnt, end, pc) {
	this.cnt = cnt;
	this.end = end;
	this.pc = pc;
}

function Frame(pc) {
	this.pc = pc;
}

BuiltinFuncs[Token.Type.PROGCMD] = {
	0x00: function goto_(label) {
		this.scanArgs(arguments, 'l');
		this.pc = label.toValue().pos - 1;
	},
	0x01: function gosub(label) {
		this.scanArgs(arguments, 'l');
		this.subroutineJump(label.toValue());
	},
	0x02: function return_(val) {
		this.scanArgs(arguments, '.?');
		if(this.frameStack.length == 0) {
			throw new HSPError(ErrorCode.RETURN_WITHOUT_GOSUB);
		}
		var frame = this.frameStack.pop();
		if(val) {
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
	},
	0x03: function break_(label) {
		this.scanArgs(arguments, 'l');
		if(this.loopStack.length == 0) {
			throw new HSPError(ErrorCode.LOOP_WITHOUT_REPEAT);
		}
		this.loopStack.pop();
		this.pc = label.toValue().pos - 1;
	},
	0x04: function repeat(label, times, begin) {
		this.scanArgs(arguments, 'lNN');
		if(this.loopStack.length >= 31) {
			throw new HSPError(ErrorCode.TOO_MANY_NEST);
		}
		var end = times ? times.toIntValue()._value : Infinity;
		if(end == 0) {
			this.pc = label.toValue().pos - 1;
			return;
		}
		if(end < 0) end = Infinity;
		begin = begin ? begin.toIntValue()._value : 0;
		end += begin;
		this.loopStack.push(new LoopData(begin, end, this.pc + 1));
	},
	0x05: function loop() {
		this.scanArgs(arguments, '');
		if(this.loopStack.length == 0) {
			throw new HSPError(ErrorCode.LOOP_WITHOUT_REPEAT);
		}
		var data = this.loopStack[this.loopStack.length - 1];
		data.cnt ++;
		if(data.cnt >= data.end) {
			this.loopStack.pop();
			return;
		}
		this.pc = data.pc - 1;
	},
	0x06: function continue_(label, newCnt) {
		this.scanArgs(arguments, 'lN');
		if(this.loopStack.length == 0) {
			throw new HSPError(ErrorCode.LOOP_WITHOUT_REPEAT);
		}
		var data = this.loopStack[this.loopStack.length - 1];
		newCnt = newCnt ? newCnt.toIntValue()._value : data.cnt + 1;
		data.cnt = newCnt;
		if(data.cnt >= data.end) {
			this.loopStack.pop();
			this.pc = label.toValue().pos - 1;
			return;
		}
		this.pc = data.pc - 1;
	},
	0x07: function wait(n) {
		this.scanArgs(arguments, 'N');
		var msec = (n ? n.toIntValue()._value : 100) * 10;
		this.pc ++;
		throw new WaitException(msec);
	},
	0x09: function dim(v, l0, l1, l2, l3) {
		this.scanArgs(arguments, 'aNNNN');
		l0 = l0 ? l0.toIntValue()._value : 0;
		l1 = l1 ? l1.toIntValue()._value : 0;
		l2 = l2 ? l2.toIntValue()._value : 0;
		l3 = l3 ? l3.toIntValue()._value : 0;
		v.variable.dim(VarType.INT, l0, l1, l2, l3);
	},
	0x0a: function sdim(v, strLength, l0, l1, l2, l3) {
		this.scanArgs(arguments, 'aNNNNN');
		strLength = strLength ? strLength.toIntValue()._value : 64;
		l0 = l0 ? l0.toIntValue()._value : 0;
		l1 = l1 ? l1.toIntValue()._value : 0;
		l2 = l2 ? l2.toIntValue()._value : 0;
		l3 = l3 ? l3.toIntValue()._value : 0;
		var ary = new StrArray();
		ary.strDim(strLength, l0, l1, l2, l3);
		v.variable.value = ary;
	},
	0x0b: function foreach(label) {
		this.scanArgs(arguments, 'l');
		if(this.loopStack.length >= 31) {
			throw new HSPError(ErrorCode.TOO_MANY_NEST);
		}
		this.loopStack.push(new LoopData(0, Infinity, this.pc + 1));
	},
	0x0c: function eachchk(label, v) {
		this.scanArgs(arguments, 'la');
		if(this.loopStack.length == 0) {
			throw new HSPError(ErrorCode.LOOP_WITHOUT_REPEAT);
		}
		label = label.toValue();
		var data = this.loopStack[this.loopStack.length - 1];
		if(data.cnt >= v.variable.getL0()) {
			this.loopStack.pop();
			this.pc = label.pos - 1;
			return;
		}
		if(v.variable.at([data.cnt]).isUsing() == false) { // label 型 や struct 型の empty を飛ばす
			data.cnt ++;
			if(data.cnt >= data.end) {
				this.loopStack.pop();
				this.pc = label.pos - 1;
				return;
			}
			this.pc = data.pc - 1;
		}
	},
	0x0d: function dimtype(v, type, l0, l1, l2, l3) {
		this.scanArgs(arguments, 'anNNNN');
		type = type.toIntValue()._value;
		l0 = l0 ? l0.toIntValue()._value : 0;
		l1 = l1 ? l1.toIntValue()._value : 0;
		l2 = l2 ? l2.toIntValue()._value : 0;
		l3 = l3 ? l3.toIntValue()._value : 0;
		v.variable.dim(type, l0, l1, l2, l3);
	},
	0x11: function stop() {
		this.scanArgs(arguments, '');
		throw new StopException;
	},
	0x16: function mref(v, id) {
		this.scanArgs(arguments, 'aN');
		id = id ? id.toIntValue()._value : 0;
		switch(id) {
		case 64:
			v.variable.value = this.stat;
			break;
		case 65:
			v.variable.value = this.refstr;
			break;
		default:
			throw new HSPError(ErrorCode.UNSUPPORTED_FUNCTION);
		}
	},
	0x18: function exgoto(v, mode, b, label) {
		this.scanArgs(arguments, 'vnnl');
		this.scanArg(v, 'i');
		var a = v.toIntValue()._value;
		mode = mode.toIntValue()._value;
		b = b.toIntValue()._value;
		label = label.toValue();
		if(mode >= 0) {
			if(a >= b) {
				this.pc = label.pos - 1;
			}
		} else {
			if(a <= b) {
				this.pc = label.pos - 1;
			}
		}
	},
	0x19: function on(n, jumpType) {
		this.scanArgs(arguments, 'Njl*');
		n = n ? n.toIntValue()._value : 0;
		if(!(0 <= n && n < arguments.length - 2)) {
			return;
		}
		var label = arguments[n + 2].toValue();
		if(jumpType == JumpType.GOTO) {
			this.pc = label.pos - 1;
		} else {
			this.subroutineJump(label);
		}
	}
};

BuiltinFuncs[Token.Type.SYSVAR] = {
	0x00: function system() {
		return new IntValue(0);
	},
	0x03: function stat() {
		return this.stat.at(0);
	},
	0x04: function cnt() {
		if(this.loopStack.length == 0) {
			return new IntValue(0);
		}
		return new IntValue(this.loopStack[this.loopStack.length - 1].cnt);
	},
	0x06: function strsize() {
		return this.strsize;
	},
	0x07: function looplev() {
		return new IntValue(this.loopStack.length);
	},
	0x08: function sublev() {
		return new IntValue(this.frameStack.length);
	},
	0x0c: function refstr() {
		return this.refstr.at(0);
	},
	0x0d: function refdval() {
		return this.refdval.at(0);
	}
};

BuiltinFuncs[Token.Type.INTCMD] = {
	0x11: function exist(path) {
		this.scanArgs(arguments, 's');
		path = path.toStrValue()._value;
		throw new FileReadException(
			path,
			function(data) { this.strsize = new IntValue(data.length); },
			function() { this.strsize = new IntValue(-1); });
	},
	0x16: function bload(path, v) {
		this.scanArgs(arguments, 'sv');
		path = path.toStrValue()._value;
		throw new FileReadException(
			path,
			function(data) {
				var size = v.getByteSize();
				v.setbytes(0, CP932.encode(data).substr(0, size));
			},
			function() {
				throw new HSPError(ErrorCode.FILE_IO);
			});
	},
	0x1a: function poke(v, offset, val) {
		this.scanArgs(arguments, 'vNN');
		offset = offset ? offset.toIntValue()._value : 0;
		val = val ? val.toIntValue()._value : 0;
		v.setbyte(offset, val);
	},
	0x1b: function wpoke(v, offset, val) {
		this.scanArgs(arguments, 'vNN');
		offset = offset ? offset.toIntValue()._value : 0;
		val = val ? val.toIntValue()._value : 0;
		v.setbyte(offset, val);
		v.setbyte(offset + 1, val >> 8);
	},
	0x1c: function lpoke(v, offset, val) {
		this.scanArgs(arguments, 'vNN');
		offset = offset ? offset.toIntValue()._value : 0;
		val = val ? val.toIntValue()._value : 0;
		v.setbyte(offset, val);
		v.setbyte(offset + 1, val >> 8);
		v.setbyte(offset + 2, val >> 16);
		v.setbyte(offset + 3, val >> 24);
	},
	0x20: function memcpy(destVar, srcVar, length, destOffset, srcOffset) {
		this.scanArgs(arguments, 'vvNNN');
		length = length ? length.toIntValue()._value : 0;
		destOffset = destOffset ? destOffset.toIntValue()._value : 0;
		srcOffset = srcOffset ? srcOffset.toIntValue()._value : 0;
		destVar.setbytes(destOffset, srcVar.getbytes(srcOffset, length));
	},
	0x21: function memset(v, val, length, offset) {
		this.scanArgs(arguments, 'vNNN');
		val = val ? val.toIntValue()._value : 0;
		length = length ? length.toIntValue()._value : 0;
		offset = offset ? offset.toIntValue()._value : 0;
		v.setbytes(offset, Utils.strTimes(String.fromCharCode(val), length));
	},
	0x27: function randomize(seed) {
		this.scanArgs(arguments, 'N');
		this.random.srand(seed ? seed.toIntValue()._value : +new Date);
	}
};

BuiltinFuncs[Token.Type.INTFUNC] = {
	0x000: function int_(val) {
		this.scanArgs(arguments, '.');
		return val.toIntValue();
	},
	0x001: function rnd(n) {
		this.scanArgs(arguments, 'n');
		n = n.toIntValue()._value;
		if(n == 0) {
			throw new HSPError(ErrorCode.DIVIDED_BY_ZERO);
		}
		return new IntValue(this.random.rand() % n);
	},
	0x002: function strlen(s) {
		this.scanArgs(arguments, 's');
		return new IntValue(s.toStrValue()._value.length);
	},
	0x003: function length(v) {
		this.scanArgs(arguments, 'a');
		return new IntValue(v.variable.getL0());
	},
	0x004: function length2(v) {
		this.scanArgs(arguments, 'a');
		return new IntValue(v.variable.getL1());
	},
	0x005: function length3(v) {
		this.scanArgs(arguments, 'a');
		return new IntValue(v.variable.getL2());
	},
	0x006: function length4(v) {
		this.scanArgs(arguments, 'a');
		return new IntValue(v.variable.getL3());
	},
	0x007: function vartype(v) {
		this.scanArgs(arguments, '.');
		if(v instanceof VariableAgent) {
			this.scanArgs(arguments, 'v');
			return new IntValue(v.variable.getType());
		}
		this.scanArgs(arguments, 's');
		var name = v.toStrValue()._value;
		for(var i = 0; i < VarTypeNames.length; i ++) {
			if(name == VarTypeNames[i]) {
				return new IntValue(i);
			}
		}
		throw new HSPError(ErrorCode.ILLEGAL_FUNCTION, '指定された名前の変数型は存在しません');
	},
	0x008: function gettime(n) {
		this.scanArgs(arguments, 'n');
		var date = new Date;
		switch(n.toIntValue()._value) {
		case -1:
			// DLL 関数呼び出しエミュレートを実装して timeGetTime が使えるようになるまでのつなぎ
			return new DoubleValue(+date);
		case 0:
			return new IntValue(date.getFullYear());
		case 1:
			return new IntValue(date.getMonth() + 1);
		case 2:
			return new IntValue(date.getDay());
		case 3:
			return new IntValue(date.getDate());
		case 4:
			return new IntValue(date.getHours());
		case 5:
			return new IntValue(date.getMinutes());
		case 6:
			return new IntValue(date.getSeconds());
		case 7:
			return new IntValue(date.getMilliseconds());
		default:
			throw new HSPError(ErrorCode.ILLEGAL_FUNCTION);
		}
	},
	0x009: function peek(v, n) {
		this.scanArgs(arguments, 'vN');
		n = n ? n.toIntValue()._value : 0;
		if(n < 0) {
			throw new HSPError(ErrorCode.ILLEGAL_FUNCTION);
		}
		return new IntValue(v.getbyte(n));
	},
	0x00a: function wpeek(v, n) {
		this.scanArgs(arguments, 'vN');
		n = n ? n.toIntValue()._value : 0;
		if(n < 0) {
			throw new HSPError(ErrorCode.ILLEGAL_FUNCTION);
		}
		return new IntValue(v.getbyte(n) | v.getbyte(n + 1) << 8);
	},
	0x00b: function lpeek(v, n) {
		this.scanArgs(arguments, 'vN');
		n = n ? n.toIntValue()._value : 0;
		if(n < 0) {
			throw new HSPError(ErrorCode.ILLEGAL_FUNCTION);
		}
		return new IntValue(v.getbyte(n) | v.getbyte(n + 1) << 8 | v.getbyte(n + 2) << 16 | v.getbyte(n + 3) << 24);
	},
	0x00d: function varuse(v) {
		this.scanArgs(arguments, 'v');
		var using = v.isUsing();
		if(using == null) {
			throw new HSPError(ErrorCode.TYPE_MISMATCH, VarTypeNames[v.getType()] + ' 型は varuse をサポートしていません');
		}
		return new IntValue(using);
	},
	0x00f: function instr(str, fromIndex, pattern) {
		this.scanArgs(arguments, 'sNs');
		fromIndex = fromIndex ? fromIndex.toIntValue()._value : 0;
		pattern = pattern.toStrValue()._value;
		var index = str.toStrValue().indexOf(pattern, fromIndex);
		if(index >= 0) index -= fromIndex;
		return new IntValue(index);
	},
	0x010: function abs(val) {
		this.scanArgs(arguments, 'n');
		return new IntValue(Math.abs(val.toIntValue()._value));
	},
	0x011: function limit(val, min, max) {
		this.scanArgs(arguments, 'nnn');
		val = val.toIntValue()._value;
		min = min.toIntValue()._value;
		max = max.toIntValue()._value;
		return new IntValue(Math.min(Math.max(min, val), max));
	},
	0x100: function str(val, base) {
		this.scanArgs(arguments, '.N');
		if(base) {
			// 16 進数の変換用。strf を実装するまでのつなぎ
			val = val.toIntValue()._value;
			base = base.toIntValue()._value;
			if(val < 0) val += 0x100000000;
			return new StrValue(val.toString(base));
		}
		return val.toStrValue();
	},
	0x101: function strmid(str, index, length) {
		this.scanArgs(arguments, 'snn');
		str = str.toStrValue()._value;
		index = index.toIntValue()._value;
		length = length.toIntValue()._value;
		if(index < 0) {
			index = str.length - length;
			if(index < 0) index = 0;
		}
		return new StrValue(str.substr(index, length));
	},
	0x180: function sin(val) {
		this.scanArgs(arguments, 'n');
		return new DoubleValue(Math.sin(val.toDoubleValue()._value));
	},
	0x181: function cos(val) {
		this.scanArgs(arguments, 'n');
		return new DoubleValue(Math.cos(val.toDoubleValue()._value));
	},
	0x182: function tan(val) {
		this.scanArgs(arguments, 'n');
		return new DoubleValue(Math.tan(val.toDoubleValue()._value));
	},
	0x183: function atan(y, x) {
		this.scanArgs(arguments, 'nN');
		y = y.toDoubleValue()._value;
		x = x ? x.toDoubleValue()._value : 1.0;
		return new DoubleValue(Math.atan2(y, x));
	},
	0x184: function sqrt(val) {
		this.scanArgs(arguments, 'n');
		return new DoubleValue(Math.sqrt(val.toDoubleValue()._value));
	},
	0x185: function double_(val) {
		this.scanArgs(arguments, '.');
		return val.toDoubleValue();
	},
	0x186: function absf(val) {
		this.scanArgs(arguments, 'n');
		return new DoubleValue(Math.abs(val.toDoubleValue()._value));
	},
	0x187: function expf(val) {
		this.scanArgs(arguments, 'n');
		return new DoubleValue(Math.exp(val.toDoubleValue()._value));
	},
	0x188: function logf(val) {
		this.scanArgs(arguments, 'n');
		return new DoubleValue(Math.log(val.toDoubleValue()._value));
	},
	0x189: function limitf(val, min, max) {
		this.scanArgs(arguments, 'nnn');
		val = val.toDoubleValue()._value;
		min = min.toDoubleValue()._value;
		max = max.toDoubleValue()._value;
		return new DoubleValue(Math.min(Math.max(min, val), max));
	}
};

if(typeof HSPonJS != 'undefined') {
	HSPonJS.BuiltinFuncs = BuiltinFuncs;
}


