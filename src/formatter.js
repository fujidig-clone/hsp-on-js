var Formatter = {
	sprintf: function sprintf(evaluator, format, args) {
		var argsIndex = 0;
		format = format.toStrValue()._value;
		var re = /%[- #+0-9.]*[%EGXcdefgiopsux]/g;
		var result = format.replace(re, function(str){
			var pos = 1; // '%'.length
			var flags = {};
			var width = 0;
			var prec = null;
			while(true) {
				var c = str.charAt(pos);
				switch(c) {
				case ' ': case '#': case '+': case '-': case '0':
					flags[c] = true;
					pos ++;
					continue;
				case '1': case '2': case '3': case '4': case '5':
				case '6': case '7': case '8': case '9':
					var matched = str.slice(pos).match(/^\d+/)[0];
					width = parseInt(matched);
					pos += matched.length;
					continue;
				case '.':
					pos ++;
					var matched = str.slice(pos).match(/^\d*/)[0];
					pos += matched.length;
					prec = matched.length > 0 ? parseInt(matched) : 0;
					continue;
				default:
					break;
				}
				break;
			}
			var specifier = str.charAt(pos);
			if(specifier == '%') {
				return '%';
			}
			var arg = args[argsIndex++];
			evaluator.scanArg(arg, '.', false);
			return Formatter.ConvertTable[specifier](arg, flags, width, prec);
		});
		if(argsIndex < args.length) {
			throw new HSPError(ErrorCode.TOO_MANY_PARAMETERS);
		}
		return new StrValue(Utils.getCStr(result));
	},
	addSpaces: function addSpaces(str, flags, width) {
		var spaces = Utils.strTimes(' ', Math.max(width - str.length, 0));
		if(flags['-']) {
			return str + spaces;
		} else {
			return spaces + str;
		}
	},
	addZeros: function addZeros(str, width) {
		var length = width - str.length;
		var zeros = Utils.strTimes('0', Math.max(length, 0));
		return zeros + str;
	},
	signPrefix: function signPrefix(isNegative, flags) {
		if(isNegative) {
			return '-';
		} else if(flags['+']) {
			return '+';
		} else if(flags[' ']) {
			return ' ';
		} else {
			return '';
		}
	},
	convertInt: function convertInt(val, flags, width, prec, signed, radix, pre) {
		if(!signed) {
			if(val & 0x80000000) val += 0x100000000;
		}
		var isNegative = val < 0;
		val = Math.abs(val);
		var str = val.toString(radix);
		var prefix = '';
		if(flags['#'] && val != 0) prefix = pre;
		if(signed) {
			prefix = Formatter.signPrefix(isNegative, flags);
		}
		if(prec != null) {
			str = Formatter.addZeros(str, prec);
		} else if(flags['0'] && !flags['-']) {
			str = Formatter.addZeros(str, width - prefix.length);
		}
		str = prefix + str;
		return Formatter.addSpaces(str, flags, width);
	},
	convertMemoryAddress: function convertMemoryAddress(val, flags, width, prec) {
		return Formatter.convertInt(val, {'-': flags['-']}, width, null, false, 16, '');
	},
	convertExp: function convertExp(val, flags, width, prec) {
		if(prec == null) prec = 6;
		var isNegative = val < 0;
		val = Math.abs(val);
		var mantissa, exponent;
		if(isNaN(val)) {
			mantissa = Formatter.convertNaN(prec);
			exponent = 0;
		} else if(val == Infinity) {
			mantissa = Formatter.convertInf(prec);
			exponent = 0;
		} else {
			var str = val.toExponential(Math.min(prec, 16));
			var matched = /^(\d(?:\.\d+)?)e([+-]\d+)$/.exec(str);
			mantissa = matched[1], exponent = parseInt(matched[2]);
			matched = /\.(\d+)e/.exec(str);
			if(matched && matched[1].length < prec) {
				mantissa += Utils.strTimes("0", prec - matched[1].length);
			}
		}
		str = mantissa + "e" + Formatter.convertInt(exponent, {'+': true}, 0, 3, true, 10, '');
		var prefix = Formatter.signPrefix(isNegative, flags);
		if(flags['0'] && !flags['-']) {
			str = Formatter.addZeros(str, width - prefix.length);
		}
		str = prefix + str;
		return Formatter.addSpaces(str, flags, width);
	},
	convertFloatG: function convertFloatG(val, flags, width, prec) {
		if(prec == null) prec = 6;
		var str;
		var isNegative = val < 0;
		val = Math.abs(val);
		if(isNaN(val) || val == Infinity || (1e-4 <= val && val < Math.pow(10, prec))) {
			str = Formatter.convertFloat(val, {}, 0, Math.max(prec - 1, 0));
		} else {
			str = Formatter.convertExp(val, {}, 0, Math.max(prec - 1, 0));
		}
		str = str.replace(/\.(\d*?)0+(?!\d)/, function(s, d) { return d.length > 0 ? '.' + d : ''; });
		var prefix = Formatter.signPrefix(isNegative, flags);
		if(flags['0'] && !flags['-']) {
			str = Formatter.addZeros(str, width - prefix.length);
		}
		str = prefix + str;
		return Formatter.addSpaces(str, flags, width);
	},
	convertFloat: function convertFloat(val, flags, width, prec) {
		if(prec == null) prec = 6;
		var isNegative = val < 0;
		val = Math.abs(val);
		var str = Formatter.convertFloatSub(val, prec);
		var prefix = Formatter.signPrefix(isNegative, flags);
		if(flags['0'] && !flags['-']) {
			str = Formatter.addZeros(str, width - prefix.length);
		}
		str = prefix + str;
		return Formatter.addSpaces(str, flags, width);
	},
	convertFloatSub: function convertFloatSub(val, prec) {
		if(isNaN(val)) return Formatter.convertNaN(prec);
		if(val == Infinity) return Formatter.convertInf(prec);
		var exponent = val != 0 ? Math.floor(Math.log(val) / Math.LN10) : 0;
		var str;
		if(exponent < 0 && -exponent > prec) {
			var up = -exponent-1 == prec && val * Math.pow(10, prec) >= 0.5;
			if(prec == 0) {
				str = up ? '1' : '0';
			} else {
				str = '0.' + Utils.strTimes('0', prec - 1) + (up ? '1' : '0');
			}
			return str;
		}
		var i = 0;
		str = val.toExponential(Math.min(exponent + prec, 16));
		var matched = /^(\d(?:\.\d+)?)e([+-]\d+)$/.exec(str);
		var mantissa = matched[1], exponent = parseInt(matched[2]);
		var matched = /\.(\d+)e/.exec(str);
		if(matched && matched[1].length < exponent + prec) {
			mantissa += Utils.strTimes("0", exponent + prec - matched[1].length);
		}
		if(!matched && exponent + prec > 0) {
			mantissa += '.' + Utils.strTimes("0", exponent + prec);
		}
		str = mantissa;
		if(exponent > 0) {
			str = str.charAt(0) + str.substr(2, exponent) + (prec != 0 ? '.' + str.slice(2 + exponent) : '');
		} else if(exponent < 0) {
			str = '0.' + Utils.strTimes('0', -exponent-1) + str.charAt(0) + str.slice(2);
		}
		return str;
	},
	convertNaN: function convertNaN(prec) {
		switch(prec) {
		case 0: return '1';
		case 1: return '1.$';
		case 2: return '1.#R';
		case 3: return '1.#QO';
		case 4: return '1.#QNB';
		default:return '1.#QNAN' + Utils.strTimes('0', prec - 5);
		}
	},
	convertInf: function convertInf(prec) {
		switch(prec) {
		case 0: return '1';
		case 1: return '1.$';
		case 2: return '1.#J';
		case 3: return '1.#IO';
		default:return '1.#INF' + Utils.strTimes('0', prec - 4);
		}
	}
};

Formatter.ConvertTable = {
	'E': function(val, flags, width, prec) {
		val = val.toDoubleValue()._value;
		return Formatter.convertExp(val, flags, width, prec).toUpperCase();
	},
	'G': function(val, flags, width, prec) {
		val = val.toDoubleValue()._value;
		return Formatter.convertFloatG(val, flags, width, prec).toUpperCase();
	},
	'X': function(val, flags, width, prec) {
		val = val.toIntValue()._value;
		return Formatter.convertInt(val, flags, width, prec, false, 16, '0X').toUpperCase();
	},
	'c': function(val, flags, width, prec) {
		var str = String.fromCharCode(val.toIntValue()._value & 0xff);
		if(flags['0'] && !flags['-']) {
			str = Formatter.addZeros(str, width);
		}
		return Formatter.addSpaces(str, flags, width);
	},
	'd': function(val, flags, width, prec) {
		val = val.toIntValue()._value;
		return Formatter.convertInt(val, flags, width, prec, true, 10, '');
	},
	'e': function(val, flags, width, prec) {
		val = val.toDoubleValue()._value;
		return Formatter.convertExp(val, flags, width, prec);
	},
	'f': function(val, flags, width, prec) {
		val = val.toDoubleValue()._value;
		return Formatter.convertFloat(val, flags, width, prec);
	},
	'g': function(val, flags, width, prec) {
		val = val.toDoubleValue()._value;
		return Formatter.convertFloatG(val, flags, width, prec);
	},
	'i': function(val, flags, width, prec) {
		val = val.toIntValue()._value;
		return Formatter.convertInt(val, flags, width, prec, true, 10, '');
	},
	'o': function(val, flags, width, prec) {
		val = val.toIntValue()._value;
		return Formatter.convertInt(val, flags, width, prec, false, 8, '0');
	},
	'p': function(val, flags, width, prec) {
		val = val.toIntValue()._value;
		return Formatter.convertMemoryAddress(val, flags, width, prec);
	},
	's': function(val, flags, width, prec) {
		var str = val.toStrValue()._value;
		if(prec != null) {
			str = str.slice(0, prec);
		}
		if(flags['0'] && !flags['-']) {
			str = Formatter.addZeros(str, width);
		}
		return Formatter.addSpaces(str, flags, width);
	},
	'u': function(val, flags, width, prec) {
		val = val.toIntValue()._value;
		return Formatter.convertInt(val, flags, width, prec, false, 10, '');
	},
	'x': function(val, flags, width, prec) {
		val = val.toIntValue()._value;
		return Formatter.convertInt(val, flags, width, prec, false, 16, '0x');
	}
};

if(typeof HSPonJS != 'undefined') {
	HSPonJS.Formatter = Formatter;
}


