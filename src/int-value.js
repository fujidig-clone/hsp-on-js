function IntValue(value) {
	this._value = value|0;
}

IntValue.prototype = new Value;

(function(){
	var cache = new Array(256);
	for(var i = 0; i < 256; i ++) {
		cache[i] = new IntValue(i-128);
	}
	
	IntValue.of = function(value) {
		value = value|0;
		if(-128 <= value && value <= 127) {
			return cache[value+128];
		}
		return new IntValue(value);
	};
})();

Utils.objectExtend(IntValue.prototype, {
	add: function(rhs) {
		return new IntValue(this._value + rhs.toIntValue()._value);
	},
	sub: function(rhs) {
		return new IntValue(this._value - rhs.toIntValue()._value);
	},
	mul: function(rhs) {
		return new IntValue(this._value * rhs.toIntValue()._value);
	},
	div: function(rhs) {
		var rhsValue = rhs.toIntValue()._value;
		if(rhsValue == 0) {
			throw new HSPError(ErrorCode.DIVIDED_BY_ZERO);
		}
		return new IntValue(this._value / rhsValue);
	},
	mod: function(rhs) {
		var rhsValue = rhs.toIntValue()._value;
		if(rhsValue == 0) {
			throw new HSPError(ErrorCode.DIVIDED_BY_ZERO);
		}
		return new IntValue(this._value % rhsValue);
	},
	and: function(rhs) {
		return new IntValue(this._value & rhs.toIntValue()._value);
	},
	or: function(rhs) {
		return new IntValue(this._value | rhs.toIntValue()._value);
	},
	xor: function(rhs) {
		return new IntValue(this._value ^ rhs.toIntValue()._value);
	},
	eq: function(rhs) {
		return IntValue.of(this._value == rhs.toIntValue()._value);
	},
	ne: function(rhs) {
		return IntValue.of(this._value != rhs.toIntValue()._value);
	},
	gt: function(rhs) {
		return IntValue.of(this._value > rhs.toIntValue()._value);
	},
	lt: function(rhs) {
		return IntValue.of(this._value < rhs.toIntValue()._value);
	},
	gteq: function(rhs) {
		return IntValue.of(this._value >= rhs.toIntValue()._value);
	},
	lteq: function(rhs) {
		return IntValue.of(this._value <= rhs.toIntValue()._value);
	},
	rsh: function(rhs) {
		return new IntValue(this._value >> rhs.toIntValue()._value);
	},
	lsh: function(rhs) {
		return new IntValue(this._value << rhs.toIntValue()._value);
	},
	getType: function() {
		return VarType.INT;
	},
	toIntValue: function() {
		return this;
	},
	toDoubleValue: function() {
		return new DoubleValue(this._value);
	},
	toStrValue: function() {
		return new StrValue(this._value);
	},
	toString: function() {
		return '<IntValue:'+this._value+'>';
	}
});

if(typeof HSPonJS != 'undefined') {
	HSPonJS.IntValue = IntValue;
}

