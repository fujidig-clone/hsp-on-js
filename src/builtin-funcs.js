var BuiltinFuncs = [];
(function(){
	for(var i = 0; i < 18; i ++) {
		BuiltinFuncs[i] = {};
	}
})();

BuiltinFuncs[Token.Type.PROGCMD] = {
	0x07: function(n) { // wait
		this.scanArgs(arguments, 'N');
		var msec = (n ? n.toIntValue()._value : 100) * 10;
		throw new WaitException(msec);
	},
	0x08: function(n) { // await
		this.scanArgs(arguments, 'N');
		var msec = n ? n.toIntValue()._value : 0;
		if(this.lastWaitTime) {
			throw new WaitException(this.lastWaitTime + msec - new Date);
		} else {
			throw new WaitException(msec);
		}
	},
	0x09: function(v, l0, l1, l2, l3) { // dim
		this.scanArgs(arguments, 'aNNNN');
		l0 = l0 ? l0.toIntValue()._value : 0;
		l1 = l1 ? l1.toIntValue()._value : 0;
		l2 = l2 ? l2.toIntValue()._value : 0;
		l3 = l3 ? l3.toIntValue()._value : 0;
		v.variable.dim(VarType.INT, l0, l1, l2, l3);
	},
	0x0a: function(v, strLength, l0, l1, l2, l3) { // sdim
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
	0x0d: function(v, type, l0, l1, l2, l3) { // dimtype
		this.scanArgs(arguments, 'anNNNN');
		type = type.toIntValue()._value;
		l0 = l0 ? l0.toIntValue()._value : 0;
		l1 = l1 ? l1.toIntValue()._value : 0;
		l2 = l2 ? l2.toIntValue()._value : 0;
		l3 = l3 ? l3.toIntValue()._value : 0;
		v.variable.dim(type, l0, l1, l2, l3);
	},
	0x0e: function(dest, src) { // dup
		this.scanArgs(arguments, 'av');
		dest.variable.value = src.ref();
	},
	0x10: function(status) { // end
		this.scanArgs(arguments, 'N');
		throw new EndException(status ? status.toIntValue()._value : 0);
	},
	0x11: function() { // stop
		this.scanArgs(arguments, '');
		throw new StopException;
	},
	0x14: function(v) { // delmod
		this.scanArgs(arguments, 'v');
		if(v.getType() != VarType.STRUCT) {
		    throw new HSPError(ErrorCode.TYPE_MISMATCH);
		}
		v.assign(StructValue.EMPTY);
	},
	0x16: function(v, id) { // mref
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
	}
};

BuiltinFuncs[Token.Type.SYSVAR] = {
	0x00: function() { // system
		return new IntValue(0);
	},
	0x03: function() { // stat
		return this.stat.at(0);
	},
	0x04: function() { // err
		return new IntValue(this.err);
	},
	0x06: function() { // strsize
		return new IntValue(this.strsize);
	},
	0x07: function() { // looplev
		return new IntValue(this.loopStack.length);
	},
	0x08: function() { // sublev
		return new IntValue(this.frameStack.length);
	},
	0x09: function() { // iparam
		return new IntValue(this.iparam);
	},
	0x0a: function() { // wparam
		return new IntValue(this.wparam);
	},
	0x0b: function() { // lparam
		return new IntValue(this.lparam);
	},
	0x0c: function() { // refstr
		return this.refstr.at(0);
	},
	0x0d: function() { // refdval
		return this.refdval.at(0);
	}
};

BuiltinFuncs[Token.Type.INTCMD] = {
	0x01: function(jumpType, val) { // onerror
		this.scanArgs(arguments, 'j.');
		if(jumpType == JumpType.GOSUB) {
			throw new HSPError(ErrorCode.UNSUPPORTED_FUNCTION);
		}
		var t = val.getType();
		switch(t) {
		case VarType.LABEL:
			this.onerrorEvent.enabled = true;
			this.onerrorEvent.pos = val.toValue().pos;
			break;
		case VarType.DOUBLE:
		case VarType.INT:
			this.onerrorEvent.enabled = val.toIntValue()._value != 0;
			break;
		default:
			throw new HSPError(ErrorCode.TYPE_MISMATCH);
		}
	},
	0x11: function(path) { // exist
		this.scanArgs(arguments, 's');
		path = path.toStrValue()._value;
		this.fileRead(path,
		              function(data) { this.strsize = data.length; },
		              function() { this.strsize = -1; });
	},
	0x16: function(path, v) { // bload
		// FIXME 第三引数のサイズ、第四引数のオフセットに対応
		this.scanArgs(arguments, 'sv');
		path = path.toStrValue()._value;
		this.fileRead(
			path,
			function(data) {
				var size = v.getByteSize();
				v.setbytes(0, CP932.encode(data).substr(0, size));
			},
			function() {
				throw new HSPError(ErrorCode.FILE_IO);
			});
	},
	0x1a: function(v, offset, val) { // poke
		this.scanArgs(arguments, 'vN.?');
		offset = offset ? offset.toIntValue()._value : 0;
		val = val ? val.toValue() : new IntValue(0);
		switch(val.getType()) {
		case VarType.INT:
			v.setbyte(offset, val._value);
			break;
		case VarType.STR:
			v.setbytes(offset, val._value + "\0");
			this.strsize = val._value.length;
			break;
		default:
			throw new HSPError(ErrorCode.TYPE_MISMATCH);
		}
	},
	0x1b: function(v, offset, val) { // wpoke
		this.scanArgs(arguments, 'vNN');
		offset = offset ? offset.toIntValue()._value : 0;
		val = val ? val.toIntValue()._value : 0;
		v.setbyte(offset, val);
		v.setbyte(offset + 1, val >> 8);
	},
	0x1c: function(v, offset, val) { // lpoke
		this.scanArgs(arguments, 'vNN');
		offset = offset ? offset.toIntValue()._value : 0;
		val = val ? val.toIntValue()._value : 0;
		v.setbyte(offset, val);
		v.setbyte(offset + 1, val >> 8);
		v.setbyte(offset + 2, val >> 16);
		v.setbyte(offset + 3, val >> 24);
	},
	0x1d: function(v, src, index, separator, length) { // getstr
		this.scanArgs(arguments, 'vvNNN');
		index = index ? index.toIntValue()._value : 0;
		separator = separator ? separator.toIntValue()._value & 0xff : 0;
		length = length ? length.toIntValue()._value : 1024;
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
		v.assign(new StrValue(result));
		this.strsize = i;
		this.stat.assign(0, new IntValue(c));
	},
	0x1f: function(v, size) { // memexpand
		this.scanArgs(arguments, 'vN');
		size = size ? size.toIntValue()._value : 0;
		v.expandByteSize(size);
	},
	0x20: function(destVar, srcVar, length, destOffset, srcOffset) { // memcpy
		this.scanArgs(arguments, 'vvNNN');
		length = length ? length.toIntValue()._value : 0;
		destOffset = destOffset ? destOffset.toIntValue()._value : 0;
		srcOffset = srcOffset ? srcOffset.toIntValue()._value : 0;
		destVar.setbytes(destOffset, srcVar.getbytes(srcOffset, length));
	},
	0x21: function(v, val, length, offset) { // memset
		this.scanArgs(arguments, 'vNNN');
		val = val ? val.toIntValue()._value : 0;
		length = length ? length.toIntValue()._value : 0;
		offset = offset ? offset.toIntValue()._value : 0;
		v.setbytes(offset, Utils.strTimes(String.fromCharCode(val), length));
	},
	0x22: function(v) { // notesel
		this.scanArgs(arguments, 'v');
		if(v.getType() != VarType.STR) {
			v.assign(StrValue.EMPTY_STR);
		}
		this.selectNote(v);
	},
	0x23: function(line, lineNumber, overwrite) { // noteadd
		this.scanArgs(arguments, 'sNN');
		line = line.toStrValue();
		lineNumber = lineNumber ? lineNumber.toIntValue()._value : -1;
		overwrite = (overwrite ? overwrite.toIntValue()._value : 0) != 0;
		var note = this.getNote();
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
	},
	0x24: function(lineNumber) { // notedel
		this.scanArgs(arguments, 'N');
		lineNumber = lineNumber ? lineNumber.toIntValue()._value : 0;
		var note = this.getNote();
		var val = note.getValue();
		var index = val.lineIndex(lineNumber);
		if(index == null) return;
		var length = val.lineLengthIncludeCR(index);
		note.splice(index, length, '');
	},
	0x25: function(path) { // noteload
		// FIXME 第二引数のサイズ上限に対応
		this.scanArgs(arguments, 's');
		path = path.toStrValue()._value;
		var note = this.getNote();
		this.fileRead(
			path,
			function(data) {
				data = CP932.encode(data) + "\0";
				note.expandByteSize(data.length);
				note.setbytes(0, data);
			},
			function() {
				throw new HSPError(ErrorCode.FILE_IO);
			});
	},
	0x27: function(seed) { // randomize
		this.scanArgs(arguments, 'N');
		this.random.srand(seed ? seed.toIntValue()._value : +new Date);
	},
	0x28: function() { // noteunsel
		this.scanArgs(arguments, '');
		this.undoNote();
	},
	0x29: function(dest, lineNumber) { // noteget
		this.scanArgs(arguments, 'vN');
		lineNumber = lineNumber ? lineNumber.toIntValue()._value : 0;
		var val = this.getNote().getValue();
		var str = val._value;
		var index = val.lineIndex(lineNumber);
		if(index == null) {
			dest.assign(StrValue.EMPTY_STR);
			return;
		}
		var length = val.lineLength(index);
		dest.assign(new StrValue(str.substr(index, length)));
	}
};

BuiltinFuncs[Token.Type.INTFUNC] = {
	0x000: function(val) { // int
		this.scanArgs(arguments, '.');
		return val.toIntValue();
	},
	0x001: function(n) { // rnd
		this.scanArgs(arguments, 'n');
		n = n.toIntValue()._value;
		if(n == 0) {
			throw new HSPError(ErrorCode.DIVIDED_BY_ZERO);
		}
		return new IntValue(this.random.rand() % n);
	},
	0x002: function(s) { // strlen
		this.scanArgs(arguments, 's');
		return new IntValue(s.toStrValue()._value.length);
	},
	0x003: function(v) { // length
		this.scanArgs(arguments, 'a');
		return new IntValue(v.variable.getL0());
	},
	0x004: function(v) { // length2
		this.scanArgs(arguments, 'a');
		return new IntValue(v.variable.getL1());
	},
	0x005: function(v) { // length3
		this.scanArgs(arguments, 'a');
		return new IntValue(v.variable.getL2());
	},
	0x006: function(v) { // length4
		this.scanArgs(arguments, 'a');
		return new IntValue(v.variable.getL3());
	},
	0x007: function(v) { // vartype
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
	0x008: function(n) { // gettime
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
	0x009: function(v, n) { // peek
		this.scanArgs(arguments, 'vN');
		n = n ? n.toIntValue()._value : 0;
		if(n < 0) {
			throw new HSPError(ErrorCode.ILLEGAL_FUNCTION);
		}
		return new IntValue(v.getbyte(n));
	},
	0x00a: function(v, n) { // wpeek
		this.scanArgs(arguments, 'vN');
		n = n ? n.toIntValue()._value : 0;
		if(n < 0) {
			throw new HSPError(ErrorCode.ILLEGAL_FUNCTION);
		}
		return new IntValue(v.getbyte(n) | v.getbyte(n + 1) << 8);
	},
	0x00b: function(v, n) { // lpeek
		this.scanArgs(arguments, 'vN');
		n = n ? n.toIntValue()._value : 0;
		if(n < 0) {
			throw new HSPError(ErrorCode.ILLEGAL_FUNCTION);
		}
		return new IntValue(v.getbyte(n) | v.getbyte(n + 1) << 8 | v.getbyte(n + 2) << 16 | v.getbyte(n + 3) << 24);
	},
	0x00d: function(v) { // varuse
		this.scanArgs(arguments, 'v');
		var using = v.isUsing();
		if(using == null) {
			throw new HSPError(ErrorCode.TYPE_MISMATCH, VarTypeNames[v.getType()] + ' 型は varuse をサポートしていません');
		}
		return new IntValue(using);
	},
	0x00e: function(n) { // noteinfo
		this.scanArgs(arguments, 'N');
		n = n ? n.toIntValue()._value : 0;
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
	},
	0x00f: function(str, fromIndex, pattern) { // instr
		this.scanArgs(arguments, 'sNs');
		fromIndex = fromIndex ? fromIndex.toIntValue()._value : 0;
		pattern = pattern.toStrValue()._value;
		var index = str.toStrValue().indexOf(pattern, fromIndex);
		if(index >= 0) index -= fromIndex;
		return new IntValue(index);
	},
	0x010: function(val) { // abs
		this.scanArgs(arguments, 'n');
		return new IntValue(Math.abs(val.toIntValue()._value));
	},
	0x011: function(val, min, max) { // limit
		this.scanArgs(arguments, 'nnn');
		val = val.toIntValue()._value;
		min = min.toIntValue()._value;
		max = max.toIntValue()._value;
		return new IntValue(Math.min(Math.max(min, val), max));
	},
	0x100: function(val) { // str
		this.scanArgs(arguments, '.');
		return val.toStrValue();
	},
	0x101: function(str, index, length) { // strmid
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
	0x103: function(format) { // strf
		var args = Array.prototype.slice.call(arguments, 1);
		this.scanArgs(arguments, 's.*');
		return Formatter.sprintf(this, format, args);
	},
	0x104: function(path, flags) { // getpath
		this.scanArgs(arguments, 'sn');
		path = path.toStrValue()._value;
		flags = flags.toIntValue()._value;
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
	},
	0x180: function(val) { // sin
		this.scanArgs(arguments, 'n');
		return new DoubleValue(Math.sin(val.toDoubleValue()._value));
	},
	0x181: function(val) { // cos
		this.scanArgs(arguments, 'n');
		return new DoubleValue(Math.cos(val.toDoubleValue()._value));
	},
	0x182: function(val) { // tan
		this.scanArgs(arguments, 'n');
		return new DoubleValue(Math.tan(val.toDoubleValue()._value));
	},
	0x183: function(y, x) { // atan
		this.scanArgs(arguments, 'nN');
		y = y.toDoubleValue()._value;
		x = x ? x.toDoubleValue()._value : 1.0;
		return new DoubleValue(Math.atan2(y, x));
	},
	0x184: function(val) { // sqrt
		this.scanArgs(arguments, 'n');
		return new DoubleValue(Math.sqrt(val.toDoubleValue()._value));
	},
	0x185: function(val) { // double
		this.scanArgs(arguments, '.');
		return val.toDoubleValue();
	},
	0x186: function(val) { // absf
		this.scanArgs(arguments, 'n');
		return new DoubleValue(Math.abs(val.toDoubleValue()._value));
	},
	0x187: function(val) { // expf
		this.scanArgs(arguments, 'n');
		return new DoubleValue(Math.exp(val.toDoubleValue()._value));
	},
	0x188: function(val) { // logf
		this.scanArgs(arguments, 'n');
		return new DoubleValue(Math.log(val.toDoubleValue()._value));
	},
	0x189: function(val, min, max) { // limitf
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


