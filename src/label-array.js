function LabelArray() {
	HSPArray.call(this);
	this.values = [Label.EMPTY];
}

LabelArray.prototype = new HSPArray();

Utils.objectExtend(LabelArray.prototype, {
	expand: function expand(indices) {
		var isExpanded = this.expandLen(indices);
		if(isExpanded) {
			var newLen = this.allLength();
			var empty = Label.EMPTY;
			for(var i = this.values.length; i < newLen; i ++) {
				this.values[i] = empty;
			}
		}
		return isExpanded;
	},
	expand1D: function expand1D(index) {
		var isExpanded = this.expandLen1D(index);
		if(isExpanded) {
			var newLen = this.l0;
			var empty = Label.EMPTY;
			for(var i = this.values.length; i < newLen; i ++) {
				this.values[i] = empty;
			}
		}
		return isExpanded;
	}, 
	getType: function getType() {
		return VarType.LABEL;
	}
});

if(typeof HSPonJS != 'undefined') {
	HSPonJS.LabelArray = LabelArray;
}


