function UninitializedArray(varName) {
	HSPArray.call(this);
	this.varName = varName;
}

UninitializedArray.prototype = new HSPArray;

Utils.objectExtend(UninitializedArray.prototype, {
	getType: function() { return 0; },
	assign: function assign(offset, rhs) {
		throw this.uninitializedError();
	},
	at: function at(offset) {
		throw this.uninitializedError();
	},
	getbyte: function getbyte(offset, bytesOffset) {
		throw this.uninitializedError();
	},
	setbyte: function setbyte(offset, bytesOffset, val) {
		throw this.uninitializedError();
	},
	getbytes: function getbytes(offset, bytesOffset, length) {
		throw this.uninitializedError();
	},
	setbytes: function setbytes(offset, bytesOffset, buf) {
		throw this.uninitializedError();
	},
	getByteSize: function getByteSize(offset) {
		throw this.uninitializedError();
	},
	expandByteSize: function expandByteSize(offset, size) {
		throw this.uninitializedError();
	},
	ref: function ref(offset) {
		throw this.uninitializedError();
	},
	bufferAt: function bufferAt(offset) {
		throw this.uninitializedError();
	},
	inc: function inc(offset) {
		throw this.uninitializedError();
	},
	dec: function dec(offset) {
		throw this.uninitializedError();
	},
	expand: function expand(indices) {
		throw this.uninitializedError();
	},
	expand1D: function expand1D(index) {
		throw this.uninitializedError();
	},
	uninitializedError: function uninitializedError() {
		return new HSPError(ErrorCode.UNINITIALIZED_VARIABLE, "未初期化の変数 `"+this.varName+"' を参照しました");
	}
});

if(typeof HSPonJS != 'undefined') {
	HSPonJS.UninitializedArray = UninitializedArray;
}


