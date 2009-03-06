function Reference(value, offset) {
	this.value = value;
	this.base = offset;
	this.l0 = value.values.length - offset;
}

Reference.prototype = {
	assign: function(offset, rhs) {
		return this.value.assign(this.base + offset, rhs);
	},
	expand: function(indices) {
		var offset = indices.length > 0 ? indices[0] : 0;
		if(indices.length > 1 || offset < 0 || offset >= this.l0) {
			throw new HSPError(ErrorCode.ARRAY_OVERFLOW);
		}
		return false;
	},
	expand1D: function(index) {
		if(index < 0 || index >= this.l0) {
			throw new HSPError(ErrorCode.ARRAY_OVERFLOW);
		}
		return false;
	},
	getOffset: function(indices) {
		var offset = indices.length > 0 ? indices[0] : 0;
		if(indices.length > 1 || offset < 0 || offset >= this.l0) {
			return null;
		}
		return offset;
	},
	getType: function() {
		return this.value.getType();
	},
	at: function(offset) {
		return this.value.at(this.base + offset);
	},
	getL0: function() {
		return this.l0;
	},
	getL1: function() {
		return 0;
	},
	getL2: function() {
		return 0;
	},
	getL3: function() {
		return 0;
	},
	getbyte: function(offset, bytesOffset) {
		return this.value.getbyte(this.base + offset, bytesOffset);
	},
	setbyte: function(offset, bytesOffset, val) {
		return this.value.setbyte(this.base + offset, bytesOffset, val);
	},
	getbytes: function(offset, bytesOffset, length) {
		return this.value.getbytes(this.base + offset, bytesOffset, length);
	},
	setbytes: function(offset, bytesOffset, buf) {
		return this.value.setbytes(this.base + offset, bytesOffset, buf);
	},
	getByteSize: function(offset) {
		return this.value.getByteSize(this.base + offset);
	},
	expandByteSize: function(offset, size) {
		return this.value.expandByteSize(this.base + offset, size);
	},
	bufferAt: function(offset) {
		return this.value.bufferAt(this.base + offset);
	},
	ref: function(offset) {
		if(offset == 0) {
			return this;
		}
		return new Reference(this.value, this.base + offset);
	},
	inc: function(offset) {
		return this.value.inc(this.base + offset);
	},
	dec: function(offset) {
		return this.value.dec(this.base + offset);
	},
	getValues: function() {
		return this.value.getValues();
	},
	getValuesStartOffset: function() {
		return this.base;
	},
	fillBytes: function(offset, val, length, bytesOffset) {
		return this.value.fillBytes(this.base + offset, val, length, bytesOffset);
	}
};

if(typeof HSPonJS != 'undefined') {
	HSPonJS.Reference = Reference;
}


