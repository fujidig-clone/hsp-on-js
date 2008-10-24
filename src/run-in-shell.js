


BuiltinFuncs[Token.Type.EXTCMD][0x0f] = function mes(val) {
	this.scanArgs(arguments, '.?');
	if(val) {
		print(CP932.decode(val.toStrValue()._value));
	} else {
		print();
	}
};

Evaluator.prototype.disposeException = function disposeException(e) {
	var insn = this.sequence[this.pc];
	if(e instanceof HSPError) {
		print('#Error '+e.errcode+' in line '+insn.lineNo+' ('+insn.fileName+') ' + (this.getBuiltinFuncName(insn)||''));
		print('--> '+(e.message||ErrorMessages[e.errcode]));
	}
	if(e instanceof CallbackException) {
		this.resume(e.callback);
		return;
	}
};

function main(){
	var axdata = new AXData(axbinary);
	var compiler = new Compiler(axdata);
	var sequence = compiler.compile();

//*
sequence.forEach(function(insn){
		print(insn);
	});
//*/

	var evaluator = new Evaluator(axdata, sequence);
	evaluator.evaluate();
	return evaluator;
}

try {
	main();
}catch(e){
	print(e);
	print(e.stack);
}

