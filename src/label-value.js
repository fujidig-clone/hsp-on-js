function LabelValue(pos) {
	if(pos != undefined) {
		this.pos = pos;
	} else {
		this.pos = -1;
	}
}

LabelValue.prototype = new Value;

Utils.objectExtend(LabelValue.prototype, {
	toString: function() {
		return '<LabelValue:'+this.pos+'>';
	},
	getType: function() {
		return VarType.LABEL;
	},
	isUsing: function() {
		return true;
	}
});

LabelValue.EMPTY = new LabelValue;
LabelValue.EMPTY.isUsing = function() { return false; };

if(typeof HSPonJS != 'undefined') {
	HSPonJS.LabelValue = LabelValue;
}


