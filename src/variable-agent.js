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
		return this.variable.at(this.getOffset());
	},
	isUsing: function isUsing() {
		return this.toValue().isUsing();
	},
	getbyte: function getbyte(bytesOffset) {
		return this.variable.getbyte(this.getOffset(), bytesOffset);
	},
	setbyte: function setbyte(bytesOffset, val) {
		return this.variable.setbyte(this.getOffset(), bytesOffset, val);
	},
	getbytes: function getbytes(bytesOffset, length) {
		return this.variable.getbytes(this.getOffset(), bytesOffset, length);
	},
	setbytes: function setbytes(bytesOffset, buf) {
		return this.variable.setbytes(this.getOffset(), bytesOffset, buf);
	},
	getByteSize: function getByteSize() {
		return this.variable.getByteSize(this.getOffset());
	},
	expandByteSize: function expandByteSize(size) {
		return this.variable.expandByteSize(this.getOffset(), size);
	},
	ref: function ref() {
		return this.variable.ref(this.getOffset());
	},
	getBuffer: function getBuffer() {
		return this.variable.bufferAt(this.getOffset());
	},
	getOffset: function getOffset() {
		var offset = this.variable.value.getOffset(this.indices);
		if(offset == null) throw new HSPError(ErrorCode.ARRAY_OVERFLOW);
		return offset;
	}
};

function ModVarData() {
	 VariableAgent.apply(this, arguments);
}

ModVarData.prototype = new VariableAgent;

if(typeof HSPonJS != 'undefined') {
	HSPonJS.VariableAgent = VariableAgent;
	HSPonJS.ModVarData = ModVarData;
}

