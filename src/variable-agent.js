function VariableAgent() {
	this.variable = null;
}

VariableAgent.prototype = {
	add: function(rhs) {
		return this.toValue().add(rhs);
	},
	sub: function(rhs) {
		return this.toValue().sub(rhs);
	},
	mul: function(rhs) {
		return this.toValue().mul(rhs);
	},
	div: function(rhs) {
		return this.toValue().div(rhs);
	},
	mod: function(rhs) {
		return this.toValue().mod(rhs);
	},
	and: function(rhs) {
		return this.toValue().and(rhs);
	},
	or: function(rhs) {
		return this.toValue().or(rhs);
	},
	xor: function(rhs) {
		return this.toValue().xor(rhs);
	},
	eq: function(rhs) {
		return this.toValue().eq(rhs);
	},
	ne: function(rhs) {
		return this.toValue().ne(rhs);
	},
	gt: function(rhs) {
		return this.toValue().gt(rhs);
	},
	lt: function(rhs) {
		return this.toValue().lt(rhs);
	},
	gteq: function(rhs) {
		return this.toValue().gteq(rhs);
	},
	lteq: function(rhs) {
		return this.toValue().lteq(rhs);
	},
	rsh: function(rhs) {
		return this.toValue().rsh(rhs);
	},
	lsh: function(rhs) {
		return this.toValue().lsh(rhs);
	},
	toIntValue: function() {
		return this.toValue().toIntValue();
	},
	toDoubleValue: function() {
		return this.toValue().toDoubleValue();
	},
	toStrValue: function() {
		return this.toValue().toStrValue();
	},
	isUsing: function() {
		return this.toValue().isUsing();
	},
	getbyte: function(bytesOffset) {
		return this.variable.value.getbyte(this.getOffset(), bytesOffset);
	},
	setbyte: function(bytesOffset, val) {
		return this.variable.value.setbyte(this.getOffset(), bytesOffset, val);
	},
	getbytes: function(bytesOffset, length) {
		return this.variable.value.getbytes(this.getOffset(), bytesOffset, length);
	},
	setbytes: function(bytesOffset, buf) {
		return this.variable.value.setbytes(this.getOffset(), bytesOffset, buf);
	},
	getByteSize: function() {
		return this.variable.value.getByteSize(this.getOffset());
	},
	expandByteSize: function(size) {
		return this.variable.value.expandByteSize(this.getOffset(), size);
	},
	ref: function() {
		return this.variable.value.ref(this.getOffset());
	},
	getBuffer: function() {
		return this.variable.value.bufferAt(this.getOffset());
	},
	inc: function() {
		return this.variable.value.inc(this.getOffset());
	},
	dec: function() {
		return this.variable.value.dec(this.getOffset());
	},
	fillBytes: function(val, length, bytesOffset) {
		return this.variable.value.fillBytes(this.getOffset(), val, length, bytesOffset);
	},
	toValue: function() {
		return this.variable.value.at(this.getOffset());
	},
	isVariable: function() {
		return true;
	},
	indices: null
};

function VariableAgent0D(variable) {
	this.variable = variable;
}

VariableAgent0D.prototype = new VariableAgent;

Utils.objectExtend(VariableAgent0D.prototype, {
	getOffset: function() {
		return 0;
	},
	toValue: function() {
		return this.variable.value.at(0);
	},
	assign: function(rhs) {
		var type = rhs.type;
		var variable = this.variable;
		if(variable.value.type != type) {
			variable.reset(type);
		}
		variable.value.assign(0, rhs);
	},
	expand: function() {
		return this;
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
	getOffset: function() {
		var offset = this.offset;
		if(0 <= offset && offset < this.variable.value.getL0()) {
			return offset;
		} else {
			throw new HSPError(ErrorCode.ARRAY_OVERFLOW);
		}
	},
	assign: function(rhs) {
		var offset = this.offset;
		var variable = this.variable;
		var array = variable.value;
		var type = rhs.type;
		if(array.type != type) {
		    if(offset == 0) {
		        variable.reset(type);
		        array = variable.value;
		    } else {
		        throw new HSPError(ErrorCode.INVALID_ARRAYSTORE);
		    }
		}
		array.expand1D(offset);
		array.assign(offset, rhs);
	},
	expand: function() {
		this.variable.value.expand1D(this.offset);
		return this;
	},
	existSubscript: true
});

function VariableAgentMD(variable, indices) {
	this.variable = variable;
	this.indices = indices;
}

VariableAgentMD.prototype = new VariableAgent;

Utils.objectExtend(VariableAgentMD.prototype, {
	getOffset: function() {
		var offset = this.variable.value.getOffset(this.indices);
		if(offset == null) throw new HSPError(ErrorCode.ARRAY_OVERFLOW);
		return offset;
	},
	assign: function(rhs) {
		return this.variable.assign(this.indices, rhs);
	},
	expand: function() {
		this.variable.expand(this.indices);
		return this;
	},
	existSubscript: true
});



if(typeof HSPonJS != 'undefined') {
	HSPonJS.VariableAgent = VariableAgent;
	HSPonJS.VariableAgent0D = VariableAgent0D;
	HSPonJS.VariableAgent1D = VariableAgent1D;
	HSPonJS.VariableAgentMD = VariableAgentMD;
	
}

