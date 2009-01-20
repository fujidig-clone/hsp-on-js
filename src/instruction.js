function Instruction(code, opts, fileName, lineNo) {
	this.code = code;
	this.opts = opts;
	this.fileName = fileName;
	this.lineNo = lineNo;
}

Instruction.prototype.toString = function() {
	return this.fileName + '#' + this.lineNo + ': ' + Instruction.CodeNames[this.code] + ' <' + this.opts.join(', ') + '>';
};

Instruction.CodeNames = [
	'NOP',
	'PUSH_VAR',
	'GET_VAR',
	'POP',
	'POP_N',
	'DUP',
	'GOTO',
	'IFNE',
	'IFEQ',
	'ASSIGN',
	'COMPOUND_ASSIGN',
	'INC',
	'DEC',
	'CALL_BUILTIN_CMD',
	'CALL_BUILTIN_FUNC',
	'CALL_USERDEF_CMD',
	'CALL_USERDEF_FUNC',
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

