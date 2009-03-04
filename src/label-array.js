function LabelArray() {
	HSPArray.call(this);
	this.values = [LabelValue.EMPTY];
}

LabelArray.prototype = new HSPArray();

Utils.objectExtend(LabelArray.prototype, {
	fillUpElements: function(newLen) {
		var empty = LabelValue.EMPTY;
		for(var i = this.values.length; i < newLen; i ++) {
			this.values[i] = empty;
		}
	},
	getType: function() {
		return VarType.LABEL;
	}
});

if(typeof HSPonJS != 'undefined') {
	HSPonJS.LabelArray = LabelArray;
}


