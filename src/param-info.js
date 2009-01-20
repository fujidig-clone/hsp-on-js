function ParamInfo(node, stackSize) {
	this.node = node;
	this.stackSize = stackSize;
}

Utils.objectExtend(ParamInfo.prototype, {
	toString: function() {
		return '<ParamInfo: '+this.node+'>';
	},
	isVar: function() {
		return this.node.isVarNode() && !this.node.onlyValue;
	},
	getPureNode: function() {
		return this.node.toPureNode();
	}
});

function Node() {}
Utils.objectExtend(Node.prototype, {
	isVarNode:     function() { return false; },
	isArgNode:     function() { return false; },
	isLiteralNode: function() { return false; },
	isDefaultNode: function() { return false; },
	isOperateNode: function() { return false; },
	isFuncallNode: function() { return false; },
	isUserDefFuncall: function() { return false; },
	isBuiltinFuncall: function() { return false; },
	isGetStackNode: function() { return false; },
	toPureNode: function() { return this; }
});

var NodeType = {
	VAR:     1,
	ARG:     2,
	LITERAL: 3,
	DEFAULT: 4,
	OPERATE: 5,
	USERDEF_FUNCALL: 6,
	BUILTIN_FUNCALL: 7,
	GET_STACK: 8
};

function VarNode(varData, indexNodes, onlyValue, token) {
	this.varData = varData;
	this.indexNodes = indexNodes;
	this.onlyValue = onlyValue;
	this.token = token;
}
VarNode.prototype = new Node;
Utils.objectExtend(VarNode.prototype, {
	nodeType: NodeType.VAR,
	isVarNode: function() { return true; },
	toString: function() {
		return '<VarNode:'+this.varData+',['+this.indexNodes+']'+
		       (!this.onlyValue?',var':'')+
		       (this.ignoreIndices?'ignore idicies':'')+'>';
	},
	getValueType: function() {
		return 0;
	}
});

function ArgNode(id) {
	this.id = id;
}
ArgNode.prototype = new Node;
Utils.objectExtend(ArgNode.prototype, {
	nodeType: NodeType.ARG,
	isArgNode: function() { return true; },
	toString: function() {
		return '<ArgNode:'+this.id+'>';
	},
	getValueType: function() {
		return 0;
	}
});

function LiteralNode(val) {
	this.val = val;
}
LiteralNode.prototype = new Node;
Utils.objectExtend(LiteralNode.prototype, {
	nodeType: NodeType.LITERAL,
	isLiteralNode: function() { return true; },
	toString: function() {
		return '<LiteralNode:'+this.val+'>';
	},
	getValueType: function() {
		return this.val.getType();
	}
});

function DefaultNode() {
}
DefaultNode.prototype = new Node;
Utils.objectExtend(DefaultNode.prototype, {
	nodeType: NodeType.DEFAULT,
	isDefaultNode: function() { return true; },
	toString: function() {
		return '<DefaultNode>';
	},
	getValueType: function() {
		return 0;
	}
});

function OperateNode(calcCode, lhsNode, rhsNode) {
	this.calcCode = calcCode;
	this.lhsNode = lhsNode;
	this.rhsNode = rhsNode;
}
OperateNode.prototype = new Node;
Utils.objectExtend(OperateNode.prototype, {
	nodeType: NodeType.OPERATE,
	isOperateNode: function() { return true; },
	toString: function() {
		return '<OperateNode:'+this.calcCode+' '+this.lhsNode+' '+this.rhsNode+'>';
	},
	getValueType: function() {
		if(isCompareCalcCode(this.calcCode)) {
			return VarType.INT;
		}
		return this.lhsNode.getValueType();
	}
});

function FuncallNode(paramNodes) {
	this.paramNodes = paramNodes;
}
FuncallNode.prototype = new Node;
Utils.objectExtend(FuncallNode.prototype, {
	isFuncallNode: function() { return true; }
});

function UserDefFuncallNode(userDefFunc, paramNodes, token) {
	this.userDefFunc = userDefFunc;
	this.paramNodes = paramNodes;
	this.token = token;
}
UserDefFuncallNode.prototype = new FuncallNode;
Utils.objectExtend(UserDefFuncallNode.prototype, {
	nodeType: NodeType.USERDEF_FUNCALL,
	isUserDefFuncallNode: function() { return true; },
	toString: function() {
		return '<UserDefFuncallNode:'+this.userDefFunc+', ['+this.paramNodes+']>';
	},
	getValueType: function() {
		return 0;
	}
});

function BuiltinFuncallNode(groupId, subId, paramNodes, token) {
	this.groupId = groupId;
	this.subId = subId;
	this.paramNodes = paramNodes;
	this.token = token;
}
BuiltinFuncallNode.prototype = new FuncallNode;
Utils.objectExtend(BuiltinFuncallNode.prototype, {
	nodeType: NodeType.BUILTIN_FUNCALL,
	isBuiltinFuncallNode: function() { return true; },
	toString: function() {
		return '<BuiltinFuncallNode:'+this.groupId+', '+this.subId+', ['+this.paramNodes+']>';
	},
	getValueType: function() {
		return 0;
	}
});

function GetStackNode(originalNode) {
	this.originalNode = originalNode;
}
GetStackNode.prototype = new Node;
Utils.objectExtend(GetStackNode.prototype, {
	nodeType: NodeType.GET_STACK,
	isGetStackNode: function() { return true; },
	toString: function() {
		return '<GetStackNode'/*+':'+this.originalNode*/+'>';
	},
	getValueType: function() {
		return this.originalNode.getValueType();
	},
	toPureNode: function() {
		return this.originalNode;
	}
});


if(typeof HSPonJS != 'undefined') {
	HSPonJS.ParamInfo = ParamInfo;
	HSPonJS.Node = Node;
	HSPonJS.NodeType = NodeType;
	HSPonJS.VarNode = VarNode;
	HSPonJS.ArgNode = ArgNode;
	HSPonJS.LiteralNode = LiteralNode;
	HSPonJS.DefaultNode = DefaultNode;
	HSPonJS.OperateNode = OperateNode;
	HSPonJS.FuncallNode = FuncallNode;
	HSPonJS.UserDefFuncallNode = UserDefFuncallNode;
	HSPonJS.BuiltinFuncallNode = BuiltinFuncallNode;
	HSPonJS.GetStackNode = GetStackNode;
}
