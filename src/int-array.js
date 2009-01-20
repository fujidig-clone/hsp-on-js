function IntArray() {
	HSPArray.call(this);
	this.values = [new IntValue(0)];
}

IntArray.prototype = new HSPArray();

Utils.objectExtend(IntArray.prototype, {
	expand: function(indices) {
		var isExpanded = this.expandLen(indices);
		if(isExpanded) {
			var newLen = this.allLength();
			var zero = new IntValue(0);
			for(var i = this.values.length; i < newLen; i ++) {
				this.values[i] = zero;
			}
		}
		return isExpanded;
	},
	expand1D: function(index) {
		var isExpanded = this.expandLen1D(index);
		if(isExpanded) {
			var newLen = this.l0;
			var zero = new IntValue(0);
			for(var i = this.values.length; i < newLen; i ++) {
				this.values[i] = zero;
			}
		}
		return isExpanded;
	},
	getType: function() {
		return VarType.INT;
	},
	getbyte: function(offset, bytesOffset) {
		var i = offset + (bytesOffset >> 2);
		if(!(0 <= i && i < this.values.length)) {
			throw new HSPError(ErrorCode.BUFFER_OVERFLOW);
		}
		return this.values[i]._value >> (bytesOffset % 4 * 8) & 0xff;
	},
	setbyte: function(offset, bytesOffset, val) {
		var i = offset + (bytesOffset >> 2);
		if(!(0 <= i && i < this.values.length)) {
			throw new HSPError(ErrorCode.BUFFER_OVERFLOW);
		}
		var value = this.values[i]._value;
		value &= ~(0xff << (bytesOffset % 4 * 8));
		value |= (val & 0xff) << (bytesOffset % 4 * 8);
		this.values[i] = new IntValue(value);
	},
	getByteSize: function(offset) {
		return (this.values.length - offset) * 4;
	},
	inc: function(offset) {
		this.values[offset] = new IntValue(this.values[offset]._value + 1);
	},
	dec: function(offset) {
		this.values[offset] = new IntValue(this.values[offset]._value - 1);
	}
});

if(typeof HSPonJS != 'undefined') {
	HSPonJS.IntArray = IntArray;
}

