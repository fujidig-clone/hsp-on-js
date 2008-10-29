function Instruction(code, opts, fileName, lineNo) {
	this.code = code;
	this.opts = opts;
	this.fileName = fileName;
	this.lineNo = lineNo;
}

Instruction.prototype.toString = function toString() {
	return this.fileName + '#' + this.lineNo + ': ' + Instruction.CodeNames[this.code] + ' <' + this.opts.join(', ') + '>';
};

Instruction.CodeNames = [
	'NOP',
	'PUSH',
	'PUSH_VAR',
	'POP',
	'DUP',
	'ADD',
	'SUB',
	'MUL',
	'DIV',
	'MOD',
	'AND',
	'OR',
	'XOR',
	'EQ',
	'NE',
	'GT',
	'LT',
	'GTEQ',
	'LTEQ',
	'RSH',
	'LSH',
	'GOTO',
	'IFNE',
	'IFEQ',
	'SETVAR',
	'EXPANDARRAY',
	'INC',
	'DEC',
	'CALL_BUILTIN_CMD',
	'CALL_BUILTIN_FUNC',
	'CALL_USERDEF_CMD',
	'CALL_USERDEF_FUNC',
	'GETARG',
	'PUSH_ARG_VAR',
	'PUSH_MEMBER',
	'THISMOD',
	'NEWMOD',
	'RETURN',
	'DELMOD',
	'REPEAT',
	'LOOP',
	'CNT',
	'CONTINUE',
	'BREAK',
	'FOREACH',
	'EACHCHK'
];

Instruction.Code = {};
(function(){
	for(var i = 0; i < Instruction.CodeNames.length; i ++) {
		var name = Instruction.CodeNames[i];
		Instruction.Code[name] = i;
	}
})();

if(typeof HSPonJS != 'undefined') {
	HSPonJS.Instruction = Instruction;
}

