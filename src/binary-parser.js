//original:
//+ Jonas Raoni Soares Silva
//@ http://jsfromhell.com/classes/binary-parser [rev. #1]
//modified by: fujidig 2008

function BinaryParser(data, index, length) {
	if(index == undefined) index = 0;
	if(length == undefined) length = data.length;
	if(index + length > data.length) length = data.length - index;
	if(index >= data.length) length = 0;
	var b = this.buffer = new Array(length);
	for(var i = 0; i < length; i ++)
		b[length - i - 1] = data.charCodeAt(index + i);
	this.offset = 0;
}

(function() {
	var p = BinaryParser;
	p.CheckBufferError = function CheckBufferError(message) { this.message = message; };
	p.CheckBufferError.prototype = new Error;
	p.CheckBufferError.prototype.name = 'BinaryParser.CheckBufferError';
	
	p.prototype = {
		readChar: function readChar() {
			this.checkBuffer(this.offset + 1);
			var result = this.buffer[this.buffer.length - this.offset - 1];
			if(result & 0x80) result -= 0x100;
			++ this.offset;
			return result;
		},
		readUChar: function readUChar() {
			this.checkBuffer(this.offset + 1);
			var result = this.buffer[this.buffer.length - this.offset - 1];
			++ this.offset;
			return result;
		},
		readShort: function readShort() {
			this.checkBuffer(this.offset + 2);
			var result = this.buffer[this.buffer.length - this.offset - 1];
			result |= this.buffer[this.buffer.length - this.offset - 2] << 8;
			if(result & 0x8000) result -= 0x10000;
			this.offset += 2;
			return result;
		},
		readUShort: function readUShort() {
			this.checkBuffer(this.offset + 2);
			var result = this.buffer[this.buffer.length - this.offset - 1];
			result |= this.buffer[this.buffer.length - this.offset - 2] << 8;
			this.offset += 2;
			return result;
		},
		readInt24: function readInt24() {
			this.checkBuffer(this.offset + 3);
			var result = this.buffer[this.buffer.length - this.offset - 1];
			result |= this.buffer[this.buffer.length - this.offset - 2] << 8;
			result |= this.buffer[this.buffer.length - this.offset - 3] << 16;
			if(result & 0x800000) result -= 0x1000000;
			this.offset += 3;
			return result;
		},
		readUInt24: function readUInt24() {
			this.checkBuffer(this.offset + 3);
			var result = this.buffer[this.buffer.length - this.offset - 1];
			result |= this.buffer[this.buffer.length - this.offset - 2] << 8;
			result |= this.buffer[this.buffer.length - this.offset - 3] << 16;
			this.offset += 3;
			return result;
		},
		readInt: function readInt() {
			this.checkBuffer(this.offset + 4);
			var result = this.buffer[this.buffer.length - this.offset - 1];
			result |= this.buffer[this.buffer.length - this.offset - 2] << 8;
			result |= this.buffer[this.buffer.length - this.offset - 3] << 16;
			result |= this.buffer[this.buffer.length - this.offset - 4] << 24;
			this.offset += 4;
			return result;
		},
		readUInt: function readUInt() {
			this.checkBuffer(this.offset + 4);
			var result = this.buffer[this.buffer.length - this.offset - 1];
			result |= this.buffer[this.buffer.length - this.offset - 2] << 8;
			result |= this.buffer[this.buffer.length - this.offset - 3] << 16;
			result += this.buffer[this.buffer.length - this.offset - 4] * 0x1000000;
			this.offset += 4;
			return result;
		},
		readDouble: function readDouble() {
			return this.decodeFloat(52, 11, 8);
		},

		isEOS: function isEOS() {
			return this.buffer.length <= this.offset;
		},
		decodeFloat: function decodeFloat(precisionBits, exponentBits, bytes) {
			this.checkBuffer(this.offset + bytes);
			var bias = Math.pow(2, exponentBits - 1) - 1, signal = this.readBits(this.offset * 8 + precisionBits + exponentBits, 1),
				exponent = this.readBits(this.offset * 8 + precisionBits, exponentBits), significand = 0,
				divisor = 2, curByte = this.buffer.length + (-precisionBits>>3) - this.offset - 1,
				byteValue, startBit, mask;
			this.offset += bytes;
			do
				for(byteValue = this.buffer[ ++curByte ], startBit = precisionBits % 8 || 8, mask = 1 << startBit;
					mask >>= 1; (byteValue & mask) && (significand += 1 / divisor), divisor *= 2);
			while((precisionBits -= startBit));
			return exponent == (bias << 1) + 1 ? significand ? NaN : signal ? -Infinity : +Infinity
				: (1 + signal * -2) * (exponent || significand ? !exponent ? Math.pow(2, -bias + 1) * significand
				: Math.pow(2, exponent - bias) * (1 + significand) : 0);
		},
		readBits: function readBits(start, length) {
			//shl fix: Henri Torgemane ~1996 (compressed by Jonas Raoni)
			function shl(a, b) {
				while(b--)a = ((a %= 0x7fffffff + 1) & 0x40000000) == 0x40000000 ? a * 2 : (a - 0x40000000) * 2 + 0x7fffffff + 1;
				return a;
			}
			if(start < 0 || length <= 0)
				return 0;
			this.checkBuffer(-(-(start + length) >> 3));
			for(var offsetLeft, offsetRight = start % 8, curByte = this.buffer.length - (start >> 3) - 1,
				lastByte = this.buffer.length + (-(start + length) >> 3), diff = curByte - lastByte,
				sum = ((this.buffer[ curByte ] >> offsetRight) & ((1 << (diff ? 8 - offsetRight : length)) - 1))
				+ (diff && (offsetLeft = (start + length) % 8) ? (this.buffer[ lastByte++ ] & ((1 << offsetLeft) - 1))
				<< (diff-- << 3) - offsetRight : 0); diff; sum += shl(this.buffer[ lastByte++ ], (diff-- << 3) - offsetRight)
			);
			return sum;
		},
		hasNeededBytes: function hasNeededBytes(neededBytes) {
			return this.buffer.length >= neededBytes;
		},
		checkBuffer: function checkBuffer(neededBytes) {
			if(!this.hasNeededBytes(neededBytes))
				throw new p.CheckBufferError("checkBuffer::missing bytes");
		}
	};
	
	p.readChar = function readChar(data, index) {
		return new p(data, index, 1).readChar();
	};
	p.readUChar = function readUChar(data, index) {
		return new p(data, index, 1).readUChar();
	};
	p.readShort = function readShort(data, index) {
		return new p(data, index, 2).readShort();
	};
	p.readUShort = function readUShort(data, index) {
		return new p(data, index, 2).readUShort();
	};
	p.readInt24 = function readInt24(data, index) {
		return new p(data, index, 3).readInt24();
	};
	p.readUInt24 = function readUInt24(data, index) {
		return new p(data, index, 3).readUInt24();
	};
	p.readInt = function readInt(data, index) {
		return new p(data, index, 4).readInt();
	};
	p.readUInt = function readUInt(data, index) {
		return new p(data, index, 4).readUInt();
	};
	p.readDouble = function readDouble(data, index) {
		return new p(data, index, 8).readDouble();
	};
})();

if(typeof HSPonJS != 'undefined') {
	HSPonJS.BinaryParser = BinaryParser;
}

