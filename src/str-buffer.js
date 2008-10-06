function StrBuffer(str) {
	if(str) {
		this._str = str;
	} else {
		this._str = StrBuffer.DEFAULT;
	}
	this._valCache = StrValue.EMPTY_STR;
}

StrBuffer.DEFAULT = Utils.strTimes("\0", 64);

StrBuffer.prototype = {
	assign: function assign(val) {
		val = val.toStrValue();
		this._str = val._value + "\0" + this._str.slice(val._value.length + 1);
		this._valCache = val;
	},
	getValue: function getValue() {
		if(!this._valCache) {
			this._valCache = new StrValue(Utils.getCStr(this._str));
		}
		return this._valCache;
	},
	getbyte: function getbyte(pos) {
		if(!(0 <= pos && pos < this._str.length)) {
			throw new HSPError(ErrorCode.BUFFER_OVERFLOW);
		}
		return this._str.charCodeAt(pos);
	},
	setbyte: function setbyte(pos, val) {
		var str = this._str;
		if(!(0 <= pos && pos < str.length)) {
			throw new HSPError(ErrorCode.BUFFER_OVERFLOW);
		}
		this._str = str.slice(0, pos) + String.fromCharCode(val & 0xff) + str.slice(pos + 1);
		this._valCache = null;
	},
	getbytes: function getbytes(pos, length) {
		if(!(0 <= pos && pos + length <= this._str.length)) {
			throw new HSPError(ErrorCode.BUFFER_OVERFLOW);
		}
		return this._str.substr(pos, length);
	},
	setbytes: function setbytes(pos, buf) {
		var str = this._str;
		if(!(0 <= pos && pos + buf.length <= str.length)) {
			throw new HSPError(ErrorCode.BUFFER_OVERFLOW);
		}
		this._str = str.slice(0, pos) + buf + str.slice(pos + buf.length);
		this._valCache = null;
	},
	getByteSize: function getByteSize() {
		return this._str.length;
	}
};

if(typeof HSPonJS != 'undefined') {
	HSPonJS.StrBuffer = StrBuffer;
}


