function StrArray() {
	HSPArray.call(this);
	this.values = [new StrValue('')];
}

StrArray.prototype = new HSPArray();

Utils.objectExtend(StrArray.prototype, {
	expand: function expand(indices) {
		var isExpanded = HSPArray.prototype.expand.call(this, indices);
		if(isExpanded) {
			var newLen = this.allLength();
			for(var i = this.values.length; i < newLen; i ++) {
				this.values[i] = new StrValue('');
			}
		}
		return isExpanded;
	},
	getType: function getType() {
		return VarType.STR;
	}
});

if(typeof HSPonJS != 'undefined') {
	HSPonJS.StrArray = StrArray;
}

