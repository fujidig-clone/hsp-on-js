function main(){
	var axdata = new AXData(axbinary);
	var compiler = new Compiler(axdata);
	var sequence = compiler.compile();

	if(showSequence) {
		sequence.forEach(function(insn){ print(insn);});
	}

	var evaluator = new Evaluator(axdata, sequence);
	evaluator.evaluate();
	return evaluator;
}

if(typeof HSPonJS != 'undefined') {
	var AXData = HSPonJS.AXData;
	var BinaryParser = HSPonJS.BinaryParser;
	var BuiltinFuncNames = HSPonJS.BuiltinFuncNames;
	var BuiltinFuncs = HSPonJS.BuiltinFuncs;
	var CP932 = HSPonJS.CP932;
	var CallbackException = HSPonJS.CallbackException;
	var CompileError = HSPonJS.CompileError;
	var Compiler = HSPonJS.Compiler;
	var DoubleArray = HSPonJS.DoubleArray;
	var DoubleValue = HSPonJS.DoubleValue;
	var ErrorCode = HSPonJS.ErrorCode;
	var ErrorMessages = HSPonJS.ErrorMessages;
	var Evaluator = HSPonJS.Evaluator;
	var FileReadException = HSPonJS.FileReadException;
	var Formatter = HSPonJS.Formatter;
	var HSPArray = HSPonJS.HSPArray;
	var HSPError = HSPonJS.HSPError;
	var HSPException = HSPonJS.HSPException;
	var Instruction = HSPonJS.Instruction;
	var IntArray = HSPonJS.IntArray;
	var IntValue = HSPonJS.IntValue;
	var JumpType = HSPonJS.JumpType;
	var Label = HSPonJS.Label;
	var LabelArray = HSPonJS.LabelArray;
	var MPType = HSPonJS.MPType;
	var ModVarData = HSPonJS.ModVarData;
	var Module = HSPonJS.Module;
	var Reference = HSPonJS.Reference;
	var StopException = HSPonJS.StopException;
	var StopException = HSPonJS.StopException;
	var StrBuffer = HSPonJS.StrBuffer;
	var StructArray = HSPonJS.StructArray;
	var StructValue = HSPonJS.StructValue;
	var Token = HSPonJS.Token;
	var UserDefFunc = HSPonJS.UserDefFunc;
	var VCRandom = HSPonJS.VCRandom;
	var Value = HSPonJS.Value;
	var VarType = HSPonJS.VarType;
	var VarTypeNames = HSPonJS.VarTypeNames;
	var Variable = HSPonJS.Variable;
	var VariableAgent = HSPonJS.VariableAgent;
	var WaitException = HSPonJS.WaitException;
}

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
		return;
	}
	if(e instanceof StopException) {
		return;
	}
	if(e instanceof CallbackException) {
		this.resume(e.callback);
		return;
	}
	throw e;
};

try {
	main();
}catch(e){
	print(e);
	print(e.stack);
}

