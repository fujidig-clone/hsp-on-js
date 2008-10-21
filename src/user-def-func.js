function UserDefFunc(isCType, name, label, paramTypes) {
	this.isCType = isCType;
	this.name = name;
	this.label = label;
	this.paramTypes = paramTypes;
}

UserDefFunc.prototype.toString = function toString() {
	return '<UserDefFunc:'+this.name+' isCType='+this.isCType+', label='+this.label+', paramTypes=['+this.paramTypes.join(', ')+']>';
};

function Module(name, constructor, destructor, membersCount) {
	this.name = name;
	this.constructor = constructor;
	this.destructor = destructor;
	this.membersCount = membersCount;
}

Module.prototype.toString = function toString() {
	return '<Module:'+this.name+' membersCount='+this.membersCount+'>';
};

if(typeof HSPonJS != 'undefined') {
	HSPonJS.UserDefFunc = UserDefFunc;
	HSPonJS.Module = Module;
}


