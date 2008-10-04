function DoubleValue(value) {
	this._value = +value;
}

DoubleValue.prototype = new Value;

DoubleValue.ZERO = new DoubleValue(0);
DoubleValue.of = function of(value) {
	if(value == 0) {
		return DoubleValue.ZERO;
	}
	return new DoubleValue(value);
};

Utils.objectExtend(DoubleValue.prototype, {
	add: function add(rhs) {
		return new DoubleValue(this._value + rhs.toDoubleValue()._value);
	},
	sub: function sub(rhs) {
		return new DoubleValue(this._value - rhs.toDoubleValue()._value);
	},
	mul: function mul(rhs) {
		return new DoubleValue(this._value * rhs.toDoubleValue()._value);
	},
	div: function div(rhs) {
		return new DoubleValue(this._value / rhs.toDoubleValue()._value);
	},
	mod: function mod(rhs) {
		return new DoubleValue(this._value % rhs.toDoubleValue()._value);
	},
	eq: function eq(rhs) {
		return new IntValue(this._value == rhs.toDoubleValue()._value);
	},
	ne: function ne(rhs) {
		return new IntValue(this._value != rhs.toDoubleValue()._value);
	},
	gt: function gt(rhs) {
		return new IntValue(this._value > rhs.toDoubleValue()._value);
	},
	lt: function lt(rhs) {
		return new IntValue(this._value < rhs.toDoubleValue()._value);
	},
	gteq: function gteq(rhs) {
		return new IntValue(this._value >= rhs.toDoubleValue()._value);
	},
	lteq: function lteq(rhs) {
		return new IntValue(this._value <= rhs.toDoubleValue()._value);
	},
	getType: function getType() {
		return VarType.DOUBLE;
	},
	toIntValue: function toIntValue() {
		return new IntValue(this._value);
	},
	toDoubleValue: function toDoubleValue() {
		return this;
	},
	toStrValue: function toStrValue() {
		// FIXME オフィシャル HSP と同じ 0.000000 のようなフォーマットに
		var s = '' + this._value;
		if(/^-?\d+$/.test(s)) {
			s += '.0';
		}
		return new StrValue(s);
	},
	toString: function toString() {
		return '<DoubleValue:'+this._value+'>';
	}
});

if(typeof HSPonJS != 'undefined') {
	HSPonJS.DoubleValue = DoubleValue;
}

