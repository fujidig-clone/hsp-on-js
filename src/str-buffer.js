function StrBuffer(length) {
	// this._length >= this._str.length
	// this._length の方が大きいとき、その分後ろに '\0' がついているものとして扱う
	this._str = "";
	this._length = length;
	this._valCache = StrValue.EMPTY_STR;
}

StrBuffer.prototype = {
	assign: function assign(val) {
		val = val.toStrValue();
		if(val._value.length + 1 >= this._length) {
			this._length = val._value.length + 1;
			this._str = val._value;
		} else if(val._value.length + 1 >= this._str.length) {
			this._str = val._value;
		} else {
			this._str = val._value + "\0" + this._str.slice(val._value.length + 1);
		}
		this._valCache = val;
	},
	getValue: function getValue() {
		if(!this._valCache) {
			this._valCache = new StrValue(Utils.getCStr(this._str));
		}
		return this._valCache;
	},
	getbyte: function getbyte(pos) {
		if(!(0 <= pos && pos < this._length)) {
			throw new HSPError(ErrorCode.BUFFER_OVERFLOW);
		}
		if(pos < this._str.length) {
			return this._str.charCodeAt(pos);
		}
		return 0;
	},
	setbyte: function setbyte(pos, val) {
		var str = this._str;
		if(!(0 <= pos && pos < this._length)) {
			throw new HSPError(ErrorCode.BUFFER_OVERFLOW);
		}
		if(pos < str.length) {
			this._str = str.slice(0, pos) + String.fromCharCode(val & 0xff) + str.slice(pos + 1);
		} else {
			this._str += Utils.strTimes("\0", pos - str.length) + String.fromCharCode(val & 0xff);
		}
		this._valCache = null;
	},
	getbytes: function getbytes(pos, length) {
		if(!(0 <= pos && pos + length <= this._length)) {
			throw new HSPError(ErrorCode.BUFFER_OVERFLOW);
		}
		if(pos + length <= this._str.length) {
			return this._str.substr(pos, length);
		}
		return this._str.slice(pos) + Utils.strTimes("\0", length - (this._str.length - pos));
	},
	setbytes: function setbytes(pos, buf) {
		var str = this._str;
		if(!(0 <= pos && pos + buf.length <= this._length)) {
			throw new HSPError(ErrorCode.BUFFER_OVERFLOW);
		}
		if(pos + buf.length <= str.length) {
			this._str = str.slice(0, pos) + buf + str.slice(pos + buf.length);
		} else if(pos >= str.length) {
			this._str = str + Utils.strTimes("\0", pos - str.length) + buf;
		} else {
			this._str = str.slice(0, pos) + buf;
		}
		this._valCache = null;
	},
	getByteSize: function getByteSize() {
		return this._length;
	},
	expandByteSize: function expandByteSize(size) {
		if(this._length >= size) return;
		this._length = size;
	},
	splice: function splice(index, length, sub) {
		// (index >= 0 && length >= 0 && index + length <= this.getByteSize()) の条件が偽のときの動作は未定義とする
		var str = this._str;
		if(index < str.length) {
			this._str = str.slice(0, index) + sub + str.slice(index + length);
		} else {
			this._str = str + Utils.strTimes("\0", index - str.length) + sub;
		}
		this._length += sub.length - length;
		this._valCache = null;
	}
};

if(typeof HSPonJS != 'undefined') {
	HSPonJS.StrBuffer = StrBuffer;
}


