(function(){
	assertTitle('BinaryParser.readChar');
	assert(BinaryParser.readChar('\x00') == 0);
	assert(BinaryParser.readChar('\xff') == -1);
	assert(BinaryParser.readChar('\x12') == 0x12);
	assert(BinaryParser.readChar('\x12\x34') == 0x12);
	assert(BinaryParser.readChar('\xab') == 0xab-0x100);
	
	assertTitle('BinaryParser.readUChar');
	assert(BinaryParser.readUChar('\x00') == 0);
	assert(BinaryParser.readUChar('\xff') == 0xff);
	assert(BinaryParser.readUChar('\x12') == 0x12);
	assert(BinaryParser.readUChar('\x12\x34') == 0x12);
	assert(BinaryParser.readUChar('\xab') == 0xab);
	
	assertTitle('BinaryParser.readShort');
	assert(BinaryParser.readShort('\x00\x00') == 0);
	assert(BinaryParser.readShort('\xff\xff') == -1);
	assert(BinaryParser.readShort('\x12\x34') == 0x3412);
	assert(BinaryParser.readShort('\x12\x34\x56') == 0x3412);
	assert(BinaryParser.readShort('\xab\xcd') == 0xcdab-0x10000);
	
	assertTitle('BinaryParser.readUShort');
	assert(BinaryParser.readUShort('\x00\x00') == 0);
	assert(BinaryParser.readUShort('\xff\xff') == 0xffff);
	assert(BinaryParser.readUShort('\x12\x34') == 0x3412);
	assert(BinaryParser.readUShort('\x12\x34\x56') == 0x3412);
	assert(BinaryParser.readUShort('\xab\xcd') == 0xcdab);
	
	assertTitle('BinaryParser.readInt24');
	assert(BinaryParser.readInt24('\x00\x00\x00') == 0);
	assert(BinaryParser.readInt24('\xff\xff\xff') == -1);
	assert(BinaryParser.readInt24('\x12\x34\x56') == 0x563412);
	assert(BinaryParser.readInt24('\x12\x34\x56\x78') == 0x563412);
	assert(BinaryParser.readInt24('\xab\xcd\xef') == 0xefcdab-0x1000000);
	
	assertTitle('BinaryParser.readUInt24');
	assert(BinaryParser.readUInt24('\x00\x00\x00') == 0);
	assert(BinaryParser.readUInt24('\xff\xff\xff') == 0xffffff);
	assert(BinaryParser.readUInt24('\x12\x34\x56') == 0x563412);
	assert(BinaryParser.readUInt24('\x12\x34\x56\x78') == 0x563412);
	assert(BinaryParser.readUInt24('\xab\xcd\xef') == 0xefcdab);
	
	assertTitle('BinaryParser.readInt');
	assert(BinaryParser.readInt('\x00\x00\x00\x00') == 0);
	assert(BinaryParser.readInt('\xff\xff\xff\xff') == -1);
	assert(BinaryParser.readInt('\x12\x34\x56\x78') == 0x78563412);
	assert(BinaryParser.readInt('\x12\x34\x56\x78\x90') == 0x78563412);
	assert(BinaryParser.readInt('\xab\xcd\xef\xab') == 0xabefcdab-0x100000000);
	
	assertTitle('BinaryParser.readUInt');
	assert(BinaryParser.readUInt('\x00\x00\x00\x00') == 0);
	assert(BinaryParser.readUInt('\xff\xff\xff\xff') == 0xffffffff);
	assert(BinaryParser.readUInt('\x12\x34\x56\x78') == 0x78563412);
	assert(BinaryParser.readUInt('\x12\x34\x56\x78\x90') == 0x78563412);
	assert(BinaryParser.readUInt('\xab\xcd\xef\xab') == 0xabefcdab);
	
	assertTitle('BinaryParser.readDouble');
	assert(BinaryParser.readDouble('\x00\x00\x00\x00\x00\x00\x00\x00') == 0.0);
	assert(BinaryParser.readDouble('\x00\x00\x00\x00\x00\x00\xf0\x3f') == 1.0);
	assert(BinaryParser.readDouble('\x00\x00\x00\x00\x00\x00\xf0\xbf') == -1.0);
	assert(BinaryParser.readDouble('\x00\x00\x00\x00\x00\x00\xf0\x7f') == +Infinity);
	assert(BinaryParser.readDouble('\x00\x00\x00\x00\x00\x00\xf0\xff') == -Infinity);
	assert(isNaN(BinaryParser.readDouble('\x00\x00\x00\x00\x00\x00\xf8\x7f')));
	assert(BinaryParser.readDouble('\x18\x2d\x44\x54\xfb\x21\x09\x40') == Math.PI);
	
	assertTitle('index parameter');
	assert(BinaryParser.readUChar('\x00\x11\x22\x33', 0) == 0x00);
	assert(BinaryParser.readUChar('\x00\x11\x22\x33', 1) == 0x11);
	assert(BinaryParser.readUChar('\x00\x11\x22\x33', 2) == 0x22);
	assert(BinaryParser.readUChar('\x00\x11\x22\x33', 3) == 0x33);
	
	assertTitle('missing bytes error');
	assert(catchError(BinaryParser.CheckBufferError,
	                  function(){BinaryParser.readUChar('')}));
	assert(catchError(BinaryParser.CheckBufferError,
	                  function(){BinaryParser.readUShort('\x00')}));
	assert(catchError(BinaryParser.CheckBufferError,
	                  function(){BinaryParser.readUInt24('\x00\x00')}));
	assert(catchError(BinaryParser.CheckBufferError,
	                  function(){BinaryParser.readUInt('\x00\x00\x00')}));
	assert(catchError(BinaryParser.CheckBufferError,
	                  function(){BinaryParser.readDouble('\x00\x00\x00\x00\x00\x00\x00')}));
	
	assertTitle('missing bytes error with index');
	assert(catchError(BinaryParser.CheckBufferError,
	                  function(){BinaryParser.readUChar('\x00',1)}));
	assert(catchError(BinaryParser.CheckBufferError,
	                  function(){BinaryParser.readUShort('\x00\x00',1)}));
	assert(catchError(BinaryParser.CheckBufferError,
	                  function(){BinaryParser.readUInt24('\x00\x00\x00',1)}));
	assert(catchError(BinaryParser.CheckBufferError,
	                  function(){BinaryParser.readUInt('\x00\x00\x00\x00',1)}));
	assert(catchError(BinaryParser.CheckBufferError,
	                  function(){BinaryParser.readDouble('\x00\x00\x00\x00\x00\x00\x00\x00',1)}));
	
	assertTitle('read many times');
	var buf = '';
	buf += '\x01';
	buf += '\x02\x03';
	buf += '\x04\x05\x06';
	buf += '\x07\x08\x09\x0a';
	buf += '\x18\x2d\x44\x54\xfb\x21\x09\x40';
	
	var parser = new BinaryParser(buf);
	assert(parser.readUChar() == 0x01);
	assert(parser.readUShort() == 0x0302);
	assert(parser.readUInt24() == 0x060504);
	assert(parser.readUInt() == 0x0a090807);
	assert(parser.readDouble() == Math.PI);
	assert(catchError(BinaryParser.CheckBufferError,
	                  function(){parser.readUChar()}));
	
	assertTitle('read many times 2');
	var buf = '';
	buf += '\xaa';
	buf += '\xff\xff\xff\xff\xff\xff\xef\x7f';
	buf += '\x01\x00\x00\x00\x00\x00\x00\x00';
	buf += '\xbb';
	var parser = new BinaryParser(buf);
	assert(parser.readUChar() == 0xaa);
	assert(parser.readDouble() == Number.MAX_VALUE);
	assert(parser.readDouble() == Number.MIN_VALUE);
	assert(parser.readUChar() == 0xbb);
	assert(catchError(BinaryParser.CheckBufferError,
	                  function(){parser.readUChar()}));
	
	assertTitle('missing bytes error with length');
	assert(catchError(BinaryParser.CheckBufferError,
	                  function(){new BinaryParser('\x00', 0, 0).readUChar()}));
	assert(catchError(BinaryParser.CheckBufferError,
	                  function(){new BinaryParser('\x00\x00', 0, 1).readUShort()}));
	assert(catchError(BinaryParser.CheckBufferError,
	                  function(){new BinaryParser('\x00\x00\x00', 0, 2).readUInt24()}));
	assert(catchError(BinaryParser.CheckBufferError,
	                  function(){new BinaryParser('\x00\x00\x00\x00', 0, 3).readUInt()}));
	assert(catchError(BinaryParser.CheckBufferError,
	                  function(){new BinaryParser('\x00\x00\x00\x00\x00\x00\x00\x00', 0, 7).readDouble()}));
	
	assertTitle('missing bytes error with length 2');
	var parser = new BinaryParser('\x00\x11\x22\x33\x44\x55', 2, 3);
	assert(parser.readUChar() == 0x22);
	assert(parser.readUChar() == 0x33);
	assert(parser.readUChar() == 0x44);
	assert(catchError(BinaryParser.CheckBufferError,
	                  function(){parser.readUChar()}));
	
	var msg = 'all test passed ('+assert.count+')';
	if(typeof window == 'undefined') {
		print(msg);
	} else if(typeof console != 'undefined' && typeof console.log == 'function') {
		console.log(msg);
	} else {
		alert(msg);
	}
	
	function catchError(error_constructor, callback) {
		var catched = false;
		try {
			callback();
		} catch(e) {
			if(!(e instanceof error_constructor)) throw e;
			catched = true;
		}
		return catched;
	}
	function assert(cond) {
		assert.count || (assert.count = 0);
		assert.countInSection || (assert.countInSection = 0);
		assert.count ++, assert.countInSection ++;
		if(!cond) throw 'assertion failed '+assert.title+'#'+assert.countInSection;
	}
	function assertTitle(title) {
		assert.title = title;
		assert.countInSection = 0;
	}
})();
