function ParamInfo(node, stackSize) {
	this.node = node;
	this.stackSize = stackSize;
}

Utils.objectExtend(ParamInfo.prototype, {
	toString: function toString() {
		return '<ParamInfo: '+this.node+(this.stackSize!=0?','+this.stackSize:'')+'>';
	},
	isVar: function isVar() {
		return this.node.isVarNode() && !this.node.onlyValue;
	}
});

function Node() {}
Utils.objectExtend(Node.prototype, {
	isVarNode:     function () { return false; },
	isLiteralNode: function () { return false; },
	isDefaultNode: function () { return false; },
	isOperateNode: function () { return false; },
	isFuncallNode: function () { return false; },
	isUserDefFuncall: function () { return false; },
	isBuiltinFuncall: function () { return false; },
	isGetStackNode: function () { return false; }
});

var NodeType = {
	VAR:     1,
	LITERAL: 2,
	DEFAULT: 3,
	OPERATE: 4,
	USERDEF_FUNCALL: 5,
	BUILTIN_FUNCALL: 6,
	GET_STACK: 7
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
	isVarNode: function () { return true; },
	toString: function toString() {
		return '<VarNode:'+this.varData+',['+this.indexNodes+']'+
		       (!this.onlyValue?',var':'')+
		       (this.ignoreIndices?'ignore idicies':'')+'>';
	},
	getValueType: function getValueType() {
		return 0;
	}
});

function LiteralNode(val) {
	this.val = val;
}
LiteralNode.prototype = new Node;
Utils.objectExtend(LiteralNode.prototype, {
	nodeType: NodeType.LITERAL,
	isLiteralNode: function () { return true; },
	toString: function toString() {
		return '<LiteralNode:'+this.val+'>';
	},
	getValueType: function getValueType() {
		return val.getType();
	}
});

function DefaultNode() {
}
DefaultNode.prototype = new Node;
Utils.objectExtend(DefaultNode.prototype, {
	nodeType: NodeType.DEFAULT,
	isDefaultNode: function () { return true; },
	toString: function toString() {
		return '<DefaultNode>';
	},
	getValueType: function getValueType() {
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
	isOperateNode: function () { return true; },
	toString: function toString() {
		return '<OperateNode:'+this.calcCode+' '+this.lhsNode+' '+this.rhsNode+'>';
	},
	getValueType: function getValueType() {
		if(8 <= this.calcCode && this.calcCode <= 13) {
			return VarType.INT;
		}
		return lhsNode.getValueType();
	}
});

function FuncallNode(paramNodes) {
	this.paramNodes = paramNodes;
}
FuncallNode.prototype = new Node;
Utils.objectExtend(FuncallNode.prototype, {
	isFuncallNode: function () { return true; }
});

function UserDefFuncallNode(userDefFunc, paramNodes, token) {
	this.userDefFunc = userDefFunc;
	this.paramNodes = paramNodes;
	this.token = token;
}
UserDefFuncallNode.prototype = new FuncallNode;
Utils.objectExtend(UserDefFuncallNode.prototype, {
	nodeType: NodeType.USERDEF_FUNCALL,
	isUserDefFuncallNode: function () { return true; },
	toString: function toString() {
		return '<UserDefFuncallNode:'+this.userDefFunc+', ['+this.paramNodes+']>';
	},
	getValueType: function getValueType() {
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
	isBuiltinFuncallNode: function () { return true; },
	toString: function toString() {
		return '<BuiltinFuncallNode:'+this.groupId+', '+this.subId+', ['+this.paramNodes+']>';
	},
	getValueType: function getValueType() {
		return 0;
	}
});

function GetStackNode(offset, originalNode) {
	this.offset = offset;
	this.originalNode = originalNode;
}
GetStackNode.prototype = new Node;
Utils.objectExtend(GetStackNode.prototype, {
	nodeType: NodeType.GET_STACK,
	isGetStackNode: function () { return true; },
	toString: function toString() {
		return '<GetStackNode:'+this.offset/*+','+this.originalNode*/+'>';
	},
	getValueType: function getValueType() {
		return this.originalNode.getValueType();
	}
});


if(typeof HSPonJS != 'undefined') {
	HSPonJS.ParamInfo = ParamInfo;
	HSPonJS.Node = Node;
	HSPonJS.NodeType = NodeType;
	HSPonJS.VarNode = VarNode;
	HSPonJS.LiteralNode = LiteralNode;
	HSPonJS.DefaultNode = DefaultNode;
	HSPonJS.OperateNode = OperateNode;
	HSPonJS.FuncallNode = FuncallNode;
	HSPonJS.UserDefFuncallNode = UserDefFuncallNode;
	HSPonJS.BuiltinFuncallNode = BuiltinFuncallNode;
	HSPonJS.GetStackNode = GetStackNode;
}
