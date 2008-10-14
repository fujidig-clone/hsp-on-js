function UserDefFunc(isCType, name, label, paramTypes) {
	this.isCType = isCType;
	this.name = name;
	this.label = label;
	this.paramTypes = paramTypes;
}

UserDefFunc.prototype.toString = function toString() {
	return '<UserDefFunc:'+this.name+' isCType='+this.isCType+', label='+this.label+', paramTypes=['+this.paramTypes.join(', ')+']>';
};

if(typeof HSPonJS != 'undefined') {
	HSPonJS.UserDefFunc = UserDefFunc;
}


