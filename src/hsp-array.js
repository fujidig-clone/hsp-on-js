function HSPArray() {
	this.l0 = 1;
	this.l1 = 0;
	this.l2 = 0;
	this.l3 = 0;
}

HSPArray.prototype = {
	assign: function(offset, rhs) {
		this.values[offset] = rhs.toValue();
	},
	expand: function(indices) {
		if(indices.length > 4) {
			throw new HSPError(ErrorCode.ARRAY_OVERFLOW);
		}
		if(this.getOffset(indices) != null) return false;
		var lastDimension = this.countDimensions() - 1;
		var l0 = this.l0;
		var l1 = this.l1;
		var l2 = this.l2;
		var l3 = this.l3;
		if(indices.length > 0 && indices[0] >= l0) {
			if(lastDimension > 0) throw new HSPError(ErrorCode.ARRAY_OVERFLOW);
			l0 = indices[0] + 1;
		}
		if(indices.length > 1 && indices[1] >= l1) {
			if(lastDimension > 1) throw new HSPError(ErrorCode.ARRAY_OVERFLOW);
			l1 = indices[1] + 1;
		}
		if(indices.length > 2 && indices[2] >= l2) {
			if(lastDimension > 2) throw new HSPError(ErrorCode.ARRAY_OVERFLOW);
			l2 = indices[2] + 1;
		}
		if(indices.length > 3 && indices[3] >= l3) {
			if(lastDimension > 3) throw new HSPError(ErrorCode.ARRAY_OVERFLOW);
			l3 = indices[3] + 1;
		}
		switch(indices.length) {
		case 4:
			if(indices[3] < 0) throw new HSPError(ErrorCode.ARRAY_OVERFLOW);
		case 3:
			if(indices[2] < 0) throw new HSPError(ErrorCode.ARRAY_OVERFLOW);
		case 2:
			if(indices[1] < 0) throw new HSPError(ErrorCode.ARRAY_OVERFLOW);
		case 1:
			if(indices[0] < 0) throw new HSPError(ErrorCode.ARRAY_OVERFLOW);
		}
		this.l0 = l0;
		this.l1 = l1;
		this.l2 = l2;
		this.l3 = l3;
		this.fillUpElements(this.allLength());
		return true;
	},
	expand1D: function(index) {
		if(index < 0) throw new HSPError(ErrorCode.ARRAY_OVERFLOW);
		if(index < this.l0) return false;
		if(this.l1) throw new HSPError(ErrorCode.ARRAY_OVERFLOW);
		this.l0 = index + 1;
		this.fillUpElements(this.l0);
		return true;
	},
	getOffset: function(indices) {
		if(indices.length > this.countDimensions()) {
			return null;
		}
		var offset = 0;
		switch(indices.length) {
		case 4:
			if(!(0 <= indices[3] && indices[3] < this.l3)) return null;
			offset = (offset + indices[3]) * this.l2;
		case 3:
			if(!(0 <= indices[2] && indices[2] < this.l2)) return null;
			offset = (offset + indices[2]) * this.l1;
		case 2:
			if(!(0 <= indices[1] && indices[1] < this.l1)) return null;
			offset = (offset + indices[1]) * this.l0;
		case 1:
			if(!(0 <= indices[0] && indices[0] < this.l0)) return null;
			offset = offset + indices[0];
		}
		return offset;
	},
	countDimensions: function() {
		if(!this.l1) return 1;
		if(!this.l2) return 2;
		if(!this.l3) return 3;
		return 4;
	},
	allLength: function() {
		var length = this.l0;
		if(this.l1) length *= this.l1;
		if(this.l2) length *= this.l2;
		if(this.l3) length *= this.l3;
		return length;
	},
	setLength: function(l0, l1, l2, l3) {
		if(l0 < 0 || l1 < 0 || l2 < 0 || l3 < 0) {
			throw new HSPError(ErrorCode.ILLEGAL_FUNCTION, '配列の要素数に負の数が指定されています');
		}
		if(l3) {
			if(!l2) l2 = 1;
			if(!l1) l1 = 1;
		} else if(l2) {
			if(!l1) l1 = 1;
		}
		if(!l0) l0 = 1;
		this.l0 = l0;
		this.l1 = l1;
		this.l2 = l2;
		this.l3 = l3;
	},
	at: function(offset) {
		return this.values[offset];
	},
	getL0: function() { return this.l0; },
	getL1: function() { return this.l1; },
	getL2: function() { return this.l2; },
	getL3: function() { return this.l3; },
	getbyte: function(offset, bytesOffset) {
		throw new HSPError(ErrorCode.UNSUPPORTED_FUNCTION,
		                   VarTypeNames[this.getType()]+" 型はメモリ読み込みに対応していません");
	},
	setbyte: function(offset, bytesOffset, val) {
		throw new HSPError(ErrorCode.UNSUPPORTED_FUNCTION,
		                   VarTypeNames[this.getType()]+" 型はメモリ書き込みに対応していません");
	},
	getbytes: function(offset, bytesOffset, length) {
		var result = "";
		for(var i = 0; i < length; i ++) {
			result += String.fromCharCode(this.getbyte(offset, bytesOffset + i));
		}
		return result;
	},
	setbytes: function(offset, bytesOffset, buf) {
		for(var i = 0; i < buf.length; i ++) {
			this.setbyte(offset, bytesOffset + i, buf.charCodeAt(i));
		}
	},
	getByteSize: function(offset) {
		throw new HSPError(ErrorCode.UNSUPPORTED_FUNCTION,
		                   VarTypeNames[this.getType()]+" 型はメモリ読み込みに対応していません");
	},
	expandByteSize: function(offset, size) {
		throw new HSPError(ErrorCode.TYPE_MISMATCH,
		                   VarTypeNames[this.getType()]+" 型はメモリ領域の拡張に対応していません");
	},
	ref: function(offset) {
		return new Reference(this, offset);
	},
	bufferAt: function(offset) {
		throw new HSPError(ErrorCode.TYPE_MISMATCH);
	},
	inc: function(offset) {
		throw new HSPError(ErrorCode.UNSUPPORTED_FUNCTION,
		                   VarTypeNames[this.getType()]+" 型はインクリメントに対応していません");
	},
	dec: function(offset) {
		throw new HSPError(ErrorCode.UNSUPPORTED_FUNCTION,
		                   VarTypeNames[this.getType()]+" 型はデクリメントに対応していません");
	},
	getValues: function() {
		return this.values;
	},
	getValuesStartOffset: function() {
		return 0;
	},
	fillBytes: function(offset, val, length, bytesOffset) {
		if(length <= 0) return;
		this.setbytes(offset, bytesOffset, Utils.strTimes(String.fromCharCode(val), length));
	}
};

if(typeof HSPonJS != 'undefined') {
	HSPonJS.HSPArray = HSPArray;
}

