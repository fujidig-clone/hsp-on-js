var ISeq;
var ISeqElem;
var Label;
var Insn;
var getInsnCodeName;

(function() {

ISeq = function() {
	this.firstGuard = new ISeqElem;
	this.lastGuard = new ISeqElem;
	link(this.firstGuard, this.lastGuard);
}

function link() {
	for(var i = 0; i < arguments.length - 1; i ++) {
		var a = arguments[i];
		var b = arguments[i+1];
		if(a) a.next = b;
		if(b) b.prev = a;
	}
}

ISeq.link = link;

ISeq.prototype = {
	first: function() {
		return this.firstGuard.next;
	},
	last: function() {
		return this.lastGuard.prev;
	},
	push: function(elem) {
		link(this.last(), elem, this.lastGuard);
		return this;
	},
	pop: function() {
		return this.last().remove();
	},
	shift: function() {
		return this.first().remove();
	},
	unshift: function(elem) {
		return this.first().insertBefore(elem);
	},
	forEach: function(callback) {
		var elem = this.first();
		var end = this.lastGuard;
		while(elem != end) {
			var next = elem.next;
			callback(elem);
			elem = next;
		}
	},
	forEachOnlyInsn: function(callback) {
		var elem = this.first();
		while(elem) {
			var next = elem.next;
			if(elem.type == ISeqElem.Type.INSN) {
				callback(elem);
			}
			elem = next;
		}
	},
	getLength: function() {
		var length = 0;
		this.forEach(function() { length ++; });
		return length;
	},
	toString: function() {
		return '<ISeq:len='+this.getLength()+'>';
	},
	firstInsn: function() {
		return this.firstGuard.getNextInsn();
	}
};

ISeqElem = function() {
	this.prev = null;
	this.next = null;
};

ISeqElem.Type = {
	NONE:  0,
	INSN:  1,
	LABEL: 2
};

ISeqElem.prototype = {
	type: ISeqElem.Type.NONE,
	remove: function() {
		link(this.prev, this.next);
		link(null, this, null);
		return this;
	},
	replace: function(insn) {
		link(this.prev, insn, this.next);
		link(null, this, null);
	},
	insertAfter: function() {
		var args = [this];
		args.push.apply(args, arguments);
		args.push(this.next);
		link.apply(null, args);
	},
	insertBefore: function(insn) {
		var args = [this.prev];
		args.push.apply(args, arguments);
		args.push(this);
		link.apply(null, args);
	},
	getNextInsn: function() {
		var elem = this.next;
		while(elem) {
			if(elem.type == ISeqElem.Type.INSN) {
				return elem;
			}
			elem = elem.next;
		}
		return null;
	},
	getPrevInsn: function() {
		var elem = this.prev;
		while(elem) {
			if(elem.type == ISeqElem.Type.INSN) {
				return elem;
			}
			elem = elem.prev;
		}
		return null;
	},
	getNextElem: function() {
		var elem = this.next;
		while(elem) {
			if(elem.type == ISeqElem.Type.INSN || elem.type == ISeqElem.Type.NONE) {
				return elem;
			}
			elem = elem.next;
		}
		return null;
	},
	getPrevElem: function() {
		var elem = this.prev;
		while(elem) {
			if(elem.type == ISeqElem.Type.INSN || elem.type == ISeqElem.Type.NONE) {
				return elem;
			}
			elem = elem.prev;
		}
		return null;
	}
};

Label = function() {
	ISeqElem.call(this);
	this.pos_ = -1;
};

Label.prototype = new ISeqElem;

Utils.objectExtend(Label.prototype, {
	toString: function() {
		return '<Label:'+this.pos_+'>';
	},
	getInsn: function() {
		return this.getNextInsn();
	},
	getPos: function() {
		return this.pos_;
	},
	definePos: function() {
		var insn = this.getInsn();
		if(insn) {
			this.pos_ = insn.index;
		}
	},
	type: ISeqElem.Type.LABEL
});

Insn = function(code, opts, fileName, lineNo) {
	ISeqElem.call(this);
	this.code = code;
	this.opts = opts;
	this.fileName = fileName;
	this.lineNo = lineNo;
	this.index = -1;
};

Insn.prototype = new ISeqElem;

Utils.objectExtend(Insn.prototype, {
	toString: function() {
		return '<Insn:'+getInsnCodeName(this.code)+' <' + this.opts.join(', ') + '> ('+this.fileName + ':' + this.lineNo+')>';
	},
	clone: function() {
		return new Insn(this.code, this.opts, this.fileName, this.lineNo);
	},
	type: ISeqElem.Type.INSN
});

var codeNames = [
	'NOP',
	'PUSH_VAR',
	'GET_VAR',
	'POP',
	'POP_N',
	'DUP',
	'GOTO',
	'IFNE',
	'IFEQ',
	'ASSIGN',
	'COMPOUND_ASSIGN',
	'INC',
	'DEC',
	'CALL_BUILTIN_CMD',
	'CALL_BUILTIN_FUNC',
	'CALL_USERDEF_CMD',
	'CALL_USERDEF_FUNC',
	'NEWMOD',
	'RETURN',
	'REPEAT',
	'LOOP',
	'CNT',
	'CONTINUE',
	'BREAK',
	'FOREACH',
	'EACHCHK',
	'GOSUB',
	'GOTO_EXPR',
	'GOSUB_EXPR',
	'EXGOTO',
	'ON'
];

getInsnCodeName = function(insnCode) {
	return codeNames[insnCode];
}

Insn.Code = {};
(function() {
	for(var i = 0; i < codeNames.length; i ++) {
		var name = codeNames[i];
		Insn.Code[name] = i;
	}
})();

})();

if(typeof HSPonJS != 'undefined') {
	HSPonJS.ISeq = ISeq;
	HSPonJS.ISeqElem = ISeqElem;
	HSPonJS.Label = Label;
	HSPonJS.Insn = Insn;
	HSPonJS.getInsnCodeName = getInsnCodeName;
}

