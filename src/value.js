function Value() {}

Value.prototype = {
	add: function(rhs) {
		throw this._unsupportedError('+');
	},
	sub: function(rhs) {
		throw this._unsupportedError('-');
	},
	mul: function(rhs) {
		throw this._unsupportedError('*');
	},
	div: function(rhs) {
		throw this._unsupportedError('/');
	},
	mod: function(rhs) {
		throw this._unsupportedError('\\');
	},
	and: function(rhs) {
		throw this._unsupportedError('&');
	},
	or: function(rhs) {
		throw this._unsupportedError('|');
	},
	xor: function(rhs) {
		throw this._unsupportedError('^');
	},
	eq: function(rhs) {
		throw this._unsupportedError('==');
	},
	ne: function(rhs) {
		throw this._unsupportedError('!=');
	},
	gt: function(rhs) {
		throw this._unsupportedError('>');
	},
	lt: function(rhs) {
		throw this._unsupportedError('<');
	},
	gteq: function(rhs) {
		throw this._unsupportedError('>=');
	},
	lteq: function(rhs) {
		throw this._unsupportedError('<=');
	},
	rsh: function(rhs) {
		throw this._unsupportedError('>>');
	},
	lsh: function(rhs) {
		throw this._unsupportedError('<<');
	},
	getType: function() {
		return VarType.NONE;
	},
	toIntValue: function() {
		throw this._convertError("int");
	},
	toDoubleValue: function() {
		throw this._convertError("double");
	},
	toStrValue: function() {
		throw this._convertError("str");
	},
	toValue: function() {
		return this;
	},
	_unsupportedError: function(op) {
		return new HSPError(ErrorCode.UNSUPPORTED_FUNCTION,
		                    VarTypeNames[this.getType()]+" 型は `"+op+"' 演算子をサポートしていません");
	},
	_convertError: function(type) {
		return new HSPError(ErrorCode.UNSUPPORTED_FUNCTION,
		                    VarTypeNames[this.getType()]+" 型は "+type + " に変換できません");
	},
	toString: function() {
		return '<Value>';
	},
	isUsing: function() {
		return null;
	},
	isVariable: function() {
		return false;
	}
};

if(typeof HSPonJS != 'undefined') {
	HSPonJS.Value = Value;
}

