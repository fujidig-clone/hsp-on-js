function StructValue(module, members) {
	this.module = module;
	this.members = members;
}

StructValue.prototype = new Value;

Utils.objectExtend(StructValue.prototype, {
	eq: function(rhs) {
		if(rhs.getType() != VarType.STRUCT) return IntValue.of(false);
		return IntValue.of(this.members == rhs.toValue().members);
	},
	ne: function(rhs) {
		if(rhs.getType() != VarType.STRUCT) return IntValue.of(true);
		return IntValue.of(this.members != rhs.toValue().members);
	},
	getType: function() {
		return VarType.STRUCT;
	},
	toString: function() {
		return '<StructValue: module='+this.module.name+'>';
	},
	isUsing: function() {
		return true;
	}
});


StructValue.EMPTY = new StructValue(null, null);
StructValue.EMPTY.toString = function() { return '<StructValue: EMPTY>'; };
StructValue.EMPTY.isUsing = function() { return false; };

if(typeof HSPonJS != 'undefined') {
	HSPonJS.StructValue = StructValue;
}

