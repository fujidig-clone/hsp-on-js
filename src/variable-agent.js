function VariableAgent(variable, indices) {
	this.variable = variable;
	this.indices = indices;
}

VariableAgent.prototype = {
	add: function add(rhs) {
		return this.toValue().add(rhs);
	},
	sub: function sub(rhs) {
		return this.toValue().sub(rhs);
	},
	mul: function mul(rhs) {
		return this.toValue().mul(rhs);
	},
	div: function div(rhs) {
		return this.toValue().div(rhs);
	},
	mod: function mod(rhs) {
		return this.toValue().mod(rhs);
	},
	and: function and(rhs) {
		return this.toValue().and(rhs);
	},
	or: function or(rhs) {
		return this.toValue().or(rhs);
	},
	xor: function xor(rhs) {
		return this.toValue().xor(rhs);
	},
	eq: function eq(rhs) {
		return this.toValue().eq(rhs);
	},
	ne: function ne(rhs) {
		return this.toValue().ne(rhs);
	},
	gt: function gt(rhs) {
		return this.toValue().gt(rhs);
	},
	lt: function lt(rhs) {
		return this.toValue().lt(rhs);
	},
	gteq: function gteq(rhs) {
		return this.toValue().gteq(rhs);
	},
	lteq: function lteq(rhs) {
		return this.toValue().lteq(rhs);
	},
	rsh: function rhs(rhs) {
		return this.toValue().rsh(rhs);
	},
	lsh: function lhs(rhs) {
		return this.toValue().lsh(rhs);
	},
	getType: function getType() {
		return this.toValue().getType();
	},
	toIntValue: function toIntValue() {
		return this.toValue().toIntValue();
	},
	toDoubleValue: function toDoubleValue() {
		return this.toValue().toDoubleValue();
	},
	toStrValue: function toStrValue() {
		return this.toValue().toStrValue();
	},
	assign: function assign(rhs) {
		return this.variable.assign(this.indices, rhs);
	},
	toValue: function toValue() {
		var offset = this.variable.value.getOffset(this.indices);
		if(offset == null) throw new HSPError(ErrorCode.ARRAY_OVERFLOW);
		return this.variable.at(offset);
	},
	isUsing: function isUsing() {
		return this.toValue().isUsing();
	},
	getbyte: function getbyte(bytesOffset) {
		var offset = this.variable.value.getOffset(this.indices);
		if(offset == null) throw new HSPError(ErrorCode.ARRAY_OVERFLOW);
		return this.variable.getbyte(offset, bytesOffset);
	},
	setbyte: function setbyte(bytesOffset, val) {
		var offset = this.variable.value.getOffset(this.indices);
		if(offset == null) throw new HSPError(ErrorCode.ARRAY_OVERFLOW);
		return this.variable.setbyte(offset, bytesOffset, val);
	},
	getbytes: function getbytes(bytesOffset, length) {
		var offset = this.variable.value.getOffset(this.indices);
		if(offset == null) throw new HSPError(ErrorCode.ARRAY_OVERFLOW);
		return this.variable.getbytes(offset, bytesOffset, length);
	},
	setbytes: function setbytes(bytesOffset, buf) {
		var offset = this.variable.value.getOffset(this.indices);
		if(offset == null) throw new HSPError(ErrorCode.ARRAY_OVERFLOW);
		return this.variable.setbytes(offset, bytesOffset, buf);
	},
	getByteSize: function getByteSize() {
		var offset = this.variable.value.getOffset(this.indices);
		if(offset == null) throw new HSPError(ErrorCode.ARRAY_OVERFLOW);
		return this.variable.getByteSize(offset);
	},
	expandByteSize: function expandByteSize(size) {
		var offset = this.variable.value.getOffset(this.indices);
		if(offset == null) throw new HSPError(ErrorCode.ARRAY_OVERFLOW);
		return this.variable.expandByteSize(offset, size);
	},
	ref: function ref() {
		var offset = this.variable.value.getOffset(this.indices);
		if(offset == null) throw new HSPError(ErrorCode.ARRAY_OVERFLOW);
		return this.variable.ref(offset);
	}
};

if(typeof HSPonJS != 'undefined') {
	HSPonJS.VariableAgent = VariableAgent;
}

