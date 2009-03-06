function IntArray() {
	HSPArray.call(this);
	this.values = [new IntValue(0)];
}

IntArray.prototype = new HSPArray();

Utils.objectExtend(IntArray.prototype, {
	fillUpElements: function(newLen) {
		var zero = new IntValue(0);
		for(var i = this.values.length; i < newLen; i ++) {
			this.values[i] = zero;
		}
	},
	getType: function() {
		return VarType.INT;
	},
	getbyte: function(offset, bytesOffset) {
		var i = offset + (bytesOffset >> 2);
		if(!(0 <= i && i < this.values.length)) {
			throw new HSPError(ErrorCode.BUFFER_OVERFLOW);
		}
		return this.values[i]._value >> (bytesOffset % 4 * 8) & 0xff;
	},
	setbyte: function(offset, bytesOffset, val) {
		var i = offset + (bytesOffset >> 2);
		if(!(0 <= i && i < this.values.length)) {
			throw new HSPError(ErrorCode.BUFFER_OVERFLOW);
		}
		var value = this.values[i]._value;
		value &= ~(0xff << (bytesOffset % 4 * 8));
		value |= (val & 0xff) << (bytesOffset % 4 * 8);
		this.values[i] = new IntValue(value);
	},
	getByteSize: function(offset) {
		return (this.values.length - offset) * 4;
	},
	inc: function(offset) {
		this.values[offset] = new IntValue(this.values[offset]._value + 1);
	},
	dec: function(offset) {
		this.values[offset] = new IntValue(this.values[offset]._value - 1);
	},
	fillBytes: function(offset, val, length, bytesOffset) {
		var values = this.values;
		var idx = offset + (bytesOffset >> 2);
		var ofs = bytesOffset & 3;
		if(bytesOffset < 0 || idx + ((length + ofs + 3) >> 2) > values.length) {
			throw new HSPError(ErrorCode.BUFFER_OVERFLOW);
		}
		if(length <= 0) return;
		if(ofs) {
			var l = 4 - ofs;
			if(l > length) { l = length; }
			var v = values[idx]._value;
			if(ofs == 1) {
				if(l == 1) { v = v & 0xffff00ff | (val << 8); }
				else if(l == 2) { v = v & 0xff0000ff | (val << 8) | (val << 16); }
				else { v = v & 0x000000ff | (val << 8) | (val << 16) | (val << 24); }
			} else if(ofs == 2) {
				if(l == 1) { v = v & 0xff00ffff | (val << 16); }
				else { v = v & 0x0000ffff | (val << 16) | (val << 24); }
			} else {
				v = v & 0x00ffffff | (val << 24);
			}
			values[idx] = new IntValue(v);
			length -= l;
			if(length == 0) return;
			idx ++;
		}
		var l = idx + (length >> 2);
		var value = new IntValue(val | val << 8 | val << 16 | val << 24);
		
		while(idx < l) {
			values[idx++] = value;
		}
		var l = length & 3;
		if(l) {
			var v = values[idx]._value;
			if(l == 1) {
				v = v & 0xffffff00 | val;
			} else if(l == 2) {
				v = v & 0xffff0000 | val | val << 8;
			} else {
				v = v & 0xff000000 | val | val << 8 | val << 16;
			}
			values[idx] = new IntValue(v);
		}
	}
});

if(typeof HSPonJS != 'undefined') {
	HSPonJS.IntArray = IntArray;
}

