var AllocationProfiler = {};
(function() {
	var A = AllocationProfiler;
	A.ClassNames = 
		['Label Insn UserDefFunc Module LabelValue StrValue DoubleValue IntValue',
		 'StructValue StrBuffer Reference UninitializedArray LabelArray StrArray',
		 'DoubleArray IntArray StructArray Variable VariableAgent0D VariableAgent1D',
		 'VariableAgentMD ParamInfo VarNode ArgNode LiteralNode DefaultNode',
		 'OperateNode UserDefFuncallNode BuiltinFuncallNode GetStackNode Compiler',
		 'VariableData StaticVariableTag MainLoopGenerator BuiltinFuncInfo',
		 'Evaluator Frame Event'].join(' ').split(' ');
	var record = {};
	A.clear = function() {
		A.ClassNames.forEach(function(name) {
			record[name] = 0;
		});
	};
	A.start = function() {
		A.ClassNames.forEach(function(name) {
			var orig = HSPonJS[name];
			if(!orig) return;
			var proxy = function() {
				record[name] ++;
				return orig.apply(this, arguments);
			};
			HSPonJS.Utils.objectExtend(proxy, orig);
			HSPonJS[name] = proxy;
			setVar(name, proxy);
		});
		A.clear();
	};
	A.result = function() {
		var result = '';
		result += '=== allocation profiler report ===================\n';
		var empty = true;
		A.ClassNames.forEach(function(name) {
			var count = record[name];
			if(count) {
				empty = false;
				result += name + ': '+count + '\n';
			}
		});
		if(empty) {
			result += '(The allocation never occurred.)\n';
		}
		return result;
	};
	A.report = function() {
		print(A.result());
	};
})();

function setVar(varName, val) {
	eval(varName + ' = val;');
}

if(typeof HSPonJS != 'undefined') {
	HSPonJS.AllocationProfiler = AllocationProfiler;
}

