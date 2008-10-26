function StructArray() {
	HSPArray.call(this);
	this.values = [StructValue.EMPTY];
	this.searchFrom = 0;
}

StructArray.prototype = new HSPArray();

Utils.objectExtend(StructArray.prototype, {
	assign: function assign(offset, rhs) {
		this.values[offset] = rhs.toValue().clone();
		if(rhs == StructValue.EMPTY && offset < this.searchFrom) {
			this.searchFrom = offset;
		}
	},
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
	// 配列インデックスを返す
	newmod: function newmod(module) {
		var len = this.l0;
		var index;
		for(index = this.searchFrom; index < len; index ++) {
			if(this.values[index] == StructValue.EMPTY) {
				break;
			}
		}
		if(index == len) this.expand([len]);
		this.searchFrom = index + 1;
		var members = [];
		for(var i = 0; i < module.membersCount; i ++) {
			members[i] = new Variable;
		}
		this.values[index] = new StructValue(module, members, false);
		return index;
	}
});

if(typeof HSPonJS != 'undefined') {
	HSPonJS.StructArray = StructArray;
}

