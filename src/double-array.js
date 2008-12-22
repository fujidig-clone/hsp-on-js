function DoubleArray() {
	HSPArray.call(this);
	this.values = [new DoubleValue(0)];
}

DoubleArray.prototype = new HSPArray();

Utils.objectExtend(DoubleArray.prototype, {
	expand: function expand(indices) {
		var isExpanded = this.expandLen(indices);
		if(isExpanded) {
			var newLen = this.allLength();
			var zero = new DoubleValue(0);
			for(var i = this.values.length; i < newLen; i ++) {
				this.values[i] = zero;
			}
		}
		return isExpanded;
	},
	expand1D: function expand1D(index) {
		var isExpanded = this.expandLen1D(index);
		if(isExpanded) {
			var newLen = this.l0;
			var zero = new DoubleValue(0);
			for(var i = this.values.length; i < newLen; i ++) {
				this.values[i] = zero;
			}
		}
		return isExpanded;
	},
	getType: function getType() {
		return VarType.DOUBLE;
	},
	inc: function inc(offset) {
		this.values[offset] = new DoubleValue(this.values[offset]._value + 1);
	},
	dec: function dec(offset) {
		this.values[offset] = new DoubleValue(this.values[offset]._value - 1);
	}
});

if(typeof HSPonJS != 'undefined') {
	HSPonJS.DoubleArray = DoubleArray;
}

