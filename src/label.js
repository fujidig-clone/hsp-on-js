function Label() {
	this.pos = -1;
}

Label.prototype = new Value;

/*
ラベル型変数の初期値はコード先頭を指すラベルで、
さらにコード先頭を指すラベルは有効でない（varuseで0が返る）という謎な仕様になっている。
*/

Utils.objectExtend(Label.prototype, {
	toString: function() {
		return '<Label:'+this.pos+'>';
	},
	getType: function() {
		return VarType.LABEL;
	},
	isUsing: function() {
		//return this != Label.EMPTY;
		return this.pos != 0;
	}
});

Label.EMPTY = new Label;
Label.EMPTY.pos = 0;

if(typeof HSPonJS != 'undefined') {
	HSPonJS.Label = Label;
}


