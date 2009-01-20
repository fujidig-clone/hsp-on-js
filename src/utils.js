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
	}
};

if(typeof HSPonJS != 'undefined') {
	HSPonJS.Utils = Utils;
}

