function StructValue(module, members) {
	this.module = module;
	this.members = members;
}

StructValue.prototype = new Value;

Utils.objectExtend(StructValue.prototype, {
	eq: function eq(rhs) {
		return new IntValue(this == rhs.toValue());
	},
	ne: function ne(rhs) {
		return new IntValue(this != rhs.toValue());
	},
	getType: function getType() {
		return VarType.STRUCT;
	},
	toString: function toString() {
		return '<StructValue: module='+this.module.name+'>';
	},
	isUsing: function isUsing() {
		return true;
	}
});


StructValue.EMPTY = new StructValue(null, null);
StructValue.EMPTY.toString = function() { return '<StructValue: EMPTY>'; };
StructValue.EMPTY.isUsing = function() { return false; };

if(typeof HSPonJS != 'undefined') {
	HSPonJS.StructValue = StructValue;
}

