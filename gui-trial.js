function Color(r, g, b, a) {
	this.r = r & 255;
	this.g = g & 255;
	this.b = b & 255;
	if(a == undefined) {
		this.a = 1;
	} else {
		this.a = Math.min(Math.max(a, 0), 1);
	}
}

HSPonJS.Utils.objectExtend(Color, {
	toRGBAString: function toRGBAString(r, g, b, a) {
		return 'rgba('+r+','+g+','+b+','+a+')';
	},
	toRGBString: function toRGBString(r, g, b) {
		return 'rgb('+r+','+g+','+b+')';
	},
	toHexString: function toHexString(r, g, b) {
		return '#' + (0x1000000 | r << 16 | g << 8 | b).toString(16).slice(1);
	}
});

Color.prototype = {
	toRGBAString: function toRGBAString() {
		return Color.toRGBAString(this.r, this.g, this.b, this.a);
	},
	toRGBString: function toRGBString() {
		return Color.toRGBString(this.r, this.g, this.b);
	},
	toHexString: function toHexString() {
		return Color.toHexString(this.r, this.g, this.b);
	},
	toString: function toString() {
		return '<Color: '+this.toRGBAString()+'>';
	}
};

function initializeEvaluator() {
	this.currentX = this.currentY = 0;
	this.currentR = this.currentG = this.currentB = 0;
}

with(HSPonJS) {
	Utils.objectExtend(BuiltinFuncs[Token.Type.EXTCMD], {
		0x0c: function pset(x, y) {
			this.scanArgs(arguments, 'NN');
			x = x ? x.toIntValue()._value : this.currentX;
			y = y ? y.toIntValue()._value : this.currentY;
			this.ctx.fillRect(x, y, 1, 1);
		},
		0x18: function color(r, g, b) {
			this.scanArgs(arguments, 'NNN');
			r = r ? r.toIntValue()._value & 255 : 0;
			g = g ? g.toIntValue()._value & 255 : 0;
			b = b ? b.toIntValue()._value & 255 : 0;
			this.ctx.fillStyle = this.ctx.strokeStyle = Color.toRGBString(r, g, b);
			this.currentR = r;
			this.currentG = g;
			this.currentB = b;
		},
		0x2f: function line(x1, y1, x2, y2) {
			// FIXME アンチエイリアスのかかった線が描画されてしまう
			this.scanArgs(arguments, 'NNNN');
			x1 = x1 ? x1.toIntValue()._value : 0;
			y1 = y1 ? y1.toIntValue()._value : 0;
			x2 = x2 ? x2.toIntValue()._value : this.currentX;
			y2 = y2 ? y2.toIntValue()._value : this.currentY;
			this.currentX = x1;
			this.currentY = y1;
			var ctx = this.ctx;
			ctx.beginPath();
			ctx.moveTo(x2, y2);
			ctx.lineTo(x1, y1);
			ctx.stroke();
		},
		0x31: function boxf(x1, y1, x2, y2) {
			this.scanArgs(arguments, 'NNNN');
			x1 = x1 ? x1.toIntValue()._value : 0;
			y1 = y1 ? y1.toIntValue()._value : 0;
			x2 = x2 ? x2.toIntValue()._value : this.ctx.canvas.width;
			y2 = y2 ? y2.toIntValue()._value : this.ctx.canvas.height;
			var width = Math.abs(x2 - x1) + 1;
			var height = Math.abs(y2 - y1) + 1;
			var x = Math.min(x1, x2);
			var y = Math.min(y1, y2);
			this.ctx.fillRect(x, y, width, height);
		},
	});
	Utils.objectExtend(BuiltinFuncs[Token.Type.EXTSYSVAR], {
		0x100: function ginfo(type) {
			this.scanArgs(arguments, 'n');
			type = type.toIntValue()._value;
			switch(type) {
			case 16: // ginfo_r
				return new IntValue(this.currentR);
			case 17: // ginfo_g
				return new IntValue(this.currentG);
			case 18: // ginfo_b
				return new IntValue(this.currentB);
			case 22: // ginfo_cx
				return new IntValue(this.currentX);
			case 23: // ginfo_cy
				return new IntValue(this.currentY);
			default:
				throw new HSPError(ErrorCode.ILLEGAL_FUNCTION);
			}
		}
	});
}
