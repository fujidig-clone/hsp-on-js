function StrArray() {
	HSPArray.call(this);
	this.values = [Utils.strTimes("\0", 64)];
}

StrArray.prototype = new HSPArray();

Utils.objectExtend(StrArray.prototype, {
	assign: function assign(indices, rhs) {
		this.expand(indices);
		var offset = this.getOffset(indices);
		var value = this.values[offset];
		rhs = rhs.toStrValue();
		value = rhs._value + "\0" + value.slice(rhs._value.length + 1);
		this.values[offset] = value;
	},
	expand: function expand(indices) {
		var isExpanded = HSPArray.prototype.expand.call(this, indices);
		if(isExpanded) {
			var newLen = this.allLength();
			for(var i = this.values.length; i < newLen; i ++) {
				this.values[i] = Utils.strTimes("\0", 64);
			}
		}
		return isExpanded;
	},
	at: function at(indices) {
		var offset = this.getOffset(indices);
		if(offset == null) throw new HSPError(ErrorCode.ARRAY_OVERFLOW);
		return new StrValue(Utils.getCStr(this.values[offset]));
	},
	getType: function getType() {
		return VarType.STR;
	},
	strDim: function strDim(strLength, l0, l1, l2, l3) {
		if(strLength == undefined || strLength < 64) {
			strLength = 64;
		}
		var indices = HSPArray.lengthToIndices(l0, l1, l2, l3);
		HSPArray.prototype.expand.call(this, indices);
		var len = this.allLength();
		for(var i = 0; i < len; i ++) {
			this.values[i] = Utils.strTimes("\0", strLength);
		}
	},
	getbyte: function getbyte(indices, bytesOffset) {
		var offset = this.getOffset(indices);
		if(offset == null) throw new HSPError(ErrorCode.ARRAY_OVERFLOW);
		if(!(0 <= bytesOffset && bytesOffset < this.values[offset].length)) {
			throw new HSPError(ErrorCode.BUFFER_OVERFLOW);
		}
		return this.values[offset].charCodeAt(bytesOffset);
	},
	setbyte: function setbyte(indices, bytesOffset, val) {
		var offset = this.getOffset(indices);
		if(offset == null) throw new HSPError(ErrorCode.ARRAY_OVERFLOW);
		var str = this.values[offset];
		if(!(0 <= bytesOffset && bytesOffset < str.length)) {
			throw new HSPError(ErrorCode.BUFFER_OVERFLOW);
		}
		this.values[offset] = str.slice(0, bytesOffset) + String.fromCharCode(val & 0xff) + str.slice(bytesOffset + 1);
	},
	getbytes: function getbytes(indices, bytesOffset, length) {
		var offset = this.getOffset(indices);
		if(offset == null) throw new HSPError(ErrorCode.ARRAY_OVERFLOW);
		if(!(0 <= bytesOffset && bytesOffset + length <= this.values[offset].length)) {
			throw new HSPError(ErrorCode.BUFFER_OVERFLOW);
		}
		return this.values[offset].substr(bytesOffset, length);
	},
	setbytes: function setbytes(indices, bytesOffset, buf) {
		var offset = this.getOffset(indices);
		if(offset == null) throw new HSPError(ErrorCode.ARRAY_OVERFLOW);
		var str = this.values[offset];
		if(!(0 <= bytesOffset && bytesOffset + buf.length <= str.length)) {
			throw new HSPError(ErrorCode.BUFFER_OVERFLOW);
		}
		this.values[offset] = str.slice(0, bytesOffset) + buf + str.slice(bytesOffset + buf.length);
	}
});

if(typeof HSPonJS != 'undefined') {
	HSPonJS.StrArray = StrArray;
}

