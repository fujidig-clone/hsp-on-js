(function(){

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

var addEvent = (function(){
    return window.addEventListener
        ?  function(e, n, f){ e.addEventListener(n, f, false) }
        :  window.attachEvent 
        ?  function(e, n, f){ e.attachEvent('on' + n, f) }
        :  null;
})();

var removeEvent = (function(){
    return window.removeEventListener
        ?  function(e, n, f){ e.removeEventListener(n, f, false) }
        :  window.attachEvent 
        ?  function(e, n, f){ e.detachEvent('on' + n, f) }
        :  function(e, n, f){ delete window['on' + n] };
})();

HSPonJS.Evaluator.prototype.guiInitialize = function guiInitialize() {
	this.currentX = this.currentY = 0;
	this.currentR = this.currentG = this.currentB = 0;
	this.mesX = this.mesY = 0;
	this.mouseX = this.mouseY = 0;
	this.fontSize = 18;
	this.fontStyle = 0;

	var ctx = this.ctx;
	ctx.fillStyle = '#fff';
	ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
	ctx.fillStyle = '#000';
	ctx.strokeStyle = '#000';
	ctx.font = this.fontSize+'px monospace';
	
	
	ctx.canvas.style.position = 'relative'; // for layerX, layerY in Firefox
	var self = this;
	function onmousemove(e) {
		if(e.offsetX != undefined) {
			self.mouseX = e.offsetX;
			self.mouseY = e.offsetY;
		} else {
			self.mouseX = e.layerX;
			self.mouseY = e.layerY;
		}
	}
	this.keyPressed = [];
	function onkeydown(e) {
		self.keyPressed[e.keyCode] = true;
	}
	function onkeyup(e) {
		self.keyPressed[e.keyCode] = false;
	}
	function onmousedown(e) {
		switch(e.button) {
		case 0: self.keyPressed[1] = true; break;
		case 1: self.keyPressed[4] = true; break;
		case 2: self.keyPressed[2] = true; break;
		}
	}
	function onmouseup(e) {
		switch(e.button) {
		case 0: self.keyPressed[1] = false; break;
		case 1: self.keyPressed[4] = false; break;
		case 2: self.keyPressed[2] = false; break;
		}
	}
	addEvent(ctx.canvas, 'mousemove', onmousemove);
	addEvent(document, 'keydown', onkeydown);
	addEvent(document, 'keyup', onkeyup);
	addEvent(ctx.canvas, 'mousedown', onmousedown);
	addEvent(ctx.canvas, 'mouseup', onmouseup);
	
	this.removeEvents = function() {
		removeEvent(ctx.canvas, 'mousemove', onmousemove);
		removeEvent(ctx.canvas, 'keydown', onkeydown);
		removeEvent(ctx.canvas, 'keyup', onkeyup);
		removeEvent(ctx.canvas, 'mousedown', onmousedown);
		removeEvent(ctx.canvas, 'mouseup', onmouseup);
	};
};

with(HSPonJS) {
	Utils.objectExtend(BuiltinFuncs[Token.Type.EXTCMD], {
		0x0c: function pset(x, y) {
			this.scanArgs(arguments, 'NN');
			x = x ? x.toIntValue()._value : this.currentX;
			y = y ? y.toIntValue()._value : this.currentY;
			this.ctx.fillRect(x, y, 1, 1);
		},
		0x0d: function pget(x, y) {
			this.scanArgs(arguments, 'NN');
			x = x ? x.toIntValue()._value : this.currentX;
			y = y ? y.toIntValue()._value : this.currentY;
			var ctx = this.ctx;
			var r, g, b;
			if(x < 0 || x >= ctx.canvas.width || y < 0 || y >= ctx.canvas.height) {
				r = g = b = 255;
			} else {
				var data = ctx.getImageData(x, y, 1, 1).data;
				r = data[0], g = data[1], b = data[2];
			}
			ctx.fillStyle = ctx.strokeStyle = Color.toRGBString(r, g, b);
			this.currentR = r;
			this.currentG = g;
			this.currentB = b;
		},
		0x0f: function mes(text) {
			this.scanArgs(arguments, '.?');
			text = text ? CP932.decode(text.toStrValue()._value) : "";
			lines = text.split(/\r\n|[\r\n]/);
			var ctx = this.ctx;
			ctx.textBaseline = 'top';
			this.mesY = this.fontSize;
			for(var i = 0; i < lines.length; i ++) {
				ctx.fillText(lines[i], this.currentX, this.currentY);
				this.mesX = ctx.measureText(lines[i]).width;
				if(this.fontStyle & 4) {
					ctx.fillRect(this.currentX, this.currentY + this.mesY - 1, this.mesX, 1);
				}
				if(this.fontStyle & 8) {
					ctx.fillRect(this.currentX, this.currentY + this.mesY / 2, this.mesX, 1);
				}
				this.currentY += this.fontSize;
			}
		},
		0x11: function pos(x, y) {
			this.scanArgs(arguments, 'NN');
			if(x) this.currentX = x.toIntValue()._value;
			if(y) this.currentY = y.toIntValue()._value;
		},
		0x12: function circle(x1, y1, x2, y2, fill_p) {
			// FIXME アンチエイリアスのかかった線が描画されてしまう
			this.scanArgs(arguments, 'NNNNN');
			x1 = x1 ? x1.toIntValue()._value : 0;
			y1 = y1 ? y1.toIntValue()._value : 0;
			x2 = x2 ? x2.toIntValue()._value : this.ctx.canvas.width;
			y2 = y2 ? y2.toIntValue()._value : this.ctx.canvas.height;
			fill_p = fill_p ? fill_p.toIntValue()._value : 1;
			
			var w = (x2 - x1) / 2;
			var h = (y2 - y1) / 2;
			var C = 0.5522847498307933;
			var c_x = C * w;
			var c_y = C * h;
			var ctx = this.ctx;
			ctx.beginPath();
			ctx.moveTo(x2, y1 + h);
			ctx.bezierCurveTo(x2, y1 + h - c_y, x1 + w + c_x, y1, x1 + w, y1);
			ctx.bezierCurveTo(x1 + w - c_x, y1, x1, y1 + h - c_y, x1, y1 + h);
			ctx.bezierCurveTo(x1, y1 + h + c_y, x1 + w - c_x, y2, x1 + w, y2);
			ctx.bezierCurveTo(x1 + w + c_x, y2, x2, y1 + h + c_y, x2, y1 + h);
			if (fill_p) {
				ctx.fill();
			} else {
				ctx.stroke();
			}
		},
		0x14: function font(name, size, style) {
			this.scanArgs(arguments, 'sNN');
			name = CP932.decode(name.toStrValue()._value);
			size = size ? size.toIntValue()._value : 18;
			style = style ? style.toIntValue()._value : 0;
			var str = "";
			if(style & 2) {
				str += "italic ";
			}
			if(style & 1) {
				str += "bold ";
			}
			str += size + "px ";
			str += '"' + name.replace(/[\\"]/g, function(s) { return "\\" + s}) + '"';
			this.ctx.font = str;
			this.fontSize = size;
			this.fontStyle = style;
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
		0x22: function hsvcolor(h, s, v) {
			this.scanArgs(arguments, 'NNN');
			h = h ? h.toIntValue()._value % 192 : 0;
			s = s ? s.toIntValue()._value & 255 : 0;
			v = v ? v.toIntValue()._value & 255 : 0;
			var mv = 255 * 32;
			var mp = 255 * 16;
			var i = h / 32 | 0; 
			var t = h % 32;
			var v1 = (v*(mv-s*32)    +mp)/mv|0;
			var v2 = (v*(mv-s*t)     +mp)/mv|0;
			var v3 = (v*(mv-s*(32-t))+mp)/mv|0;
			var r = 0, g = 0, b = 0;
			switch(i){
			case 0:
			case 6:
				r=v;	g=v3;	b=v1;	break;
			case 1:
				r=v2;	g=v;	b=v1;	break;
			case 2:
				r=v1;	g=v;	b=v3;	break;
			case 3:
				r=v1;	g=v2;	b=v;	break;
			case 4:
				r=v3;	g=v1;	b=v;	break;
			case 5:
				r=v;	g=v1;	b=v2;	break;
			}
			this.ctx.fillStyle = this.ctx.strokeStyle = Color.toRGBString(r, g, b);
			this.currentR = r;
			this.currentG = g;
			this.currentB = b;
		},
		0x23: function getkey(v, key) {
			this.scanArgs(arguments, 'vN');
			key = key ? key.toIntValue()._value : 1;
			v.assign(new IntValue(this.keyPressed[key]));
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
			ctx.moveTo(x2 + 0.5, y2 + 0.5);
			ctx.lineTo(x1 + 0.5, y1 + 0.5);
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
		0x000: function mousex() {
			return new IntValue(this.mouseX);
		},
		0x001: function mousey() {
			return new IntValue(this.mouseY);
		},
		0x100: function ginfo(type) {
			this.scanArgs(arguments, 'n');
			type = type.toIntValue()._value;
			switch(type) {
			case 12: // ginfo_winx
				return new IntValue(this.ctx.canvas.width);
			case 13: // ginfo_winy
				return new IntValue(this.ctx.canvas.height);
			case 14: // ginfo_mesx
				return new IntValue(this.mesX);
			case 15: // ginfo_mesy
				return new IntValue(this.mesY);
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
			case 26: // ginfo_sx
				return new IntValue(this.ctx.canvas.width);
			case 27: // ginfo_sy
				return new IntValue(this.ctx.canvas.height);
			default:
				throw new HSPError(ErrorCode.ILLEGAL_FUNCTION);
			}
		}
	});
}

})();
