function DoubleArray() {
	HSPArray.call(this);
	this.values = [new DoubleValue(0)];
}

DoubleArray.prototype = new HSPArray();

Utils.objectExtend(DoubleArray.prototype, {
	fillUpElements: function(newLen) {
		var zero = new DoubleValue(0);
		for(var i = this.values.length; i < newLen; i ++) {
			this.values[i] = zero;
		}
	},
	type: VarType.DOUBLE,
	inc: function(offset) {
		this.values[offset] = new DoubleValue(this.values[offset]._value + 1);
	},
	dec: function(offset) {
		this.values[offset] = new DoubleValue(this.values[offset]._value - 1);
	}
});

if(typeof HSPonJS != 'undefined') {
	HSPonJS.DoubleArray = DoubleArray;
}

