var Utils = {
	getCStr: function(str, index) {
		var end = str.indexOf("\0", index);
		if(end < 0) end = str.length;
		return str.slice(index, end);
	},
	objectExtend: function(dest, src) {
		for(var p in src) {
			dest[p] = src[p];
		}
		return dest;
	},
	objectMerge: function(a, b) {
		return Utils.objectExtend(Utils.objectExtend({}, a), b);
	},
	aryPopN: function(ary, n) {
		var result = ary.slice(ary.length - n);
		ary.length -= n;
		return result;
	},
	strTimes: function(str, n) {
		var result = '';
		for(var i = 0; i < n; i ++) {
			result += str;
		}
		return result;
	},
	strToSource: function() {
		var table = [];
		(function() {
			for(var i = 0; i < 256; i ++) {
				table[i] = '\\x' + ((0x100+i).toString(16)).slice(1);
			}
			for(var i = 0x20; i <= 0x7e; i ++) {
				table[i] = String.fromCharCode(i);
			}
		//	table[0x08] = '\\b';
			table[0x09] = '\\t';
			table[0x0a] = '\\n';
		//	table[0x0b] = '\\v';
		//	table[0x0c] = '\\f';
			table[0x0d] = '\\r';
			table[0x22] = '\\"';
		//	table[0x27] = '\\\'';
			table[0x5c] = '\\\\';
		})();
		return function(str) {
			var len = str.length;
			var result = '"';
			for(var i = 0; i < len; i ++) {
				var c = str.charCodeAt(i);
				if(c < 0x100) {
					result += table[c];
				} else {
					result += '\\u' + (0x10000+c).toString(16).slice(1);
				}
			}
			return result + '"';
		}
	}(),
	numToSource: function(num) {
		if(num == 0 && 1 / num < 0) {
			return '-0';
		}
		return '' + num;
	}
};

function returnTrue() { return true; }
function returnFalse() { return false; }

if(typeof HSPonJS != 'undefined') {
	HSPonJS.Utils = Utils;
}

