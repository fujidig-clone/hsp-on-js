function Label() {
	this.pos = -1;
}

Label.prototype = new Value;

Utils.objectExtend(Label.prototype, {
	toString: function() {
		return '<Label:'+this.pos+'>';
	},
	getType: function() {
		return VarType.LABEL;
	},
	isUsing: function() {
		return this != Label.EMPTY;
	}
});

Label.EMPTY = new Label;

if(typeof HSPonJS != 'undefined') {
	HSPonJS.Label = Label;
}


