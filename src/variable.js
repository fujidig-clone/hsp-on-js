function Variable() {
	this.value = new IntArray();
}

Variable.prototype = {
	assign: function(indices, rhs) {
		this.value.expand(indices);
		if(this.getType() != rhs.getType()) {
			if(this.value.getOffset(indices) != 0) {
				throw new HSPError(ErrorCode.INVALID_ARRAYSTORE,
				VarTypeNames[this.getType()]+' 型の配列変数に '+VarTypeNames[rhs.getType()]+' 型の値を代入しました');
			}
			this.reset(rhs.getType());
			this.value.expand(indices);
		}
		var offset = this.value.getOffset(indices);
		return this.value.assign(offset, rhs);
	},
	reset: function(type) {
		switch(type) {
		case VarType.LABEL:
			this.value = new LabelArray();
			break;
		case VarType.STR:
			this.value = new StrArray();
			break;
		case VarType.DOUBLE:
			this.value = new DoubleArray();
			break;
		case VarType.INT:
			this.value = new IntArray();
			break;
		case VarType.STRUCT:
			this.value = new StructArray();
			break;
		default:
			throw new HSPError(ErrorCode.TYPE_MISMATCH, VarTypeNames[type]+' 型の値は変数に代入できません');
		}
	},
	expand: function(indices) {
		return this.value.expand(indices);
	},
	expand1D: function(index) {
		return this.value.expand1D(index);
	},
	getType: function() {
		return this.value.getType();
	},
	at: function(offset) {
		return this.value.at(offset);
	},
	getL0: function() {
		return this.value.getL0();
	},
	getL1: function() {
		return this.value.getL1();
	},
	getL2: function() {
		return this.value.getL2();
	},
	getL3: function() {
		return this.value.getL3();
	},
	dim: function(type, l0, l1, l2, l3) {
		var ary;
		switch(type) {
		case VarType.LABEL:
			ary = new LabelArray();
			break;
		case VarType.STR:
			ary = new StrArray();
			break;
		case VarType.DOUBLE:
			ary = new DoubleArray();
			break;
		case VarType.INT:
			ary = new IntArray();
			break;
		case VarType.STRUCT:
			ary = new StructArray();
			break;
		default:
			throw new HSPError(ErrorCode.ILLEGAL_FUNCTION, '異常な変数型の値です');
		}
		var indices = HSPArray.lengthToIndices(l0, l1, l2, l3);
		ary.expand(indices);
		this.value = ary;
	},
	getbyte: function(offset, bytesOffset) {
		return this.value.getbyte(offset, bytesOffset);
	},
	setbyte: function(offset, bytesOffset, val) {
		return this.value.setbyte(offset, bytesOffset, val);
	},
	getbytes: function(offset, bytesOffset, length) {
		return this.value.getbytes(offset, bytesOffset, length);
	},
	setbytes: function(offset, bytesOffset, buf) {
		return this.value.setbytes(offset, bytesOffset, buf);
	},
	getByteSize: function(offset) {
		return this.value.getByteSize(offset);
	},
	expandByteSize: function(offset, size) {
		return this.value.expandByteSize(offset, size);
	},
	bufferAt: function(offset) {
		return this.value.bufferAt(offset);
	},
	ref: function(offset) {
		return this.value.ref(offset);
	},
	inc: function(offset) {
		return this.value.inc(offset);
	},
	dec: function(offset) {
		return this.value.dec(offset);
	},
	fillBytes: function(offset, val, length, bytesOffset) {
		return this.value.fillBytes(offset, val, length, bytesOffset);
	}
};

if(typeof HSPonJS != 'undefined') {
	HSPonJS.Variable = Variable;
}


