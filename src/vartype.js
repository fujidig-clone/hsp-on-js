var VarType = {
	NONE: 0,
	LABEL: 1,
	STR: 2,
	DOUBLE: 3,
	INT: 4,
	STRUCT: 5
};

var VarTypeNames = ['none', 'label', 'str', 'double', 'int', 'struct'];

if(typeof HSPonJS != 'undefined') {
	HSPonJS.VarType = VarType;
	HSPonJS.VarTypeNames = VarTypeNames;
}

