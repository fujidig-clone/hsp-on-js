function Variable() {
	this.value = new IntArray();
}

function newArray(type) {
	switch(type) {
	case 1: // VarType.LABEL
		return new LabelArray();
	case 2: // VarType.STR
		return new StrArray();
	case 3: // VarType.DOUBLE
		return new DoubleArray();
	case 4: // VarType.INT
		return new IntArray();
	case 5: // VarType.STRUCT
		return new StructArray();
	default:
		return null;
	}
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
		var ary = newArray(type);
		if(!ary) {
			throw new HSPError(ErrorCode.TYPE_MISMATCH, VarTypeNames[type]+' 型の値は変数に代入できません');
		}
		this.value = ary;
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
		var ary = newArray(type);
		if(!ary) {
			throw new HSPError(ErrorCode.ILLEGAL_FUNCTION, '異常な変数型の値です');
		}
		ary.setLength(l0, l1, l2, l3);
		ary.fillUpElements(ary.allLength());
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
	HSPonJS.newArray = newArray;
}


