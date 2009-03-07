function StrArray() {
	HSPArray.call(this);
	this.values = [new StrBuffer(64)];
}

StrArray.prototype = new HSPArray();

Utils.objectExtend(StrArray.prototype, {
	assign: function(offset, rhs) {
		this.values[offset].assign(rhs);
	},
	fillUpElements: function(newLen) {
		for(var i = this.values.length; i < newLen; i ++) {
			this.values[i] = new StrBuffer(64);
		}
	},
	at: function(offset) {
		return this.values[offset].getValue();
	},
	type: VarType.STR,
	strDim: function(strLength, l0, l1, l2, l3) {
		if(strLength < 64) {
			strLength = 64;
		}
		this.setLength(l0, l1, l2, l3);
		var len = this.allLength();
		for(var i = 0; i < len; i ++) {
			this.values[i] = new StrBuffer(strLength);
		}
	},
	getbyte: function(offset, bytesOffset) {
		return this.values[offset].getbyte(bytesOffset);
	},
	setbyte: function(offset, bytesOffset, val) {
		this.values[offset].setbyte(bytesOffset, val);
	},
	getbytes: function(offset, bytesOffset, length) {
		return this.values[offset].getbytes(bytesOffset, length);
	},
	setbytes: function(offset, bytesOffset, buf) {
		this.values[offset].setbytes(bytesOffset, buf);
	},
	getByteSize: function(offset) {
		return this.values[offset].getByteSize();
	},
	expandByteSize: function(offset, size) {
		this.values[offset].expandByteSize(size);
	},
	bufferAt: function(offset) {
		return this.values[offset];
	},
	inc: function(offset) {
		var buf = this.values[offset];
		buf.assign(new StrValue(buf.getValue()._value + '1'));
	}
});

if(typeof HSPonJS != 'undefined') {
	HSPonJS.StrArray = StrArray;
}

