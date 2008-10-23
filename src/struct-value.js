function StructValue(module, members, isClone) {
	this.module = module;
	this.members = members;
	this.isClone = isClone;
}

StructValue.prototype = new Value;

Utils.objectExtend(StructValue.prototype, {
	eq: function eq(rhs) {
		if(rhs.getType() != VarType.STRUCT) return new IntValue(false);
		return new IntValue(this.members == rhs.toValue().members);
	},
	ne: function ne(rhs) {
		if(rhs.getType() != VarType.STRUCT) return new IntValue(false);
		return new IntValue(this.members != rhs.toValue().members);
	},
	getType: function getType() {
		return VarType.STRUCT;
	},
	toString: function toString() {
		return '<StructValue: module='+this.module.name+'>';
	},
	isUsing: function isUsing() {
		if(this.isClone) return 2;
		return 1;
	},
	clone: function clone() {
		if(this.isClone) {
			return this;
		} else {
			return new StructValue(this.module, this.members, true);
		}
	}
});


StructValue.EMPTY = new StructValue(null, null);
StructValue.EMPTY.toString = function() { return '<StructValue: EMPTY>'; };
StructValue.EMPTY.isUsing = function() { return false; };
StructValue.EMPTY.clone = function() { return this; };

if(typeof HSPonJS != 'undefined') {
	HSPonJS.StructValue = StructValue;
}

