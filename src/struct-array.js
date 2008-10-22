function StructArray() {
	HSPArray.call(this);
	this.values = [StructValue.EMPTY];
}

StructArray.prototype = new HSPArray();

Utils.objectExtend(StructArray.prototype, {
	expand: function expand(indices) {
		var isExpanded = HSPArray.prototype.expand.call(this, indices);
		if(isExpanded) {
			var newLen = this.allLength();
			var empty = StructValue.EMPTY;
			for(var i = this.values.length; i < newLen; i ++) {
				this.values[i] = empty;
			}
		}
		return isExpanded;
	},
	getType: function getType() {
		return VarType.STRUCT;
	},
	// newmod で格納するべきインデックスを返す（空きがなければ拡張する）
	findIndex: function findIndex() {
		var len = this.l0;
		for(var i = 0; i < len; i ++) {
			if(this.values[i] == StructValue.EMPTY) {
				return i;
			}
		}
		this.expand([len]);
		return len;
	}
});

if(typeof HSPonJS != 'undefined') {
	HSPonJS.StructArray = StructArray;
}

