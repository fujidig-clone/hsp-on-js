function Value() {}

Value.prototype = {
	add: function add(rhs) {
		throw this._unsupportedError('+');
	},
	sub: function sub(rhs) {
		throw this._unsupportedError('-');
	},
	mul: function mul(rhs) {
		throw this._unsupportedError('*');
	},
	div: function div(rhs) {
		throw this._unsupportedError('/');
	},
	mod: function mod(rhs) {
		throw this._unsupportedError('\\');
	},
	and: function and(rhs) {
		throw this._unsupportedError('&');
	},
	or: function or(rhs) {
		throw this._unsupportedError('|');
	},
	xor: function xor(rhs) {
		throw this._unsupportedError('^');
	},
	eq: function eq(rhs) {
		throw this._unsupportedError('==');
	},
	ne: function ne(rhs) {
		throw this._unsupportedError('!=');
	},
	gt: function gt(rhs) {
		throw this._unsupportedError('>');
	},
	lt: function lt(rhs) {
		throw this._unsupportedError('<');
	},
	gteq: function gteq(rhs) {
		throw this._unsupportedError('>=');
	},
	lteq: function lteq(rhs) {
		throw this._unsupportedError('<=');
	},
	rsh: function rsh(rhs) {
		throw this._unsupportedError('>>');
	},
	lsh: function lsh(rhs) {
		throw this._unsupportedError('<<');
	},
	getType: function getType() {
		return VarType.NONE;
	},
	toIntValue: function toIntValue() {
		throw this._convertError("int");
	},
	toDoubleValue: function toDoubleValue() {
		throw this._convertError("double");
	},
	toStrValue: function toStrValue() {
		throw this._convertError("str");
	},
	toValue: function toValue() {
		return this;
	},
	_unsupportedError: function _unsupportedError(op) {
		return new HSPError(ErrorCode.UNSUPPORTED_FUNCTION,
		                    VarTypeNames[this.getType()]+" 型は `"+op+"' 演算子をサポートしていません");
	},
	_convertError: function _convertError(type) {
		return new HSPError(ErrorCode.UNSUPPORTED_FUNCTION,
		                    VarTypeNames[this.getType()]+" 型は "+type + " に変換できません");
	},
	toString: function toString() {
		return '<Value>';
	},
	isUsing: function isUsing() {
		return null;
	},
	isVariable: function isVariable() {
		return false;
	}
};

if(typeof HSPonJS != 'undefined') {
	HSPonJS.Value = Value;
}

