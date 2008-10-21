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
};

Utils.objectExtend(StrValue.prototype, {
	add: function add(rhs) {
		return new StrValue(this._value + rhs.toStrValue()._value);
	},
	eq: function eq(rhs) {
		return new IntValue(this._value == rhs.toStrValue()._value);
	},
	ne: function ne(rhs) {
		var l = this._value, r = rhs.toStrValue()._value;
		if(l == r) {
			return new IntValue(0);
		} else if(l > r) {
			return new IntValue(1);
		} else {
			return new IntValue(-1);
		}
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
		if(this._value.charAt(0) == '$') {
			var n = 0;
			for(var i = 1; i < this._value.length; i ++) {
				n *= 16;
				var c = this._value.charCodeAt(i);
				if(0x30 <= c && c <= 0x39) { // '0' .. '9'
					n += c - 0x30;
				} else if(0x41 <= c && c <= 0x46) { // 'A' .. 'F'
					n += c - 0x41 + 10;
				} else if(0x61 <= c && c <= 0x66) { // 'a' .. 'f'
					n += c - 0x61 + 10;
				} else {
					// オフィシャル HSP で '0'..'9', 'A'..'F', 'a'..'f' 以外の文字は
					//  '0' と同じと認識するという謎の動作を行うのでひとまずそれと同じ動作をする
					// break;
				}
			}
			return new IntValue(n);
		}
		return new IntValue(parseInt(this._value, 10));
	},
	toDoubleValue: function toDoubleValue() {
		var n = parseFloat(this._value);
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
	},
	lineIndex: function lineIndex(lineNumber) {
		if(lineNumber < 0) return null;
		var str = this._value;
		var i = 0;
		var result;
		var tag = new Object;
		try {
			str.replace(/.*(?:\r\n|[\r\n]|.$)/g, function(s, l) {
				if(i++ == lineNumber) {
					result = l;
					throw tag;
				}
			});
			return null;
		} catch(e) {
			if(e !== tag) throw e;
			return result;
		}
	},
	lineLength: function lineLength(index) {
		var str = this._value;
		return /[\r\n]|$/.exec(str.slice(index)).index;
	},
	lineLengthIncludeCR: function lineLengthIncludeCR(index) {
		var str = this._value;
		var matched = /\r\n|[\r\n]|$/.exec(str.slice(index));
		return matched.index + matched[0].length;
	}
});

if(typeof HSPonJS != 'undefined') {
	HSPonJS.StrValue = StrValue;
}

