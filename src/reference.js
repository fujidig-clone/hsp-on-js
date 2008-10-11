function Reference(value, offset) {
	this.value = value;
	this.base = offset;
	this.l0 = value.values.length - offset;
}

Reference.prototype = {
	assign: function assign(offset, rhs) {
		return this.value.assign(this.base + offset, rhs);
	},
	expand: function expand(indices) {
		var offset = indices.length > 0 ? indices[0] : 0;
		if(indices.length > 1 || offset < 0 || offset >= this.l0) {
			throw new HSPError(ErrorCode.ARRAY_OVERFLOW);
		}
		return false;
	},
	getOffset: function getOffset(indices) {
		var offset = indices.length > 0 ? indices[0] : 0;
		if(indices.length > 1 || offset < 0 || offset >= this.l0) {
			return null;
		}
		return offset;
	},
	getType: function getType() {
		return this.value.getType();
	},
	at: function at(offset) {
		return this.value.at(this.base + offset);
	},
	getL0: function getL0() {
		return this.l0;
	},
	getL1: function getL1() {
		return 0;
	},
	getL2: function getL2() {
		return 0;
	},
	getL3: function getL3() {
		return 0;
	},
	getbyte: function getbyte(offset, bytesOffset) {
		return this.value.getbyte(this.base + offset, bytesOffset);
	},
	setbyte: function setbyte(offset, bytesOffset, val) {
		return this.value.setbyte(this.base + offset, bytesOffset, val);
	},
	getbytes: function getbytes(offset, bytesOffset, length) {
		return this.value.getbytes(this.base + offset, bytesOffset, length);
	},
	setbytes: function setbytes(offset, bytesOffset, buf) {
		return this.value.setbytes(this.base + offset, bytesOffset, buf);
	},
	getByteSize: function getByteSize(offset) {
		return this.value.getByteSize(this.base + offset);
	},
	expandByteSize: function expandByteSize(offset, size) {
		return this.value.expandByteSize(this.base + offset, size);
	},
	ref: function ref(offset) {
		if(offset == 0) {
			return this;
		}
		return new Reference(this.value, this.base + offset);
	}
};

if(typeof HSPonJS != 'undefined') {
	HSPonJS.Reference = Reference;
}


