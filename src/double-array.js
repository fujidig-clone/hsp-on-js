function DoubleArray() {
	HSPArray.call(this);
	this.values = [new DoubleValue(0)];
}

DoubleArray.prototype = new HSPArray();

Utils.objectExtend(DoubleArray.prototype, {
	expand: function expand(indices) {
		var isExpanded = HSPArray.prototype.expand.call(this, indices);
		if(isExpanded) {
			var newLen = this.allLength();
			for(var i = this.values.length; i < newLen; i ++) {
				this.values[i] = new DoubleValue(0);
			}
		}
		return isExpanded;
	},
	getType: function getType() {
		return VarType.DOUBLE;
	}
});

if(typeof HSPonJS != 'undefined') {
	HSPonJS.DoubleArray = DoubleArray;
}

