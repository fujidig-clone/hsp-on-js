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
		// ネイティブの String#indexOf でマッチする部分を探し、
		// マッチした部分が二バイト文字の途中からでないか 1 バイトずつ戻っていきながらチェックする
		
		function isSJISSecondByte(str, index, begin) {
			var result = false;
			while(true) {
				if(index == begin) return result;
				var c = str.charCodeAt(index - 1);
				if(!((0x81 <= c && c <= 0x9F) || (0xE0 <= c && c <= 0xFC))) {
					return result;
				}
				index --;
				result = ! result;
			}
		}
		var str = this._value;
		var length = str.length;
		var pos = fromIndex;
		var patternLength = pattern.length;
		if(patternLength == 0) return -1;
		var c = pattern.charCodeAt(0);
		if(!((0x40 <= c && c <= 0x7E) || (0x80 <= c <= 0xFC))) {
			// pattern の一文字目が SJIS 第二バイトの範囲外なら String#indexOf の結果をそのまま返す
			return str.indexOf(pattern, pos);
		}
		while(true) {
			var index = str.indexOf(pattern, pos);
			if(index == -1) return -1;
			if(!isSJISSecondByte(str, index, pos)) {
				return index;
			}
			pos = index + 1;
		} 
	}
});

if(typeof HSPonJS != 'undefined') {
	HSPonJS.StrValue = StrValue;
}

