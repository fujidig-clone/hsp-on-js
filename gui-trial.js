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
	toRGBAString: function(r, g, b, a) {
		return 'rgba('+r+','+g+','+b+','+a+')';
	},
	toRGBString: function(r, g, b) {
		return 'rgb('+r+','+g+','+b+')';
	},
	toHexString: function(r, g, b) {
		return '#' + (0x1000000 | r << 16 | g << 8 | b).toString(16).slice(1);
	}
});

Color.prototype = {
	toRGBAString: function() {
		return Color.toRGBAString(this.r, this.g, this.b, this.a);
	},
	toRGBString: function() {
		return Color.toRGBString(this.r, this.g, this.b);
	},
	toHexString: function() {
		return Color.toHexString(this.r, this.g, this.b);
	},
	toString: function() {
		return '<Color: '+this.toRGBAString()+'>';
	}
};

var addEvent =
 window.addEventListener ? function(e, n, f) { e.addEventListener(n, f, false); }
                         : function(e, n, f) { e.attachEvent('on' + n, f); };

var removeEvent = 
 window.removeEventListener ? function(e, n, f) { e.removeEventListener(n, f, false); }
                            : function(e, n, f) { e.detachEvent('on' + n, f); };

HSPonJS.emptyFunction = function(){};

function XHRReadURL(url, success, error) {
	var xhr;
	if(window.XMLHttpRequest) {
		xhr = new XMLHttpRequest();
	} else {
		try {
			xhr = new ActiveXObject("Msxml2.XMLHTTP");
		} catch(e) {
			xhr = new ActiveXObject("Microsoft.XMLHTTP");
		}
	}
	xhr.open("GET", url, true);
	xhr.onreadystatechange = function() {
		if(!(xhr && xhr.readyState == 4)) return;
		if(200 <= xhr.status && xhr.status < 300) {
			var data = xhr.responseText;
			setTimeout(function(){success(data)}, 0);
		} else if(xhr.status) {
			setTimeout(function(){error()}, 0);
		}
		xhr.onreadystatechange = HSPonJS.emptyFunction;
		xhr = null;
	};
	xhr.send(null);
	return xhr;
}

function Screen() {
	this.ctx = null;
	this.width = this.height = null;
	this.clearInfo();
}

Screen.prototype = {
	setContext: function(ctx) {
		this.ctx = ctx;
		this.width = ctx.canvas.width;
		this.height = ctx.canvas.height;
		this.canvas = ctx.canvas;
	},
	clear: function(n) {
		this.clearInfo();
		var ctx = this.ctx;
		switch(n) {
		default:
		case 0:
			ctx.fillStyle = '#fff';
			break;
		case 1:
			ctx.fillStyle = '#c0c0c0';
			break;
		case 2:
			ctx.fillStyle = '#808080';
			break;
		case 3:
			ctx.fillStyle = '#404040';
			break;
		case 4:
			ctx.fillStyle = '#000';
			break;
		}
		ctx.fillRect(0, 0, this.width, this.height);
		this.selectColor(0, 0, 0);
		this.setFont('monospace', 18, 0);
	},
	clearInfo: function() {
		this.currentX = this.currentY = 0;
		this.currentR = this.currentG = this.currentB = 0;
		this.mesX = this.mesY = 0;
		this.mouseX = this.mouseY = this.mouseW = 0;
		this.fontSize = 18;
		this.fontStyle = 0;
		this.copyWidth = this.copyHeight = 32;
		this.copyMode = 0;
		this.copyAlpha = 0;
	},
	changeToNewCanvas: function(width, height) {
		var canvas = document.createElement('canvas');
		canvas.width = width;
		canvas.height = height;
		this.setContext(canvas.getContext('2d'));
		this.clear();
	},
	selectColor: function(r, g, b) {
		this.currentR = r & 255;
		this.currentG = g & 255;
		this.currentB = b & 255;
		this.ctx.fillStyle = this.ctx.strokeStyle = Color.toRGBString(this.currentR, this.currentG, this.currentB);
	},
	selectColorByHSV: function(h, s, v) {
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
	drawEllipse: function(x1, y1, x2, y2, fill_p) {
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
	drawText: function(text) {
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
		// Webkit Nightly Builds (r39088) で setTimeout 内で ctx.fillText しても描画されない
		// 前か後ろで何か描画してやるとうまくいくみたいなので、しておく。
		ctx.fillRect(0, 0, 0, 0); 
	},
	setFont: function(name, size, style) {
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
	drawLine: function(x1, y1, x2, y2) {
		// FIXME アンチエイリアスのかかった線が描画されてしまう
		this.currentX = x1;
		this.currentY = y1;
		var ctx = this.ctx;
		ctx.beginPath();
		ctx.moveTo(x2 + 0.5, y2 + 0.5);
		ctx.lineTo(x1 + 0.5, y1 + 0.5);
		ctx.stroke();
	},
	drawRect: function(x1, y1, x2, y2) {
		var width = Math.abs(x2 - x1) + 1;
		var height = Math.abs(y2 - y1) + 1;
		var x = Math.min(x1, x2);
		var y = Math.min(y1, y2);
		this.ctx.fillRect(x, y, width, height);
	}
};

HSPonJS.Utils.objectExtend(HSPonJS.Evaluator.prototype, {
	guiInitialize: function(iframe, width, height) {
		this.iframe = iframe;
		var doc = this.iframeDoc = iframe.contentWindow.document;
		var mainScreen = this.mainScreen = new Screen;
		this.locked = false; // true である間、 onclick などのイベントの実行をしない
		this.quited = false;
		this.atQuitCallbacks = [];
		
		mainScreen.changeToNewCanvas = function(width, height) {
			iframe.setAttribute('width', width);
			iframe.setAttribute('height', height);
			if(this.ctx) {
				doc.body.removeChild(this.ctx.canvas);
			}
			var canvas = doc.createElement('canvas');
			canvas.width = width;
			canvas.height = height;
			this.setContext(canvas.getContext('2d'));
			doc.body.appendChild(canvas);
			this.clear();
		};

		mainScreen.changeToNewCanvas(width, height);

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
	removeCanvasElement: function() {
		if(this.mainScreen.ctx) {
			this.iframeDoc.body.removeChild(this.mainScreen.ctx.canvas);
		}
	},
	getScreen: function(id) {
		var screen = this.screens[id];
		if(!screen) throw new HSPError(ErrorCode.ILLEGAL_FUNCTION);
		return screen;
	},
	quit: function() {
		if(this.quited) return;
		if(this.timeoutID != undefined) {
			clearTimeout(this.timeoutID);
		}
		if(this.timeoutCanceller) {
			this.timeoutCanceller();
			this.timeoutCanceller = undefined;
		}
		if(this.fileReadXHR) {
			this.fileReadXHR.abort();
			this.fileReadXHR = null;
		}
		while(this.atQuitCallbacks.length) {
			this.atQuitCallbacks.pop()();
		}
		this.removeEvents();
		this.removeCanvasElement();
		this.onQuit();
		this.quited = true;
	},
	addCallbackOnQuit: function(callback) {
		this.atQuitCallbacks.push(callback);
	},
	removeCallbackOnQuit: function(callback) {
		var index = this.atQuitCallbacks.indexOf(callback);
		if(index >= 0) {
			this.atQuitCallbacks.splice(index, 1);
		}
	}
});

function fast_timeout(callback) {
	// see http://subtech.g.hatena.ne.jp/cho45/20090125/1232831437
	var img = new Image();
	var handler = function() {
		canceller();
		callback();
	};
	img.addEventListener("load", handler, false);
	img.addEventListener("error", handler, false);
	
	var canceller = function() {
		img.removeEventListener("load", handler, false);
		img.removeEventListener("error", handler, false);
	};
	
	img.src = "data:,/ _ / X";
	return canceller;
}

with(HSPonJS) {
	HSPonJS.Utils.objectExtend(HSPonJS.Evaluator.prototype, {
		onInternalError: function(e) {
			var insn = this.sequence[this.pc];
			var msg = 'JavaScript Error!\n';
			msg += e+'\n';
			msg += e.fileName+':'+e.lineNumber+'\n';
			msg += 'pc = '+this.pc+'\n';
			if(insn) {
				msg += insn.lineNo+' ('+insn.fileName+') \n';
				msg += insn;
			}
			alert(msg);
			throw e;
		},
		onError: function(e) {
			alert(this.getErrorOutput(e));
			this.quit();
		},
		onEnd: function(e) {
			this.quit();
		},
		onWait: function(e) {
			var self = this;
			if(e.msec == 0) {
				this.timeoutCanceller = fast_timeout(function() {
					self.timeoutCanceller = undefined;
					self.lastWaitTime = +new Date;
					self.resume();
				});
				return;
			}
			this.timeoutID = setTimeout(function() {
				self.timeoutID = undefined;
				self.lastWaitTime = +new Date;
				self.resume();
			}, e.msec);
		},
		onFileRead: function(e) {
			var self = this;
			self.fileReadXHR = XHRReadURL(
				e.path,
				function(data){
					self.fileReadXHR = null;
					self.resume(function() { e.success.call(self, data); });
				},
				function() {
					self.fileReadXHR = null;
					self.resume(function(){ e.error.call(self); });
				});
		}
	});

	defineInlineBuiltinFunc('dialog', [false, false, false, false], function(g, paramInfos) {
		var messageExpr = 'CP932.decode('+g.getStrConvertedNativeValueParamExpr(paramInfos[0], '""')+')';
		var typeExpr = g.getIntParamNativeValueExpr(paramInfos[1], 0);
		var optionExpr = 'CP932.decode('+g.getStrParamNativeValueExpr(paramInfos[2], '""')+')';
		var reservedExpr = g.getIntParamNativeValueExpr(paramInfos[3], 0);
		g.push(g.getRegisteredObjectExpr(dialog_internal)+'(this, '+messageExpr+', '+typeExpr+', '+optionExpr+', '+reservedExpr+');');
	});

	var dialog_internal = function(e, message, type, option, reserved) {
		if(type & ~0xf) return;
		if(type & 2) {
			e.stat.assign(0, IntValue.of(window.confirm(message) ? 6 : 7));
		} else {
			window.alert(message);
			e.stat.assign(0, IntValue.of(1));
		}
	};

	defineInlineBuiltinFunc('pset', [false, false], function(g, paramInfos) {
		var xExpr = g.getIntParamNativeValueExpr(paramInfos[0], 'this.currentScreen.currentX');
		var yExpr = g.getIntParamNativeValueExpr(paramInfos[1], 'this.currentScreen.currentY');
		g.push('this.currentScreen.ctx.fillRect('+xExpr+', '+yExpr+', 1, 1);');
	});

	defineInlineBuiltinFunc('pget', [false, false], function(g, paramInfos) {
		var xExpr = g.getIntParamNativeValueExpr(paramInfos[0], 'this.currentScreen.currentX');
		var yExpr = g.getIntParamNativeValueExpr(paramInfos[1], 'this.currentScreen.currentY');
		g.push(g.getRegisteredObjectExpr(pget_internal)+'(this.currentScreen, '+xExpr+', '+yExpr+');');
	});

	var pget_internal = function(screen, x, y) {
		var r, g, b;
		var ctx = screen.ctx;
		if(x < 0 || x >= ctx.canvas.width || y < 0 || y >= ctx.canvas.height) {
			r = g = b = 255;
		} else {
			var data = ctx.getImageData(x, y, 1, 1).data;
			r = data[0], g = data[1], b = data[2];
		}
		screen.selectColor(r, g, b);
	};
	
	defineInlineBuiltinFunc('mes', [false], function(g, paramInfos) {
		g.push('this.currentScreen.drawText(CP932.decode('+g.getStrConvertedNativeValueParamExpr(paramInfos[0], '""')+'));');
	});

	defineInlineBuiltinFunc('pos', [false, false], function(g, paramInfos) {
		if(!isDefaultParamInfo(paramInfos[0])) {
			g.push('this.currentScreen.currentX = '+g.getIntParamNativeValueExpr(paramInfos[0])+';');
		}
		if(!isDefaultParamInfo(paramInfos[1])) {
			g.push('this.currentScreen.currentY = '+g.getIntParamNativeValueExpr(paramInfos[1])+';');
		}
	});

	defineInlineBuiltinFunc('circle', [false, false, false, false, false], function(g, paramInfos) {
		var x1Expr = g.getIntParamNativeValueExpr(paramInfos[0], 0);
		var y1Expr = g.getIntParamNativeValueExpr(paramInfos[1], 0);
		var x2Expr = g.getIntParamNativeValueExpr(paramInfos[2], 'this.currentScreen.width');
		var y2Expr = g.getIntParamNativeValueExpr(paramInfos[3], 'this.currentScreen.height');
		var fillPExpr = g.getIntParamNativeValueExpr(paramInfos[4], '1');
		g.push('this.currentScreen.drawEllipse('+x1Expr+', '+y1Expr+', '+x2Expr+', '+y2Expr+', '+fillPExpr+');');
	});

	defineInlineBuiltinFunc('cls', [false], function(g, paramInfos) {
		g.push('this.currentScreen.clear('+g.getIntParamNativeValueExpr(paramInfos[0], 0)+');');
	});

	defineInlineBuiltinFunc('font', [false, false, false], function(g, paramInfos) {
		var nameExpr = 'CP932.decode('+g.getStrParamNativeValueExpr(paramInfos[0])+')';
		var sizeExpr = g.getIntParamNativeValueExpr(paramInfos[1], 18);
		var styleExpr = g.getIntParamNativeValueExpr(paramInfos[2], 0);
		g.push('this.currentScreen.setFont('+nameExpr+', '+sizeExpr+', '+styleExpr+');');
	});

	defineInlineBuiltinFunc('picload', [false, false], function(g, paramInfos) {
		var pathExpr = g.getStrParamNativeValueExpr(paramInfos[0]);
		var modeExpr = g.getIntParamNativeValueExpr(paramInfos[1], 0);
		g.push(g.getRegisteredObjectExpr(picload_internal)+'(this, '+pathExpr+', '+modeExpr+');');
	});

	var picload_internal = function(e, path, mode) {
		var image = new Image;
		image.src = path;
		image.onload = function() {
			if(e.quited) return;
			e.locked = false;
			e.removeCallbackOnQuit(callback);
			var screen = e.currentScreen;
			if(mode == 0) {
				screen.changeToNewCanvas(image.width, image.height);
			}
			screen.ctx.drawImage(image, screen.currentX, screen.currentY);
			e.resume();
		};
		image.onerror = function() {
			if(e.quited) return;
			e.locked = false;
			e.removeCallbackOnQuit(callback);
			e.resume(function() { throw new HSPError(ErrorCode.PICTURE_MISSING); });
		};
		e.locked = true;
		var callback = function() {
			delete image.onload;
			delete image.onerror;
		};
		e.addCallbackOnQuit(callback);
		
		throw new VoidException;
	};

	defineInlineBuiltinFunc('color', [false, false, false], function(g, paramInfos) {
		var RExpr = g.getIntParamNativeValueExpr(paramInfos[0], 0) + ' & 255';
		var GExpr = g.getIntParamNativeValueExpr(paramInfos[1], 0) + ' & 255';
		var BExpr = g.getIntParamNativeValueExpr(paramInfos[2], 0) + ' & 255';
		g.push('this.currentScreen.selectColor('+RExpr+', '+GExpr+', '+BExpr+');');
	});

	defineInlineBuiltinFunc('redraw', [false, false, false, false, false], function(g, paramInfos) {
		function evalParam(i) {
			g.push('('+g.getIntParamNativeValueExpr(paramInfos[i], 0)+');');
		}
		evalParam(0);
		evalParam(1);
		evalParam(2);
		evalParam(3);
		evalParam(4);
		// 何もしない
	});

	defineInlineBuiltinFunc('gsel', [false], function(g, paramInfos) {
		g.push(g.getRegisteredObjectExpr(gsel_internal)+'(this, '+g.getIntParamNativeValueExpr(paramInfos[0], 0)+');');
	});

	var gsel_internal = function(e, id) {
		var screen = e.getScreen(id);
		e.currentScreen = screen;
		e.currentScreenId = id;
	};

	defineInlineBuiltinFunc('gcopy', [false, false, false, false, false], function(g, paramInfos) {
		var srcScreenIdExpr = g.getIntParamNativeValueExpr(paramInfos[0], 0);
		var srcXExpr = g.getIntParamNativeValueExpr(paramInfos[1], 0);
		var srcYExpr = g.getIntParamNativeValueExpr(paramInfos[2], 0);
		var widthExpr = g.getIntParamNativeValueExpr(paramInfos[3], 'this.currentScreen.copyWidth');
		var heightExpr = g.getIntParamNativeValueExpr(paramInfos[4], 'this.currentScreen.copyHeight');
		var screenExpr = 'this.currentScreen';
		var srcScreenExpr = 'this.getScreen('+srcScreenIdExpr+')';
		var funcExpr = g.getRegisteredObjectExpr(gcopy_internal);
		g.push(funcExpr+'('+screenExpr+', '+srcScreenExpr+', '+srcXExpr+', '+srcYExpr+', '+widthExpr+', '+heightExpr+');');
	});

	var gcopy_internal = function(screen, srcScreen, srcX, srcY, width, height) {
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
		if(width <= 0 || height <= 0) return;

		var ctx = screen.ctx;
		ctx.save();
		switch(screen.copyMode) {
		case 3: // gmode_alpha
			ctx.globalAlpha = screen.copyAlpha / 256;
			break;
		case 5: // gmode_add
			ctx.globalAlpha = screen.copyAlpha / 256;
			ctx.globalCompositeOperation = 'lighter';
			break;
		}
		ctx.drawImage(srcScreen.ctx.canvas, srcX, srcY, width, height,
		              screen.currentX + destOffsetX, screen.currentY + destOffsetY, width, height);
		ctx.restore();
	};

	defineInlineBuiltinFunc('gzoom', [false, false, false, false, false, false, false, false], function(g, paramInfos) {
		var destWidthExpr = g.getIntParamNativeValueExpr(paramInfos[0], 'this.currentScreen.width');
		var destHeightExpr = g.getIntParamNativeValueExpr(paramInfos[1], 'this.currentScreen.height');
		var srcScreenIdExpr = g.getIntParamNativeValueExpr(paramInfos[2], 0);
		var srcXExpr = g.getIntParamNativeValueExpr(paramInfos[3], 0);
		var srcYExpr = g.getIntParamNativeValueExpr(paramInfos[4], 0);
		var srcWidthExpr = g.getIntParamNativeValueExpr(paramInfos[5], 'screen.copyWidth');
		var srcHeightExpr = g.getIntParamNativeValueExpr(paramInfos[6], 'screen.copyHeight');
		var modeExpr = g.getIntParamNativeValueExpr(paramInfos[7], 0);
		var screenExpr = 'this.currentScreen';
		var srcScreenExpr = 'this.getScreen('+srcScreenIdExpr+')';
		var funcExpr = g.getRegisteredObjectExpr(gzoom_internal);
		g.push(funcExpr+'('+screenExpr+', '+srcScreenExpr+', '+destWidthExpr+', '+destHeightExpr+', '+
		       srcXExpr+', '+srcYExpr+', '+srcWidthExpr+', '+srcHeightExpr+', '+modeExpr+');');
	});
	
	var gzoom_internal = function(screen, srcScreen, destWidth, destHeight, srcX, srcY, srcWidth, srcHeight, mode) {
		if(srcWidth == 0 || srcHeight == 0) return;
		
		// (src|dest)(Width|Height) が負のときや、 src のコピーする領域がはみ出しているときに
		// そのままだとエラーになるので調節する
		
		var signX = 1, signY = 1; // 反転させるとき -1
		var destOffsetX = 0, destOffsetY = 0;
		if(srcWidth < 0) {
			srcWidth *= -1;
			srcX -= srcWidth;
			if(srcX < 0) {
				destWidth = Math.round((1 + srcX / srcWidth) * destWidth);
				srcWidth += srcX;
				if(srcWidth <= 0) return;
				srcX = 0;
			}
			destOffsetX = destWidth;
			signX *= -1;
		}
		if(srcHeight < 0) {
			srcHeight *= -1;
			srcY -= srcHeight;
			if(srcY < 0) {
				destHeight = Math.round((1 + srcY / srcHeight) * destHeight);
				srcHeight += srcY;
				if(srcHeight <= 0) return;
				srcY = 0;
			}
			destOffsetY = destHeight;
			signY *= -1;
		}
		if(srcX > srcScreen.width) srcX = srcScreen.width;
		if(srcY > srcScreen.height) srcY = srcScreen.height;
		if(srcX < 0) {
			destOffsetX = Math.round(-srcX / srcWidth * destWidth);
			srcWidth += srcX;
			if(srcWidth <= 0) return;
			destWidth -= destOffsetX;
			srcX = 0;
		}
		if(srcY < 0) {
			destOffsetY = Math.round(-srcY / srcHeight * destHeight);
			srcHeight += srcY;
			if(srcHeight <= 0) return;
			destHeight -= destOffsetY;
			srcY = 0;
		}
		if(srcWidth > srcScreen.width - srcX) {
			destWidth = Math.round((srcScreen.width - srcX) / srcWidth * destWidth);
			srcWidth = srcScreen.width - srcX;
			if(srcWidth == 0) return;
		}
		if(srcHeight > srcScreen.height - srcY) {
			destHeight = Math.round((srcScreen.height - srcY) / srcHeight * destHeight);
			srcHeight = srcScreen.height - srcY;
			if(srcHeight == 0) return;
		}
		if(destWidth < 0) {
			destWidth *= -1;
			signX *= -1;
		}
		if(destHeight < 0) {
			destHeight *= -1;
			signY *= -1;
		}
		var ctx = screen.ctx;
		ctx.save();
		ctx.translate(screen.currentX + destOffsetX, screen.currentY + destOffsetY);
		ctx.scale(signX, signY);
		ctx.drawImage(srcScreen.ctx.canvas, srcX, srcY, srcWidth, srcHeight, 0, 0, destWidth, destHeight);
		ctx.restore();
	};

	defineInlineBuiltinFunc('gmode', [false, false, false, false], function(g, paramInfos) {
		g.push('this.currentScreen.copyMode = '+g.getIntParamNativeValueExpr(paramInfos[0], 0)+';');
		g.push('this.currentScreen.copyWidth = '+g.getIntParamNativeValueExpr(paramInfos[1], 32)+';');
		g.push('this.currentScreen.copyHeight = '+g.getIntParamNativeValueExpr(paramInfos[2], 32)+';');
		g.push('this.currentScreen.copyAlpha = '+g.getIntParamNativeValueExpr(paramInfos[3], 0)+';');
	});

	defineInlineBuiltinFunc('hsvcolor', [false, false, false], function(g, paramInfos) {
		var HExpr = g.getIntParamNativeValueExpr(paramInfos[0], 0);
		var SExpr = g.getIntParamNativeValueExpr(paramInfos[1], 0);
		var VExpr = g.getIntParamNativeValueExpr(paramInfos[2], 0);
		g.push('this.currentScreen.selectColorByHSV('+HExpr+', '+SExpr+', '+VExpr+');');
	});

	defineInlineBuiltinFunc('getkey', [true, false], function(g, paramInfos) {
		var agentExpr = g.getVariableAgentParamExpr(paramInfos[0]);
		var keyCodeExpr = g.getIntParamNativeValueExpr(paramInfos[0], 1);
		g.push(agentExpr+'.assign(IntValue.of(this.keyPressed['+keyCodeExpr+']));');
	});

	defineInlineBuiltinFunc('buffer', [false, false, false, false], function(g, paramInfos) {
		var idExpr = g.getIntParamNativeValueExpr(paramInfos[0], 0);
		var widthExpr = g.getIntParamNativeValueExpr(paramInfos[1], 640);
		var heightExpr = g.getIntParamNativeValueExpr(paramInfos[2], 480);
		var modeExpr = g.getIntParamNativeValueExpr(paramInfos[3], 0);
		g.push(g.getRegisteredObjectExpr(buffer_internal)+'(this, '+idExpr+', '+widthExpr+', '+heightExpr+', '+modeExpr+');');
	});

	var buffer_internal = function(e, id, width, height, mode) {
		var screen;
		if(!(screen = e.screens[id])) {
			screen = e.screens[id] = new Screen;
		}
		screen.changeToNewCanvas(width, height);
		e.currentScreen = screen;
		e.currentScreenId = id;
	};

	defineInlineBuiltinFunc('screen', [false, false, false, false], function(g, paramInfos) {
		var idExpr = g.getIntParamNativeValueExpr(paramInfos[0], 0);
		var widthExpr = g.getIntParamNativeValueExpr(paramInfos[1], 640);
		var heightExpr = g.getIntParamNativeValueExpr(paramInfos[2], 480);
		var modeExpr = g.getIntParamNativeValueExpr(paramInfos[3], 0);
		g.push(g.getRegisteredObjectExpr(screen_internal)+'(this, '+idExpr+', '+widthExpr+', '+heightExpr+', '+modeExpr+');');
	});

	var screen_internal = function(e, id, width, height, mode) {
		if(id == 0) {
			e.mainScreen.changeToNewCanvas(width, height);
			e.currentScreen = e.mainScreen;
			e.currentScreenId = 0;
		} else {
			throw new HSPError(ErrorCode.ILLEGAL_FUNCTION, 'ID 0 以外の screen は未対応');
		}
	};

	defineInlineBuiltinFunc('line', [false, false, false, false], function(g, paramInfos) {
		var x1Expr = g.getIntParamNativeValueExpr(paramInfos[0], 0);
		var y1Expr = g.getIntParamNativeValueExpr(paramInfos[1], 0);
		var x2Expr = g.getIntParamNativeValueExpr(paramInfos[2], 'this.currentScreen.currentX');
		var y2Expr = g.getIntParamNativeValueExpr(paramInfos[3], 'this.currentScreen.currentY');
		g.push('this.currentScreen.drawLine('+x1Expr+', '+y1Expr+', '+x2Expr+', '+y2Expr+');');
	});

	defineInlineBuiltinFunc('boxf', [false, false, false, false], function(g, paramInfos) {
		var x1Expr = g.getIntParamNativeValueExpr(paramInfos[0], 0);
		var y1Expr = g.getIntParamNativeValueExpr(paramInfos[1], 0);
		var x2Expr = g.getIntParamNativeValueExpr(paramInfos[2], 'this.currentScreen.width');
		var y2Expr = g.getIntParamNativeValueExpr(paramInfos[3], 'this.currentScreen.height');
		g.push('this.currentScreen.drawRect('+x1Expr+', '+y1Expr+', '+x2Expr+', '+y2Expr+');');
	});

	defineInlineBuiltinFunc('stick', [true, false, false], function(g, paramInfos) {
		var agentExpr = g.getVariableAgentParamExpr(paramInfos[0]);
		var maskExpr = g.getIntParamNativeValueExpr(paramInfos[1], 0);
		var activeCheckExpr = g.getIntParamNativeValueExpr(paramInfos[2], 1);
		g.push(g.getRegisteredObjectExpr(stick_internal)+'(this, '+agentExpr+', '+maskExpr+', '+activeCheckExpr+');');
	});

	var stick_internal = function(e, v, notrigerMask) {
		var state = 0;
		var keyPressed = e.keyPressed;
		if(keyPressed[37]) state |= 1;     // カーソルキー左(←)
		if(keyPressed[38]) state |= 2;     // カーソルキー上(↑)
		if(keyPressed[39]) state |= 4;     // カーソルキー右(→)
		if(keyPressed[40]) state |= 8;     // カーソルキー下(↓)
		if(keyPressed[32]) state |= 16;    // スペースキー
		if(keyPressed[13]) state |= 32;    // Enterキー
		if(keyPressed[17]) state |= 64;    // Ctrlキー
		if(keyPressed[27]) state |= 128;   // ESCキー
		if(keyPressed[1])  state |= 256;   // マウスの左ボタン
		if(keyPressed[2])  state |= 512;   // マウスの右ボタン
		if(keyPressed[9])  state |= 1024;  // TABキー
		var lastState = e.lastStickState || 0;
		var trigger = state & ~lastState;
		e.lastStickState = state;
		v.assign(new IntValue(trigger | state & notrigerMask));
	};

	defineInlineBuiltinFunc('grect', [false, false, false, false, false], function(g, paramInfos) {
		var XExpr = g.getIntParamNativeValueExpr(paramInfos[0], 0);
		var YExpr = g.getIntParamNativeValueExpr(paramInfos[1], 0);
		var radExpr = g.getDoubleParamNativeValueExpr(paramInfos[2], 0);
		var widthExpr = 'Math.abs('+g.getIntParamNativeValueExpr(paramInfos[3], 'this.currentScreen.copyWidth')+')';
		var heightExpr = 'Math.abs('+g.getIntParamNativeValueExpr(paramInfos[4], 'this.currentScreen.copyHeight')+')';
		g.push(g.getRegisteredObjectExpr(grect_internal)+'(this.currentScreen, '+XExpr+', '+YExpr+', '+radExpr+', '+widthExpr+', '+heightExpr+');');
	});

	var grect_internal = function(screen, x, y, rad, width, height) {
		var ctx = screen.ctx;
		ctx.save();
		switch(screen.copyMode) {
		case 3: // gmode_alpha
			ctx.globalAlpha = screen.copyAlpha / 256;
			break;
		case 5: // gmode_add
			ctx.globalAlpha = screen.copyAlpha / 256;
			ctx.globalCompositeOperation = 'lighter';
			break;
		}
		ctx.translate(x, y);
		ctx.rotate(rad);
		ctx.fillRect(-width / 2, -height / 2, width, height);
		ctx.restore();
	};
	
	defineInlineBuiltinFunc('gsquare', [false, true, true, true, true], function(g, paramInfos) {
		var funcExpr = g.getRegisteredObjectExpr(gsquare_internal);
		var idExpr = g.getIntParamNativeValueExpr(paramInfos[0]);
		var destXsExpr = g.getNoSubscriptVariableParamExpr(paramInfos[1]);
		var destYsExpr = g.getNoSubscriptVariableParamExpr(paramInfos[2]);
		var srcXsExpr = g.getNoSubscriptVariableParamExpr(paramInfos[3]);
		var srcYsExpr = g.getNoSubscriptVariableParamExpr(paramInfos[4]);
		if(isDefaultParamInfo(paramInfos[3])) srcXsExpr = 'null';
		if(isDefaultParamInfo(paramInfos[4])) srcYsExpr = 'null';
		g.push(funcExpr+'(this, '+idExpr+', '+destXsExpr+', '+destYsExpr+', '+srcXsExpr+', '+srcYsExpr+');');
	});
	
	var gsquare_internal = function(e, id, destXs, destYs, srcXs, srcYs) {
		checkTypeInt(destXs.value);
		checkTypeInt(destYs.value);
		if(id >= 0) {
			if(!(srcXs && srcYs)) throw new HSPError(ErrorCode.VARIABLE_REQUIRED);
			checkTypeInt(srcXs.value);
			checkTypeInt(srcYs.value);
			throw new HSPError(ErrorCode.UNSUPPORTED_FUNCTION, 'gsquare は -1 以外未対応');
		} else {
			if(srcXs || srcYs) {
				throw new HSPError(ErrorCode.TOO_MANY_PARAMETERS);
			}
			var xs = getValues(destXs);
			var ys = getValues(destYs);
			var screen = e.currentScreen;
			var ctx = screen.ctx;
			ctx.save();
			switch(screen.copyMode) {
			case 3: // gmode_alpha
				ctx.globalAlpha = screen.copyAlpha / 256;
				break;
			case 5: // gmode_add
				ctx.globalAlpha = screen.copyAlpha / 256;
				ctx.globalCompositeOperation = 'lighter';
				break;
			}
			ctx.beginPath();
			ctx.moveTo(xs[0], ys[0]);
			ctx.lineTo(xs[1], ys[1]);
			ctx.lineTo(xs[2], ys[2]);
			ctx.lineTo(xs[3], ys[3]);
			ctx.fill();
			ctx.restore();
		}
		function getValues(variable) {
			var values = [0, 0, 0, 0];
			var array = variable.value;
			var len = array.getL0();
			if(len > 4) len = 4;
			for(var i = 0; i < len; i ++) {
				values[i] = array.at(i)._value;
			}
			return values;
		}
	};
	
	defineSysVar('mousex', VarType.INT, 'new IntValue(this.currentScreen.mouseX)');
	defineSysVar('mousey', VarType.INT, 'new IntValue(this.currentScreen.mouseY)');
	defineInlineExprBuiltinFunc('mousew', [], VarType.INT, function(g, paramInfos) {
		return g.getRegisteredObjectExpr(mousew_internal)+'(this.currentScreen)';
	});
	
	var mousew_internal = function(screen) {
		var result = screen.mouseW;
		screen.mouseW = 0;
		return new IntValue(result);
	};
	
	(function() {
		var exprs = getExprs();
		var internalFunc = createInternalFunc();
		
		defineInlineExprBuiltinFunc('ginfo', [false], VarType.INT, function(g, paramInfos) {
			if(ommitable(paramInfos[0])) {
				return exprs[paramInfos[0].node.val._value]('this');
			} else {
				return g.getRegisteredObjectExpr(internalFunc)+'(this, '+g.getIntParamNativeValueExpr(paramInfos[0])+')';
			}
		});
		function ommitable(paramInfo) {
			if(!paramInfo) return false;
			var node = paramInfo.node;
			if(!node.isLiteralNode()) return false;
			var val = node.val;
			return val.getType() == VarType.INT && val._value in exprs;
		}
		function createInternalFunc() {
			var code = '';
			code += 'var IntValue = HSPonJS.IntValue;\n';
			code += 'var HSPError = HSPonJS.HSPError;\n';
			code += 'return function(e, n) {\n';
			code += 'switch(n) {\n';
			for(var i = 0; i <= 27; i ++) {
				if(i in exprs) {
					code += 'case '+i+':\n';
					code += '    return '+exprs[i]('e')+';\n';
				}
			}
			code += 'default:\n';
			code += '    throw new HSPError(ErrorCode.ILLEGAL_FUNCTION);\n';
			code += '}\n'
			code += '};';
			return new Function(code)();
		}
		function getExprs() {
			return {
			 3: function ginfo_sel(e)    { return 'new IntValue('+e+'.currentScreenId)'; },
			12: function ginfo_winx(e)   { return 'new IntValue('+e+'.currentScreen.width)'; },
			13: function ginfo_winy(e)   { return 'new IntValue('+e+'.currentScreen.height)'; },
			14: function ginfo_mesx(e)   { return 'new IntValue('+e+'.currentScreen.mesX)'; },
			15: function ginfo_mesy(e)   { return 'new IntValue('+e+'.currentScreen.mesY)'; },
			16: function ginfo_r(e)      { return 'new IntValue('+e+'.currentScreen.currentR)'; },
			17: function ginfo_g(e)      { return 'new IntValue('+e+'.currentScreen.currentG)'; },
			18: function ginfo_b(e)      { return 'new IntValue('+e+'.currentScreen.currentB)'; },
			19: function ginfo_paluse(e) { return 'IntValue.of(0)'; },
			20: function ginfo_dispx(e)  { return 'new IntValue(window.screen.width)'; },
			21: function ginfo_dispy(e)  { return 'new IntValue(window.screen.height)'; },
			22: function ginfo_cx(e)     { return 'new IntValue('+e+'.currentScreen.currentX)'; },
			23: function ginfo_cy(e)     { return 'new IntValue('+e+'.currentScreen.currentY)'; },
			26: function ginfo_sx(e)     { return 'new IntValue('+e+'.currentScreen.width)'; },
			27: function ginfo_sy(e)     { return 'new IntValue('+e+'.currentScreen.height)'; }
			};
		}
	})();
	
	defineInlineBuiltinFunc('logmes', [false], function(g, paramInfos) {
		g.push(g.getRegisteredObjectExpr(logmes_internal)+'('+g.getStrParamNativeValueExpr(paramInfos[0])+');');
	});
	
	var logmes_internal = function(text) {
		if(typeof console != 'undefined' && typeof console.log == 'function') {
			console.log(text);
		}
	};
}

})();

