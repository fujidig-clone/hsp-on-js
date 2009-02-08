function LabelArray() {
	HSPArray.call(this);
	this.values = [LabelValue.EMPTY];
}

LabelArray.prototype = new HSPArray();

Utils.objectExtend(LabelArray.prototype, {
	expand: function(indices) {
		var isExpanded = this.expandLen(indices);
		if(isExpanded) {
			var newLen = this.allLength();
			var empty = LabelValue.EMPTY;
			for(var i = this.values.length; i < newLen; i ++) {
				this.values[i] = empty;
			}
		}
		return isExpanded;
	},
	expand1D: function(index) {
		var isExpanded = this.expandLen1D(index);
		if(isExpanded) {
			var newLen = this.l0;
			var empty = LabelValue.EMPTY;
			for(var i = this.values.length; i < newLen; i ++) {
				this.values[i] = empty;
			}
		}
		return isExpanded;
	},
	getType: function() {
		return VarType.LABEL;
	}
});

if(typeof HSPonJS != 'undefined') {
	HSPonJS.LabelArray = LabelArray;
}


