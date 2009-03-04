function StructArray() {
	HSPArray.call(this);
	this.values = [StructValue.EMPTY];
	this.searchFrom = 0;
}

StructArray.prototype = new HSPArray();

Utils.objectExtend(StructArray.prototype, {
	assign: function(offset, rhs) {
		this.values[offset] = rhs.toValue();
		if(rhs == StructValue.EMPTY && offset < this.searchFrom) {
			this.searchFrom = offset;
		}
	},
	fillUpElements: function(newLen) {
		var empty = StructValue.EMPTY;
		for(var i = this.values.length; i < newLen; i ++) {
			this.values[i] = empty;
		}
	},
	getType: function() {
		return VarType.STRUCT;
	},
	// 配列インデックスを返す
	newmod: function(module) {
		var len = this.l0;
		var index;
		for(index = this.searchFrom; index < len; index ++) {
			if(this.values[index] == StructValue.EMPTY) {
				break;
			}
		}
		if(index == len) {
			if(this.l1) throw new HSPError(ErrorCode.ARRAY_OVERFLOW);
			++ this.l0;
		}
		this.searchFrom = index + 1;
		var members = [];
		for(var i = 0; i < module.membersCount; i ++) {
			members[i] = new Variable;
		}
		this.values[index] = new StructValue(module, members);
		return index;
	}
});

if(typeof HSPonJS != 'undefined') {
	HSPonJS.StructArray = StructArray;
}

