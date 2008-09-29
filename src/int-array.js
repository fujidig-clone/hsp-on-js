function IntArray() {
	HSPArray.call(this);
	this.values = [new IntValue(0)];
}

IntArray.prototype = new HSPArray();

Utils.objectExtend(IntArray.prototype, {
	expand: function expand(indices) {
		var isExpanded = HSPArray.prototype.expand.call(this, indices);
		if(isExpanded) {
			var newLen = this.allLength();
			for(var i = this.values.length; i < newLen; i ++) {
				this.values[i] = new IntValue(0);
			}
		}
		return isExpanded;
	},
	getType: function getType() {
		return VarType.INT;
	},
	getbyte: function getbyte(indices, bytesOffset) {
		var offset = this.getOffset(indices);
		if(offset == null) throw new HSPError(ErrorCode.ARRAY_OVERFLOW);
		var i = offset + (bytesOffset >> 2);
		if(!(0 <= i && i < this.values.length)) {
			throw new HSPError(ErrorCode.BUFFER_OVERFLOW);
		}
		return this.values[i]._value >> (bytesOffset % 4 * 8) & 0xff;
	},
	setbyte: function setbyte(indices, bytesOffset, val) {
		var offset = this.getOffset(indices);
		if(offset == null) throw new HSPError(ErrorCode.ARRAY_OVERFLOW);
		var i = offset + (bytesOffset >> 2);
		if(!(0 <= i && i < this.values.length)) {
			throw new HSPError(ErrorCode.BUFFER_OVERFLOW);
		}
		var value = this.values[i]._value;
		value &= ~(0xff << (bytesOffset % 4 * 8));
		value |= (val & 0xff) << (bytesOffset % 4 * 8);
		this.values[i] = new IntValue(value);
	}
});

if(typeof HSPonJS != 'undefined') {
	HSPonJS.IntArray = IntArray;
}

