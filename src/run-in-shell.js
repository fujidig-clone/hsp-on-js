


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
};

function main(){
	var data = [
'\x48\x53\x50\x33\x01\x03\x00\x00\x04\x00\x00\x00\x38\x01\x00\x00',
'\x60\x00\x00\x00\x90\x00\x00\x00\xf0\x00\x00\x00\x19\x00\x00\x00',
'\x09\x01\x00\x00\x04\x00\x00\x00\x0d\x01\x00\x00\x2b\x00\x00\x00',
'\x38\x01\x00\x00\x00\x00\x00\x00\x38\x01\x00\x00\x00\x00\x00\x00',
'\x38\x01\x00\x00\x00\x00\x00\x00\x38\x01\x00\x00\x00\x00\x00\x00',
'\x38\x01\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00',
'\x01\x20\x00\x00\x00\x00\x08\x00\x04\x00\x10\x27\x0f\x20\x0a\x00',
'\x01\x00\x01\x00\x01\x40\x00\x00\x0f\x20\x0a\x00\x01\x00\x02\x00',
'\x01\x40\x00\x00\x01\x20\x03\x00\x00\x00\x08\x00\x0d\x00\x08\x00',
'\x00\x00\x28\x00\x04\x80\xff\xff\xff\xff\x00\x00\x29\x00\x08\x20',
'\x20\x00\x01\x00\x02\x00\x01\x40\x01\x00\x01\x40\x00\x00\x01\x20',
'\x03\x00\x00\x00\x08\x00\x0d\x00\x00\x00\x00\x00\x28\x00\x0d\x00',
'\x08\x00\x00\x00\x28\x00\x04\x80\xff\xff\xff\xff\x00\x00\x29\x00',
'\x01\x00\x03\x00\x00\x00\x01\x00\x00\x00\x29\x00\x09\x20\x0f\x00',
'\x01\x00\x03\x00\x0f\x20\x11\x00\x0f\x20\x00\x00\x07\x00\x00\x00',
'\x74\x2e\x68\x73\x70\x00\x73\x69\x7a\x65\x00\x73\x72\x63\x00\x64',
'\x65\x73\x74\x00\x74\x69\x6d\x65\x00\x42\x00\x00\x00\xfe\x00\x00',
'\x00\x00\x00\x00\x06\x06\x06\x00\x0d\x08\x17\x04\x00\x06\xfd\x06',
'\x00\x00\x00\x00\xfd\x0b\x00\x00\x01\x00\xfd\x0f\x00\x00\x02\x00',
'\xfd\x14\x00\x00\x03\x00\xff\xff'
	].join('');

	var axdata = new AXData(data);

	var compiler = new Compiler(axdata);
	var sequence = compiler.compile();

	sequence.forEach(function(insn){
		print(insn);
	});

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

