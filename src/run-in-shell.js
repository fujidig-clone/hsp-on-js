var nameSpace = {};
with(nameSpace) {

var main = function main() {
	var axdata = new AXData(axbinary);
	var compiler = new Compiler(axdata);
	try {
		var sequence = compiler.compile();
	} catch(e) {
		if(!(e instanceof CompileError)) throw e;
		print(e);
		print(e.hspFileName+':'+e.hspLineNumber);
		return null;
	}

	if(showSequence) {
		var fileName, lineNo;
		sequence.forEach(function(insn, i) {
			var out = Formatter.sprintfForJS('%5d %-20s %-30s ', i, Instruction.CodeNames[insn.code], insn.opts.map(String).join(', '));
			if(fileName != insn.fileName) {
				fileName = insn.fileName;
				lineNo = insn.lineNo;
				out += '('+fileName+':'+lineNo+') ';
			} else if(lineNo != insn.lineNo) {
				lineNo = insn.lineNo;
				out += '('+lineNo+') ';
			}
			out = out.replace(/\s+$/, '');
			print(out);
		});
	}

	var evaluator = new Evaluator(axdata, sequence);
	evaluator.evaluate();
	return evaluator;
};

if(typeof HSPonJS != 'undefined') {
	HSPonJS.Utils.objectExtend(nameSpace, HSPonJS);
}

BuiltinFuncs[Token.Type.EXTCMD][0x0f] = function mes(val) {
	this.scanArgs(arguments, '.?');
	if(val) {
		print(CP932.decode(val.toStrValue()._value));
	} else {
		print();
	}
};

Evaluator.prototype.onError = function onError(e) {
	var insn = this.sequence[this.pc];
	print('#Error '+e.errcode+' in line '+insn.lineNo+' ('+insn.fileName+') ' + (this.getBuiltinFuncName(insn)||''));
	print('--> '+e.getErrorMessage());
};

Evaluator.prototype.onEnd = function onEnd(e) {
	quit(e.status);
};

}

try {
	main();
} catch(e) {
	print(e);
	print(e.stack);
}

