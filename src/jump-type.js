function JumpType() {}
JumpType.prototype = new Value;
JumpType.GOTO = new JumpType;
JumpType.GOTO.toString = function toString() { return '<JumpType:GOTO>'; };
JumpType.GOSUB = new JumpType;
JumpType.GOSUB.toString = function toString() { return '<JumpType:GOSUB>'; };


if(typeof HSPonJS != 'undefined') {
	HSPonJS.JumpType = JumpType;
}


