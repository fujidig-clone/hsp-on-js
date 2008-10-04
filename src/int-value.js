function IntValue(value) {
	this._value = value|0;
}

IntValue.prototype = new Value;

(function(){
	var cache = new Array(256);
	for(var i = 0; i < 256; i ++) {
		cache[i] = new IntValue(i-128);
	}
	
	IntValue.of = function of(value) {
		value = value|0;
		if(-128 <= value && value <= 127) {
			return cache[value+128];
		}
		return new IntValue(value);
	}
})();

Utils.objectExtend(IntValue.prototype, {
	add: function add(rhs) {
		return new IntValue(this._value + rhs.toIntValue()._value);
	},
	sub: function sub(rhs) {
		return new IntValue(this._value - rhs.toIntValue()._value);
	},
	mul: function mul(rhs) {
		return new IntValue(this._value * rhs.toIntValue()._value);
	},
	div: function div(rhs) {
		var rhs_value = rhs.toIntValue()._value;
		if(rhs_value == 0) {
			throw new HSPError(ErrorCode.DIVIDED_BY_ZERO);
		}
		return new IntValue(this._value / rhs_value);
	},
	mod: function mod(rhs) {
		return new IntValue(this._value % rhs.toIntValue()._value);
	},
	and: function and(rhs) {
		return new IntValue(this._value & rhs.toIntValue()._value);
	},
	or: function or(rhs) {
		return new IntValue(this._value | rhs.toIntValue()._value);
	},
	xor: function xor(rhs) {
		return new IntValue(this._value ^ rhs.toIntValue()._value);
	},
	eq: function eq(rhs) {
		return new IntValue(this._value == rhs.toIntValue()._value);
	},
	ne: function ne(rhs) {
		return new IntValue(this._value != rhs.toIntValue()._value);
	},
	gt: function gt(rhs) {
		return new IntValue(this._value > rhs.toIntValue()._value);
	},
	lt: function lt(rhs) {
		return new IntValue(this._value < rhs.toIntValue()._value);
	},
	gteq: function gteq(rhs) {
		return new IntValue(this._value >= rhs.toIntValue()._value);
	},
	lteq: function lteq(rhs) {
		return new IntValue(this._value <= rhs.toIntValue()._value);
	},
	rsh: function rhs(rhs) {
		return new IntValue(this._value >> rhs.toIntValue()._value);
	},
	lsh: function lhs(rhs) {
		return new IntValue(this._value << rhs.toIntValue()._value);
	},
	getType: function getType() {
		return VarType.INT;
	},
	toIntValue: function toIntValue() {
		return this;
	},
	toDoubleValue: function toDoubleValue() {
		return new DoubleValue(this._value);
	},
	toStrValue: function toStrValue() {
		return new StrValue(this._value);
	},
	toString: function toString() {
		return '<IntValue:'+this._value+'>';
	}
});

if(typeof HSPonJS != 'undefined') {
	HSPonJS.IntValue = IntValue;
}

