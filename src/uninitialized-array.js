function UninitializedArray(varName) {
	HSPArray.call(this);
	this.varName = varName;
}

UninitializedArray.prototype = new HSPArray;

Utils.objectExtend(UninitializedArray.prototype, {
	type: 0,
	assign: function(offset, rhs) {
		throw this.uninitializedError();
	},
	at: function(offset) {
		throw this.uninitializedError();
	},
	getbyte: function(offset, bytesOffset) {
		throw this.uninitializedError();
	},
	setbyte: function(offset, bytesOffset, val) {
		throw this.uninitializedError();
	},
	getbytes: function(offset, bytesOffset, length) {
		throw this.uninitializedError();
	},
	setbytes: function(offset, bytesOffset, buf) {
		throw this.uninitializedError();
	},
	getByteSize: function(offset) {
		throw this.uninitializedError();
	},
	expandByteSize: function(offset, size) {
		throw this.uninitializedError();
	},
	ref: function(offset) {
		throw this.uninitializedError();
	},
	bufferAt: function(offset) {
		throw this.uninitializedError();
	},
	inc: function(offset) {
		throw this.uninitializedError();
	},
	dec: function(offset) {
		throw this.uninitializedError();
	},
	getValues: function() {
		throw this.uninitializedError();
	},
	getValuesStartOffset: function() {
		throw this.uninitializedError();
	},
	expand: function(indices) {
		throw this.uninitializedError();
	},
	expand1D: function(index) {
		throw this.uninitializedError();
	},
	uninitializedError: function() {
		return new HSPError(ErrorCode.UNINITIALIZED_VARIABLE, "未初期化の変数 `"+this.varName+"' を参照しました");
	}
});

if(typeof HSPonJS != 'undefined') {
	HSPonJS.UninitializedArray = UninitializedArray;
}


