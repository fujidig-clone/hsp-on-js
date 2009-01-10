var CalcCodeNames = 'add,sub,mul,div,mod,and,or,xor,eq,ne,gt,lt,gteq,lteq,rsh,lsh'.split(',');
var CalcCodeOperatorMarks = '+,-,*,/,\\,&,|,^,==,!=,>,<,>=,<=,>>,<<'.split(',');

var CalcCode = {
	ADD:   0,
	SUB:   1,
	MUL:   2,
	DIV:   3,
	MOD:   4,
	AND:   5,
	OR:    6,
	XOR:   7,
	EQ:    8,
	NE:    9,
	GT:   10,
	LT:   11,
	GTEQ: 12,
	LTEQ: 13,
	RSH:  14,
	LSH:  15
};

function getCalcCodeName(calcCode) {
	return CalcCodeNames[calcCode];
}

function getCalcCodeOperatorMarks(calcCode) {
	return CalcCodeOperatorMarks[calcCode];
}

function isCompareCalcCode(calcCode) {
	return CalcCode.EQ <= calcCode && calcCode <= CalcCode.LTEQ;
}

if(typeof HSPonJS != 'undefined') {
	HSPonJS.CalcCodeNames = CalcCodeNames;
	HSPonJS.CalcCodeOperatorMarks = CalcCodeOperatorMarks;
	HSPonJS.CalcCode = CalcCode;
	HSPonJS.getCalcCodeName = getCalcCodeName;
	HSPonJS.getCalcCodeOperatorMarks = getCalcCodeOperatorMarks;
}

