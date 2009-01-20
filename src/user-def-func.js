function UserDefFunc(isCType, name, label, paramTypes, id) {
	this.isCType = isCType;
	this.name = name;
	this.label = label;
	this.paramTypes = paramTypes;
	this.id = id;
}

UserDefFunc.prototype.toString = function() {
	return '<UserDefFunc:'+this.name+' isCType='+this.isCType+', label='+this.label+', paramTypes=['+this.paramTypes.join(', ')+']>';
};

function Module(name, constructor, destructor, membersCount, id) {
	this.name = name;
	this.constructor = constructor;
	this.destructor = destructor;
	this.membersCount = membersCount;
	this.id = id;
}

Module.prototype.toString = function() {
	return '<Module:'+this.name+' membersCount='+this.membersCount+'>';
};

if(typeof HSPonJS != 'undefined') {
	HSPonJS.UserDefFunc = UserDefFunc;
	HSPonJS.Module = Module;
}


