function DoubleValue(value) {
	this._value = +value;
}

DoubleValue.prototype = new Value;

DoubleValue.ZERO = new DoubleValue(0);
DoubleValue.of = function(value) {
	if(value == 0) {
		return DoubleValue.ZERO;
	}
	return new DoubleValue(value);
};

Utils.objectExtend(DoubleValue.prototype, {
	add: function(rhs) {
		return new DoubleValue(this._value + rhs.toDoubleValue()._value);
	},
	sub: function(rhs) {
		return new DoubleValue(this._value - rhs.toDoubleValue()._value);
	},
	mul: function(rhs) {
		return new DoubleValue(this._value * rhs.toDoubleValue()._value);
	},
	div: function(rhs) {
		return new DoubleValue(this._value / rhs.toDoubleValue()._value);
	},
	mod: function(rhs) {
		return new DoubleValue(this._value % rhs.toDoubleValue()._value);
	},
	eq: function(rhs) {
		return new IntValue(this._value == rhs.toDoubleValue()._value);
	},
	ne: function(rhs) {
		return new IntValue(this._value != rhs.toDoubleValue()._value);
	},
	gt: function(rhs) {
		return new IntValue(this._value > rhs.toDoubleValue()._value);
	},
	lt: function(rhs) {
		return new IntValue(this._value < rhs.toDoubleValue()._value);
	},
	gteq: function(rhs) {
		return new IntValue(this._value >= rhs.toDoubleValue()._value);
	},
	lteq: function(rhs) {
		return new IntValue(this._value <= rhs.toDoubleValue()._value);
	},
	getType: function() {
		return VarType.DOUBLE;
	},
	toIntValue: function() {
		return new IntValue(this._value);
	},
	toDoubleValue: function() {
		return this;
	},
	toStrValue: function() {
		return new StrValue(Formatter.convertFloat(this._value, {}, 0, null));
	},
	toString: function() {
		return '<DoubleValue:'+this._value+'>';
	}
});

if(typeof HSPonJS != 'undefined') {
	HSPonJS.DoubleValue = DoubleValue;
}

