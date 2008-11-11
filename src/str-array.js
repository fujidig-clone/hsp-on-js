function StrArray() {
	HSPArray.call(this);
	this.values = [new StrBuffer(64)];
}

StrArray.prototype = new HSPArray();

Utils.objectExtend(StrArray.prototype, {
	assign: function assign(offset, rhs) {
		this.values[offset].assign(rhs);
	},
	expand: function expand(indices) {
		var isExpanded = this.expandLen(indices);
		if(isExpanded) {
			var newLen = this.allLength();
			for(var i = this.values.length; i < newLen; i ++) {
				this.values[i] = new StrBuffer(64);
			}
		}
		return isExpanded;
	},
	expand1D: function expand1D(index) {
		var isExpanded = this.expandLen1D(index);
		if(isExpanded) {
			var newLen = this.l0;
			for(var i = this.values.length; i < newLen; i ++) {
				this.values[i] = new StrBuffer(64);
			}
		}
		return isExpanded;
	}, 
	at: function at(offset) {
		return this.values[offset].getValue();
	},
	getType: function getType() {
		return VarType.STR;
	},
	strDim: function strDim(strLength, l0, l1, l2, l3) {
		if(strLength == undefined || strLength <= 64) {
			strLength = 64;
		}
		var indices = HSPArray.lengthToIndices(l0, l1, l2, l3);
		this.expandLen(indices);
		var len = this.allLength();
		for(var i = 0; i < len; i ++) {
			this.values[i] = new StrBuffer(strLength);
		}
	},
	getbyte: function getbyte(offset, bytesOffset) {
		return this.values[offset].getbyte(bytesOffset);
	},
	setbyte: function setbyte(offset, bytesOffset, val) {
		this.values[offset].setbyte(bytesOffset, val);
	},
	getbytes: function getbytes(offset, bytesOffset, length) {
		return this.values[offset].getbytes(bytesOffset, length);
	},
	setbytes: function setbytes(offset, bytesOffset, buf) {
		this.values[offset].setbytes(bytesOffset, buf);
	},
	getByteSize: function getByteSize(offset) {
		return this.values[offset].getByteSize();
	},
	expandByteSize: function expandByteSize(offset, size) {
		this.values[offset].expandByteSize(size);
	},
	bufferAt: function bufferAt(offset) {
		return this.values[offset];
	},
	inc: function inc(offset) {
		var buf = this.values[offset];
		buf.assign(new StrValue(buf.getValue()._value + '1'));
	}
});

if(typeof HSPonJS != 'undefined') {
	HSPonJS.StrArray = StrArray;
}

