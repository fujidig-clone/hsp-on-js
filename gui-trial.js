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

function Screen() {
	this.ctx = null;
	this.currentX = this.currentY = 0;
	this.currentR = this.currentG = this.currentB = 0;
	this.mesX = this.mesY = 0;
	this.mouseX = this.mouseY = this.mouseW = 0;
	this.fontSize = 18;
	this.fontStyle = 0;
	this.width = this.height = null;
	this.copyWidth = this.copyHeight = 32;
}

Screen.prototype = {
	setContext: function setContext(ctx) {
		this.ctx = ctx;
		this.width = ctx.canvas.width;
		this.height = ctx.canvas.height;
		this.canvas = ctx.canvas;
	},
	clear: function clear() {
		var ctx = this.ctx;
		ctx.fillStyle = '#fff';
		ctx.fillRect(0, 0, this.width, this.height);
		this.selectColor(0, 0, 0);
		this.setFont('monospace', 18, 0);
	},
	selectColor: function selectColor(r, g, b) {
		this.currentR = r & 255;
		this.currentG = g & 255;
		this.currentB = b & 255;
		this.ctx.fillStyle = this.ctx.strokeStyle = Color.toRGBString(this.currentR, this.currentG, this.currentB);
	},
	selectColorByHSV: function selectColorByHSV(h, s, v) {
		h = h % 192;
		s = s & 255;
		v = v & 255;
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
		this.selectColor(r, g, b);
	},
	drawEllipse: function drawEllipse(x1, y1, x2, y2, fill_p) {
		// FIXME アンチエイリアスのかかった線が描画されてしまう
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
	drawText: function drawText(text) {
		var lines = text.split(/\r\n|[\r\n]/);
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
	setFont: function setFont(name, size, style) {
		var str = "";
		if(style & 2) {
			str += "italic ";
		}
		if(style & 1) {
			str += "bold ";
		}
		str += size + "px ";
		str += '"' + name.replace(/[\\"]/g, function(s) { return "\\" + s; }) + '"';
		this.ctx.font = str;
		this.fontSize = size;
		this.fontStyle = style;
	},
	drawLine: function drawLine(x1, y1, x2, y2) {
		// FIXME アンチエイリアスのかかった線が描画されてしまう
		this.currentX = x1;
		this.currentY = y1;
		var ctx = this.ctx;
		ctx.beginPath();
		ctx.moveTo(x2 + 0.5, y2 + 0.5);
		ctx.lineTo(x1 + 0.5, y1 + 0.5);
		ctx.stroke();
	},
	drawRect: function drawRect(x1, y1, x2, y2) {
		var width = Math.abs(x2 - x1) + 1;
		var height = Math.abs(y2 - y1) + 1;
		var x = Math.min(x1, x2);
		var y = Math.min(y1, y2);
		this.ctx.fillRect(x, y, width, height);
	}
};

HSPonJS.Utils.objectExtend(HSPonJS.Evaluator.prototype, {
	guiInitialize: function guiInitialize(iframe, width, height) {
		this.iframe = iframe;
		var doc = this.iframeDoc = iframe.contentWindow.document;
		var mainScreen = this.mainScreen = new Screen;

		this.changeMainCanvas(width, height);

		this.currentScreen = mainScreen;
		this.currentScreenId = 0;
		this.screens = [mainScreen];

		mainScreen.ctx.canvas.style.position = 'relative'; // for layerX, layerY in Firefox
		var self = this;
		function onmousemove(e) {
			if(e.offsetX != undefined) {
				mainScreen.mouseX = e.offsetX;
				mainScreen.mouseY = e.offsetY;
			} else {
				mainScreen.mouseX = e.layerX;
				mainScreen.mouseY = e.layerY;
			}
		}
		this.keyPressed = [];
		function onkeydown(e) {
			self.keyPressed[e.keyCode] = true;
			e.preventDefault();
		}
		function onkeypress(e) {
			// for Opera
			e.preventDefault();
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
		function oncontextmenu(e) {
			e.preventDefault();
			e.stopPropagation();
		}
		function onscroll(e) {
			if(e.wheelDelta) {
				mainScreen.mouseW = e.wheelDelta;
			} else {
				mainScreen.mouseW = e.detail * -40;
			}
			e.preventDefault();
		}

		addEvent(doc, 'mousemove', onmousemove);
		addEvent(doc, 'keydown', onkeydown);
		addEvent(doc, 'keypress', onkeypress);
		addEvent(doc, 'keyup', onkeyup);
		addEvent(doc, 'contextmenu', oncontextmenu);
		addEvent(doc, 'DOMMouseScroll', onscroll);
		addEvent(doc, 'mousewheel', onscroll);
		addEvent(doc, 'mousedown', onmousedown);
		addEvent(doc, 'mouseup', onmouseup);

		this.removeEvents = function() {
			removeEvent(doc, 'mousemove', onmousemove);
			removeEvent(doc, 'keypress', onkeypress);
			removeEvent(doc, 'keydown', onkeydown);
			removeEvent(doc, 'keyup', onkeyup);
			removeEvent(doc, 'contextmenu', oncontextmenu);
			removeEvent(doc, 'DOMMouseScroll', onscroll);
			removeEvent(doc, 'mousewheel', onscroll);
			removeEvent(doc, 'mousedown', onmousedown);
			removeEvent(doc, 'mouseup', onmouseup);
		};
	},
	removeCanvasElement: function removeCanvasElement() {
		if(this.mainScreen.ctx) {
			this.iframeDoc.body.removeChild(this.mainScreen.ctx.canvas);
		}
	},
	changeMainCanvas: function changeMainCanvas(width, height) {
		this.iframe.setAttribute('width', width);
		this.iframe.setAttribute('height', height);
		var canvas = this.iframeDoc.createElement('canvas');
		canvas.width = width;
		canvas.height = height;
		this.removeCanvasElement();
		this.iframeDoc.body.appendChild(canvas);
		this.mainScreen.setContext(canvas.getContext('2d'));
		this.mainScreen.clear();
	},
	getScreen: function getScreen(id) {
		var screen = this.screens[id];
		if(!screen) throw new HSPError(ErrorCode.ILLEGAL_FUNCTION);
		return screen;
	}
});

with(HSPonJS) {
	Utils.objectExtend(BuiltinFuncs[Token.Type.EXTCMD], {
		0x03: function dialog(message, type, option) {
			this.scanArgs(arguments, '.?NSN');
			message = message ? CP932.decode(message.toStrValue()._value) : "";
			type = type ? type.toIntValue()._value : 0;
			option = option ? CP932.decode(option.toStrValue()._value) : "";
			if(type & ~0xf) return;
			if(type & 2) {
				this.stat.assign(0, new IntValue(window.confirm(message) ? 6 : 7));
			} else {
				window.alert(message);
				this.stat.assign(0, new IntValue(1));
			}
		},
		0x0c: function pset(x, y) {
			this.scanArgs(arguments, 'NN');
			x = x ? x.toIntValue()._value : this.currentScreen.currentX;
			y = y ? y.toIntValue()._value : this.currentScreen.currentY;
			this.currentScreen.ctx.fillRect(x, y, 1, 1);
		},
		0x0d: function pget(x, y) {
			this.scanArgs(arguments, 'NN');
			x = x ? x.toIntValue()._value : this.currentScreen.currentX;
			y = y ? y.toIntValue()._value : this.currentScreen.currentY;
			var ctx = this.currentScreen.ctx;
			var r, g, b;
			if(x < 0 || x >= ctx.canvas.width || y < 0 || y >= ctx.canvas.height) {
				r = g = b = 255;
			} else {
				var data = ctx.getImageData(x, y, 1, 1).data;
				r = data[0], g = data[1], b = data[2];
			}
			this.currentScreen.selectColor(r, g, b);
		},
		0x0f: function mes(text) {
			this.scanArgs(arguments, '.?');
			text = text ? CP932.decode(text.toStrValue()._value) : "";
			this.currentScreen.drawText(text);
		},
		0x11: function pos(x, y) {
			this.scanArgs(arguments, 'NN');
			if(x) this.currentScreen.currentX = x.toIntValue()._value;
			if(y) this.currentScreen.currentY = y.toIntValue()._value;
		},
		0x12: function circle(x1, y1, x2, y2, fill_p) {
			this.scanArgs(arguments, 'NNNNN');
			x1 = x1 ? x1.toIntValue()._value : 0;
			y1 = y1 ? y1.toIntValue()._value : 0;
			x2 = x2 ? x2.toIntValue()._value : this.currentScreen.width;
			y2 = y2 ? y2.toIntValue()._value : this.currentScreen.height;
			fill_p = fill_p ? fill_p.toIntValue()._value : 1;
			
			this.currentScreen.drawEllipse(x1, y1, x2, y2, fill_p);
		},
		0x14: function font(name, size, style) {
			this.scanArgs(arguments, 'sNN');
			name = CP932.decode(name.toStrValue()._value);
			size = size ? size.toIntValue()._value : 18;
			style = style ? style.toIntValue()._value : 0;
			this.currentScreen.setFont(name, size, style);
		},
		0x18: function color(r, g, b) {
			this.scanArgs(arguments, 'NNN');
			r = r ? r.toIntValue()._value & 255 : 0;
			g = g ? g.toIntValue()._value & 255 : 0;
			b = b ? b.toIntValue()._value & 255 : 0;
			this.currentScreen.selectColor(r, g, b);
		},
		0x1b: function redraw() {
			this.scanArgs(arguments, 'NNNNN');
			// 何もしない
		},
		0x1d: function gsel(screenId) {
			this.scanArgs(arguments, 'N');
			screenId = screenId ? screenId.toIntValue()._value : 0;
			var screen = this.getScreen(screenId);
			this.currentScreen = screen;
			this.currentScreenId = screenId;
		},
		0x1e: function gcopy(srcScreenId, srcX, srcY, width, height) {
			this.scanArgs(arguments, 'NNNNN');
			var screen = this.currentScreen;
			srcScreenId = srcScreenId ? srcScreenId.toIntValue()._value : 0;
			var srcScreen = this.getScreen(srcScreenId);
			srcX = srcX ? srcX.toIntValue()._value : 0;
			srcY = srcY ? srcY.toIntValue()._value : 0;
			width = width ? width.toIntValue()._value : screen.copyWidth;
			height = height ? height.toIntValue()._value : screen.copyHeight;

			var destOffsetX = 0, destOffsetY = 0;
			if(srcX > srcScreen.width) srcX = srcScreen.width;
			if(srcY > srcScreen.height) srcY = srcScreen.height;
			if(srcX < 0) {
				destOffsetX = -srcX;
				width -= destOffsetX;
				srcX = 0;
			}
			if(srcY < 0) {
				destOffsetY = -srcY;
				height -= destOffsetY;
				srcY = 0;
			}
			if(width > srcScreen.width - srcX) width = srcScreen.width - srcX;
			if(height > srcScreen.height - srcY) height = srcScreen.height - srcY;
			if(width < 0) width = 0;
			if(height < 0) height = 0;

			screen.ctx.drawImage(srcScreen.ctx.canvas, srcX, srcY, width, height,
			                     screen.currentX + destOffsetX, screen.currentY + destOffsetY, width, height);
		},
		0x22: function hsvcolor(h, s, v) {
			this.scanArgs(arguments, 'NNN');
			h = h ? h.toIntValue()._value % 192 : 0;
			s = s ? s.toIntValue()._value & 255 : 0;
			v = v ? v.toIntValue()._value & 255 : 0;
			this.currentScreen.selectColorByHSV(h, s, v);
		},
		0x23: function getkey(v, key) {
			this.scanArgs(arguments, 'vN');
			key = key ? key.toIntValue()._value : 1;
			v.assign(new IntValue(this.keyPressed[key]));
		},
		0x29: function buffer(screenId, width, height) {
			this.scanArgs(arguments, 'NNNNNNNN');
			screenId = screenId ? screenId.toIntValue()._value : 0;
			width = width ? width.toIntValue()._value : 640;
			height = height ? height.toIntValue()._value : 480;
			var screen;
			if(!(screen = this.screens[screenId])) {
				screen = this.screens[screenId] = new Screen;
			}
			var canvas = document.createElement('canvas');
			canvas.width = width;
			canvas.height = height;
			screen.setContext(canvas.getContext('2d'));
			screen.clear();
			this.currentScreen = screen;
			this.currentScreenId = screenId;
		},
		0x2a: function screen(screenId, width, height) {
			this.scanArgs(arguments, 'NNNNNNNN');
			screenId = screenId ? screenId.toIntValue()._value : 0;
			width = width ? width.toIntValue()._value : 640;
			height = height ? height.toIntValue()._value : 480;
			if(screenId == 0) {
				this.changeMainCanvas(width, height);
				this.currentScreen = this.mainScreen;
				this.currentScreenId = 0;
			} else {
				throw new HSPError(ErrorCode.ILLEGAL_FUNCTION, 'ID 0 以外の screen は未対応');
			}
		},
		0x2f: function line(x1, y1, x2, y2) {
			this.scanArgs(arguments, 'NNNN');
			x1 = x1 ? x1.toIntValue()._value : 0;
			y1 = y1 ? y1.toIntValue()._value : 0;
			x2 = x2 ? x2.toIntValue()._value : this.currentScreen.currentX;
			y2 = y2 ? y2.toIntValue()._value : this.currentScreen.currentY;
			this.currentScreen.drawLine(x1, y1, x2, y2);
		},
		0x31: function boxf(x1, y1, x2, y2) {
			this.scanArgs(arguments, 'NNNN');
			x1 = x1 ? x1.toIntValue()._value : 0;
			y1 = y1 ? y1.toIntValue()._value : 0;
			x2 = x2 ? x2.toIntValue()._value : this.currentScreen.width;
			y2 = y2 ? y2.toIntValue()._value : this.currentScreen.height;
			this.currentScreen.drawRect(x1, y1, x2, y2);
		},
		0x34: function stick(v, notrigerMask) {
			this.scanArgs(arguments, 'vNN');
			notrigerMask = notrigerMask ? notrigerMask.toIntValue()._value : 0;
			var state = 0;
			if(this.keyPressed[37]) state |= 1;     // カーソルキー左(←)
			if(this.keyPressed[38]) state |= 2;     // カーソルキー上(↑)
			if(this.keyPressed[39]) state |= 4;     // カーソルキー右(→)
			if(this.keyPressed[40]) state |= 8;     // カーソルキー下(↓)
			if(this.keyPressed[32]) state |= 16;    // スペースキー
			if(this.keyPressed[13]) state |= 32;    // Enterキー
			if(this.keyPressed[17]) state |= 64;    // Ctrlキー
			if(this.keyPressed[27]) state |= 128;   // ESCキー
			if(this.keyPressed[1])  state |= 256;   // マウスの左ボタン
			if(this.keyPressed[2])  state |= 512;   // マウスの右ボタン
			if(this.keyPressed[9])  state |= 1024;  // TABキー
			var lastState = this.lastStickState || 0;
			var trigger = state & ~lastState;
			this.lastStickState = state;
			v.assign(new IntValue(trigger | state & notrigerMask));
		}
	});
	Utils.objectExtend(BuiltinFuncs[Token.Type.EXTSYSVAR], {
		0x000: function mousex() {
			return new IntValue(this.currentScreen.mouseX);
		},
		0x001: function mousey() {
			return new IntValue(this.currentScreen.mouseY);
		},
		0x002: function mousew() {
			var result = this.currentScreen.mouseW;
			this.currentScreen.mouseW = 0;
			return new IntValue(result);
		},
		0x100: function ginfo(type) {
			this.scanArgs(arguments, 'n');
			type = type.toIntValue()._value;
			switch(type) {
			case 12: // ginfo_winx
				return new IntValue(this.currentScreen.width);
			case 13: // ginfo_winy
				return new IntValue(this.currentScreen.height);
			case 14: // ginfo_mesx
				return new IntValue(this.currentScreen.mesX);
			case 15: // ginfo_mesy
				return new IntValue(this.currentScreen.mesY);
			case 16: // ginfo_r
				return new IntValue(this.currentScreen.currentR);
			case 17: // ginfo_g
				return new IntValue(this.currentScreen.currentG);
			case 18: // ginfo_b
				return new IntValue(this.currentScreen.currentB);
			case 22: // ginfo_cx
				return new IntValue(this.currentScreen.currentX);
			case 23: // ginfo_cy
				return new IntValue(this.currentScreen.currentY);
			case 26: // ginfo_sx
				return new IntValue(this.currentScreen.width);
			case 27: // ginfo_sy
				return new IntValue(this.currentScreen.height);
			default:
				throw new HSPError(ErrorCode.ILLEGAL_FUNCTION);
			}
		}
	});
}

})();

