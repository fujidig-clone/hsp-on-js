/**
 * 文字列値のクラス（不変）
 * @param str CP932 エンコード済みの文字列
 */
function StrValue(str) {
	this._value = '' + str;
}

StrValue.prototype = new Value;

StrValue.EMPTY_STR = new StrValue('');
StrValue.of = function of(str) {
	if(str.length == 0) {
		return StrValue.EMPTY_STR;
	}
	return new StrValue(str);
}

Utils.objectExtend(StrValue.prototype, {
	add: function add(rhs) {
		return new StrValue(this._value + rhs.toStrValue()._value);
	},
	eq: function eq(rhs) {
		return new IntValue(this._value == rhs.toStrValue()._value);
	},
	ne: function ne(rhs) {
		return new IntValue(this._value != rhs.toStrValue()._value);
	},
	gt: function gt(rhs) {
		return new IntValue(this._value > rhs.toStrValue()._value);
	},
	lt: function lt(rhs) {
		return new IntValue(this._value < rhs.toStrValue()._value);
	},
	gteq: function gteq(rhs) {
		return new IntValue(this._value >= rhs.toStrValue()._value);
	},
	lteq: function lteq(rhs) {
		return new IntValue(this._value <= rhs.toStrValue()._value);
	},
	getType: function getType() {
		return VarType.STR;
	},
	toIntValue: function toIntValue() {
		// FIXME $ で始まると 16 進数として解釈するように
		return new IntValue(this._value);
	},
	toDoubleValue: function toDoubleValue() {
		var n = +this._value;
		if(isNaN(n)) n = 0;
		return new DoubleValue(n);
	},
	toStrValue: function toStrValue() {
		return this;
	},
	toString: function toString() {
		return '<StrValue:'+this._value+'>';
	},
	indexOf: function indexOf(pattern, fromIndex) {
		var str = this._value;
		var length = str.length;
		var pos = fromIndex;
		var patternLength = pattern.length;
		if(patternLength == 0) return -1;
		while(pos + patternLength <= length) {
			if(str.substr(pos, patternLength) == pattern) {
				return pos;
			}
			var c = str.charCodeAt(pos);
			pos ++;
			if((0x81 <= c && c <= 0x9F) || (0xE0 <= c && c <= 0xFC)) {
				pos ++;
			}
		}
		return -1;
	}
});

if(typeof HSPonJS != 'undefined') {
	HSPonJS.StrValue = StrValue;
}

