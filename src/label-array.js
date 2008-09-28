function LabelArray() {
	HSPArray.call(this);
	this.values = [Label.EMPTY];
}

LabelArray.prototype = new HSPArray();

Utils.objectExtend(LabelArray.prototype, {
	expand: function expand(indices) {
		var isExpanded = HSPArray.prototype.expand.call(this, indices);
		if(isExpanded) {
			var newLen = this.allLength();
			for(var i = this.values.length; i < newLen; i ++) {
				this.values[i] = Label.EMPTY;
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


