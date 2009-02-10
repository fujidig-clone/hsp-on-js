var main;
(function() {
var nameSpace = {};
with(nameSpace) {

main = function() {
	var options = runInShellOptions;
	var axBinary = options.axBinary;
	var showSequence = options.showSequence;
	var showMainLoop = options.showMainLoop;
	var compileOnly = options.compileOnly;
	
	var axdata = new AXData(axBinary);
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
			var out = Formatter.sprintfForJS('%5d %-20s %-30s ', i, getInsnCodeName(insn.code), insn.opts.map(String).join(', '));
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

	var generator = new MainLoopGenerator(sequence);
	if(showMainLoop) {
		print(generator.generateMainLoopSrc());
	}
	if(compileOnly) return null;

	var evaluator = new Evaluator(sequence, generator.generate());
	evaluator.evaluate();
	return evaluator;
};

if(typeof HSPonJS != 'undefined') {
	HSPonJS.Utils.objectExtend(nameSpace, HSPonJS);
}

BuiltinFuncs[Token.Type.EXTCMD][0x0f] = function(val) {
	this.scanArgs(arguments, '.?');
	if(val) {
		print(CP932.decode(val.toStrValue()._value));
	} else {
		print();
	}
};

Evaluator.prototype.onError = function(e) {
	print(this.getErrorOutput(e));
};

Evaluator.prototype.onEnd = function(e) {
	quit(e.status);
};

}
})();

try {
	main();
} catch(e) {
	print(e);
	print(e.stack);
}

