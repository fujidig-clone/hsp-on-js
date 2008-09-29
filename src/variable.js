function Variable() {
	this.value = new IntArray();
}

Variable.prototype = {
	assign: function assign(indices, rhs) {
		if(this.getType() != rhs.getType()) {
			// オフィシャル HSP だと添字が 0 のときも許容している
			if(indices.length != 0) {
				throw new HSPError(ErrorCode.INVALID_ARRAYSTORE,
				VarTypeNames[this.getType()]+' 型の配列変数に '+VarTypeNames[rhs.getType()]+' 型の値を代入しました');
			}
			switch(rhs.getType()) {
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
			default:
				throw new HSPError(ErrorCode.TYPE_MISMATCH, VarTypeNames[rhs.getType()]+' 型の値は変数に代入できません');
			}
		}
		return this.value.assign(indices, rhs);
	},
	expand: function expand(indices) {
		return this.value.expand(indices);
	},
	getType: function getType() {
		return this.value.getType();
	},
	at: function at(indices) {
		return this.value.at(indices);
	},
	getL0: function getL0() {
		return this.value.getL0();
	},
	getL1: function getL1() {
		return this.value.getL1();
	},
	getL2: function getL2() {
		return this.value.getL2();
	},
	getL3: function getL3() {
		return this.value.getL3();
	},
	dim: function dim(type, l0, l1, l2, l3) {
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
		default:
			throw new HSPError(ErrorCode.ILLEGAL_FUNCTION, '異常な変数型の値です');
		}
		var indices = HSPArray.lengthToIndices(l0, l1, l2, l3);
		ary.expand(indices);
		this.value = ary;
	},
	getbyte: function getbyte(indices, bytesOffset) {
		return this.value.getbyte(indices, bytesOffset);
	},
	setbyte: function setbyte(indices, bytesOffset, val) {
		return this.value.setbyte(indices, bytesOffset, val);
	},
	getbytes: function getbytes(indices, bytesOffset, length) {
		return this.value.getbytes(indices, bytesOffset, length);
	},
	setbytes: function setbytes(indices, bytesOffset, buf) {
		return this.value.setbytes(indices, bytesOffset, buf);
	}
};

if(typeof HSPonJS != 'undefined') {
	HSPonJS.Variable = HSPonJS.Variable;
}


