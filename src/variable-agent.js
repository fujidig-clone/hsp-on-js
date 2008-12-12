function VariableAgent() {
	this.variable = null;
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
	rsh: function rsh(rhs) {
		return this.toValue().rsh(rhs);
	},
	lsh: function lsh(rhs) {
		return this.toValue().lsh(rhs);
	},
	getType: function getType() {
		return this.variable.getType();
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
	inc: function inc() {
		return this.variable.inc(this.getOffset());
	},
	dec: function dec() {
		return this.variable.dec(this.getOffset());
	},
	toValue: function toValue() {
		return this.variable.at(this.getOffset());
	},
	isVariable: function isVariable() {
		return true;
	},
	indices: null
};

function VariableAgent0D(variable) {
	this.variable = variable;
}

VariableAgent0D.prototype = new VariableAgent;

Utils.objectExtend(VariableAgent0D.prototype, {
	getOffset: function getOffset() {
		return 0;
	},
	toValue: function toValue() {
		return this.variable.at(0);
	},
	assign: function assign(rhs) {
		var type = rhs.getType();
		var variable = this.variable;
		if(variable.value.getType() != type) {
			variable.reset(type);
		}
		variable.value.assign(0, rhs);
	},
	expand: function expand() {
	},
	offset: 0,
	existSubscript: false
});

function VariableAgent1D(variable, offset) {
	this.variable = variable;
	this.offset = offset;
}

VariableAgent1D.prototype = new VariableAgent;

Utils.objectExtend(VariableAgent1D.prototype, {
	getOffset: function getOffset() {
		var offset = this.offset;
		if(0 <= offset && offset < this.variable.value.getL0()) {
			return offset;
		} else {
			throw new HSPError(ErrorCode.ARRAY_OVERFLOW);
		}
	},
	assign: function assign(rhs) {
		var offset = this.offset;
		var array = variable.value;
		var type = rhs.getType();
		if(array.getType() != type) {
		    if(offset == 0) {
		        variable.reset(type);
		        array = variable.value;
		    } else {
		        throw new HSPError(ErrorCode.INVALID_ARRAYSTORE);
		    }
		}
		array.expand1D(offset);
		array.assign(offset, arg);
	},
	expand: function expand() {
		this.variable.value.expand1D(this.offset);
	},
	existSubscript: true
});

function VariableAgentMD(variable, indices) {
	this.variable = variable;
	this.indices = indices;
}

VariableAgentMD.prototype = new VariableAgent;

Utils.objectExtend(VariableAgentMD.prototype, {
	getOffset: function getOffset() {
		var offset = this.variable.value.getOffset(this.indices);
		if(offset == null) throw new HSPError(ErrorCode.ARRAY_OVERFLOW);
		return offset;
	},
	assign: function assign(rhs) {
		return this.variable.assign(this.indices, rhs);
	},
	expand: function expand() {
		this.variable.expand(this.indices);
	},
	existSubscript: true
});



if(typeof HSPonJS != 'undefined') {
	HSPonJS.VariableAgent = VariableAgent;
	HSPonJS.VariableAgent0D = VariableAgent0D;
	HSPonJS.VariableAgent1D = VariableAgent1D;
	HSPonJS.VariableAgentMD = VariableAgentMD;
	
}

