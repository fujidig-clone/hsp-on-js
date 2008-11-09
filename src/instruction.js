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
	'GET_VAR',
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
	'ASSIGN',
	'ASSIGN_STATIC_VAR',
	'ASSIGN_ARG_ARRAY',
	'ASSIGN_MEMBER',
	'COMPOUND_ASSIGN',
	'COMPOUND_ASSIGN_STATIC_VAR',
	'COMPOUND_ASSIGN_ARG_ARRAY',
	'COMPOUND_ASSIGN_MEMBER',
	'INC',
	'INC_STATIC_VAR',
	'INC_ARG_ARRAY',
	'INC_MEMBER',
	'DEC',
	'DEC_STATIC_VAR',
	'DEC_ARG_ARRAY',
	'DEC_MEMBER',
	'CALL_BUILTIN_CMD',
	'CALL_BUILTIN_FUNC',
	'CALL_USERDEF_CMD',
	'CALL_USERDEF_FUNC',
	'GETARG',
	'PUSH_ARG_VAR',
	'GET_ARG_VAR',
	'PUSH_MEMBER',
	'GET_MEMBER',
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
	'EACHCHK',
	'GOSUB',
	'GOTO_EXPR',
	'GOSUB_EXPR',
	'EXGOTO',
	'EXGOTO_OPT1',
	'EXGOTO_OPT2',
	'EXGOTO_OPT3',
	'ON'
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

