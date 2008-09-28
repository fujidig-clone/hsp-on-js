function VariableAgent(variable, indices) {
	this.variable = variable;
	this.indices = indices;
}

VariableAgent.prototype = {
	add: function add(rhs) {
		return this.variable.at(this.indices).add(rhs);
	},
	sub: function sub(rhs) {
		return this.variable.at(this.indices).sub(rhs);
	},
	mul: function mul(rhs) {
		return this.variable.at(this.indices).mul(rhs);
	},
	div: function div(rhs) {
		return this.variable.at(this.indices).div(rhs);
	},
	mod: function mod(rhs) {
		return this.variable.at(this.indices).mod(rhs);
	},
	and: function and(rhs) {
		return this.variable.at(this.indices).and(rhs);
	},
	or: function or(rhs) {
		return this.variable.at(this.indices).or(rhs);
	},
	xor: function xor(rhs) {
		return this.variable.at(this.indices).xor(rhs);
	},
	eq: function eq(rhs) {
		return this.variable.at(this.indices).eq(rhs);
	},
	ne: function ne(rhs) {
		return this.variable.at(this.indices).ne(rhs);
	},
	gt: function gt(rhs) {
		return this.variable.at(this.indices).gt(rhs);
	},
	lt: function lt(rhs) {
		return this.variable.at(this.indices).lt(rhs);
	},
	gteq: function gteq(rhs) {
		return this.variable.at(this.indices).gteq(rhs);
	},
	lteq: function lteq(rhs) {
		return this.variable.at(this.indices).lteq(rhs);
	},
	rsh: function rhs(rhs) {
		return this.variable.at(this.indices).rsh(rhs);
	},
	lsh: function lhs(rhs) {
		return this.variable.at(this.indices).lsh(rhs);
	},
	getType: function getType() {
		return this.variable.at(this.indices).getType();
	},
	toIntValue: function toIntValue() {
		return this.variable.at(this.indices).toIntValue();
	},
	toDoubleValue: function toDoubleValue() {
		return this.variable.at(this.indices).toDoubleValue();
	},
	toStrValue: function toStrValue() {
		return this.variable.at(this.indices).toStrValue();
	},
	assign: function assign(rhs) {
		return this.variable.assign(this.indices, rhs);
	},
	toValue: function toValue() {
		return this.variable.at(this.indices);
	},
	isUsing: function isUsing() {
		return this.variable.at(this.indices).isUsing();
	},
	getbyte: function getbyte(bytesOffset) {
		return this.variable.getbyte(this.indices, bytesOffset);
	}
};

if(typeof HSPonJS != 'undefined') {
	HSPonJS.VariableAgent = VariableAgent;
}

