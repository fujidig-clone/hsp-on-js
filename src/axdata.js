function AXData(data) {
	this.data = data;
	var p = new BinaryParser(data, 0, 96);
	this.h1          = p.readChar();
	this.h2          = p.readChar();
	this.h3          = p.readChar();
	this.h4          = p.readChar();
	if(this.h1 != 0x48 || this.h2 != 0x53 || this.h3 != 0x50 || this.h4 != 0x33) {
		throw new Error('invalid hsp object data');
	}
	this.version     = p.readInt();
	this.max_val     = p.readInt();
	this.allsize     = p.readInt();
	this.pt_cs       = p.readInt();
	this.max_cs      = p.readInt();
	this.pt_ds       = p.readInt();
	this.max_ds      = p.readInt();
	this.pt_ot       = p.readInt();
	this.max_ot      = p.readInt();
	this.pt_dinfo    = p.readInt();
	this.max_dinfo   = p.readInt();
	this.pt_linfo    = p.readInt();
	this.max_linfo   = p.readInt();
	this.pt_finfo    = p.readInt();
	this.max_finfo   = p.readInt();
	this.pt_minfo    = p.readInt();
	this.max_minfo   = p.readInt();
	this.pt_finfo2   = p.readInt();
	this.max_finfo2  = p.readInt();
	this.pt_hpidat   = p.readInt();
	this.max_hpi     = p.readShort();
	this.max_varhpi  = p.readShort();
	this.bootoption  = p.readInt();
	this.runtime     = p.readInt();
	this.cs = data.substr(this.pt_cs, this.max_cs);
	this.ds = data.substr(this.pt_ds, this.max_ds);
	this.ot = data.substr(this.pt_ot, this.max_ot);
	this.dinfo = data.substr(this.pt_dinfo, this.max_dinfo);
	this.linfo = data.substr(this.pt_linfo, this.max_linfo);
	this.finfo = data.substr(this.pt_finfo, this.max_finfo);
	this.minfo = data.substr(this.pt_minfo, this.max_minfo);
	this.finfo2 = data.substr(this.pt_finfo2, this.max_finfo2);
	this.hpidat = data.substr(this.pt_hpidat, this.max_hpi);
	this.tokens = this.createTokens();
	this.variableNames = this.createVariableNames();
	this.funcsInfo = this.createFuncsInfo();
	this.prmsInfo = this.createPrmsInfo();
	
	p = new BinaryParser(this.ot);
	this.labels = [];
	this.labelsMap = {}; // key: position in cs, val: array of label ids
	
	var i = 0;
	while(!p.isEOS()) {
		var pos = p.readInt();
		if(pos in this.labelsMap) {
			this.labelsMap[pos].push(i);
		} else {
			this.labelsMap[pos] = [i];
		}
		this.labels.push(pos);
		i ++;
		
	}
}

AXData.prototype = {
	createTokens: function createTokens() {
		var tokens = [];
		var cs = new BinaryParser(this.cs);
		var dinfo = new BinaryParser(this.dinfo);
		var pos = 0;
		var fileName, lineNo, lineSize = 0;
		while(!cs.isEOS()) {
			
			var c = cs.readUShort();
			var type = c & 0x1fff;
			var ex1 = (c & 0x2000) != 0;
			var ex2 = (c & 0x4000) != 0;
			var code;
			if(c & 0x8000) {
				code = cs.readInt();
			} else {
				code = cs.readUShort();
			}
			var skipOffset = undefined;
			if(type == Token.Type.CMPCMD) {
				skipOffset = cs.readUShort();
			}
			var size = cs.offset / 2 - pos;
			while(true) {
				var dinfoPos = dinfo.offset;
				var ofs = dinfo.readUChar();
				if(ofs == 255) {
					dinfo.offset = dinfoPos;
					break;
				}
				if(ofs == 254) {
					var dsOffset = dinfo.readUInt24();
					if(dsOffset != 0 || fileName == undefined) {
						fileName = this.getDSStr(dsOffset);
					}
					lineNo = dinfo.readUShort();
					continue;
				}
				if(ofs == 253) {
					dinfo.readUInt24();
					dinfo.readUShort();
					continue;
				}
				if(ofs == 252) {
					ofs = dinfo.readUShort();
				}
				if(lineSize < ofs) {
					dinfo.offset = dinfoPos;
					break;
				}
				lineSize = 0;
				lineNo ++;
			}
			lineSize += size;
			tokens.push(new Token(this, type, ex1, ex2, code,
			                      fileName, lineNo, pos, size, skipOffset));
			pos += size;
		}
		return tokens;
	},
	createVariableNames: function createVariableNames() {
		var variableNames = new Array(this.max_val);
		var dinfo = new BinaryParser(this.dinfo);
		var i = 0;
		while(true) {
			var ofs = dinfo.readUChar();
			if(ofs == 255) break;
			if(ofs == 254) {
				dinfo.readUInt24();
				dinfo.readUShort();
			}
			if(ofs == 253) {
				variableNames[i++] = this.getDSStr(dinfo.readUInt24());
				dinfo.readUShort();
			}
			if(ofs == 252) {
				ofs = dinfo.readUShort();
			}
		}
		return variableNames;
	},
	createFuncsInfo: function createFuncsInfo() {
		var funcsInfo = [];
		var finfo = new BinaryParser(this.finfo);
		while(!finfo.isEOS()) {
			var index = finfo.readShort();
			var subid = finfo.readShort();
			var prmindex = finfo.readInt();
			var prmmax = finfo.readInt();
			var nameidx = finfo.readInt();
			var size = finfo.readInt();
			var otindex = finfo.readInt();
			var funcflag = finfo.readInt();
			var name = this.getDSStr(nameidx);
			funcsInfo.push({index: index,
			                subid: subid,
			                prmindex: prmindex,
			                prmmax: prmmax,
			                nameidx: nameidx,
			                size: size,
			                otindex: otindex,
			                funcflag: funcflag,
			                name: name});
		}
		return funcsInfo;
	},
	createPrmsInfo: function createPrmsInfo() {
		var prmsInfo = [];
		var minfo = new BinaryParser(this.minfo);
		while(!minfo.isEOS()) {
			var mptype = minfo.readShort();
			var subid = minfo.readShort();
			var offset = minfo.readInt();
			prmsInfo.push({mptype: mptype,
			               subid: subid,
			               offset: offset});
		}
		return prmsInfo;
	},
	getDSStr: function getDSStr(index) {
		return Utils.getCStr(this.ds, index);
	},
	getDSDouble: function getDSDouble(index) {
		return BinaryParser.readDouble(this.ds, index);
	}
};

function Token(objectData, type, ex1, ex2, code,
                           fileName, lineNo, pos, size, skipOffset) {
	this.type = type;
	this.ex1 = ex1;
	this.ex2 = ex2;
	this.code = this.val = code;
	this.fileName = fileName;
	this.lineNo = lineNo;
	this.pos = pos;
	this.size = size;
	this.skipOffset = skipOffset;
	if(type == Token.Type.STRING) {
		this.val = objectData.getDSStr(code);
	} else if(type == Token.Type.DNUM) {
		this.val = objectData.getDSDouble(code);
	}
}

Token.Type = {
	MARK:       0,
	VAR:        1,
	STRING:     2,
	DNUM:       3,
	INUM:       4,
	STRUCT:     5,
	XLABEL:     6,
	LABEL:      7,
	INTCMD:     8,
	EXTCMD:     9,
	EXTSYSVAR: 10,
	CMPCMD:    11,
	MODCMD:    12,
	INTFUNC:   13,
	SYSVAR:    14,
	PROGCMD:   15,
	DLLFUNC:   16,
	DLLCTRL:   17,
	USERDEF:   18
};

var MPType = {
	NONE:          0,
	VAR:           1,
	STRING:        2,
	DNUM:          3,
	INUM:          4,
	STRUCT:        5,
	LABEL:         7,
	LOCALVAR:     -1,
	ARRAYVAR:     -2,
	SINGLEVAR:    -3,
	FLOAT:        -4,
	STRUCTTAG:    -5,
	LOCALSTRING:  -6,
	MODULEVAR:    -7,
	PPVAL:        -8,
	PBMSCR:       -9,
	PVARPTR:     -10,
	IMODULEVAR:  -11,
	IOBJECTVAR:  -12,
	LOCALWSTR:   -13,
	FLEXSPTR:    -14,
	FLEXWPTR:    -15,
	PTR_REFSTR:  -16,
	PTR_EXINFO:  -17,
	PTR_DPMINFO: -18,
	NULLPTR:     -19,
	TMODULEVAR:  -20
};

if(typeof HSPonJS != 'undefined') {
	HSPonJS.AXData = AXData;
	HSPonJS.Token = Token;
	HSPonJS.MPType = MPType;
}

