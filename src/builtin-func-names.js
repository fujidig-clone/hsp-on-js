var BuiltinFuncNames = [];

BuiltinFuncNames[Token.Type.INTCMD] = {
	0x000: 'onexit',
	0x001: 'onerror',
	0x002: 'onkey',
	0x003: 'onclick',
	0x004: 'oncmd',
	0x011: 'exist',
	0x012: 'delete',
	0x013: 'mkdir',
	0x014: 'chdir',
	0x015: 'dirlist',
	0x016: 'bload',
	0x017: 'bsave',
	0x018: 'bcopy',
	0x019: 'memfile',
	0x01a: 'poke',
	0x01b: 'wpoke',
	0x01c: 'lpoke',
	0x01d: 'getstr',
	0x01e: 'chdpm',
	0x01f: 'memexpand',
	0x020: 'memcpy',
	0x021: 'memset',
	0x022: 'notesel',
	0x023: 'noteadd',
	0x024: 'notedel',
	0x025: 'noteload',
	0x026: 'notesave',
	0x027: 'randomize',
	0x028: 'noteunsel',
	0x029: 'noteget'
};

BuiltinFuncNames[Token.Type.EXTCMD] = {
	0x000: 'button',
	0x001: 'chgdisp',
	0x002: 'exec',
	0x003: 'dialog',
	0x008: 'mmload',
	0x009: 'mmplay',
	0x00a: 'mmstop',
	0x00b: 'mci',
	0x00c: 'pset',
	0x00d: 'pget',
	0x00e: 'syscolor',
	0x00f: 'mes',
	0x010: 'title',
	0x011: 'pos',
	0x012: 'circle',
	0x013: 'cls',
	0x014: 'font',
	0x015: 'sysfont',
	0x016: 'objsize',
	0x017: 'picload',
	0x018: 'color',
	0x019: 'palcolor',
	0x01a: 'palette',
	0x01b: 'redraw',
	0x01c: 'width',
	0x01d: 'gsel',
	0x01e: 'gcopy',
	0x01f: 'gzoom',
	0x020: 'gmode',
	0x021: 'bmpsave',
	0x022: 'hsvcolor',
	0x023: 'getkey',
	0x024: 'listbox',
	0x025: 'chkbox',
	0x026: 'combox',
	0x027: 'input',
	0x028: 'mesbox',
	0x029: 'buffer',
	0x02a: 'screen',
	0x02b: 'bgscr',
	0x02c: 'mouse',
	0x02d: 'objsel',
	0x02e: 'groll',
	0x02f: 'line',
	0x030: 'clrobj',
	0x031: 'boxf',
	0x032: 'objprm',
	0x033: 'objmode',
	0x034: 'stick',
	0x035: 'grect',
	0x036: 'grotate',
	0x037: 'gsquare'
};

BuiltinFuncNames[Token.Type.EXTSYSVAR] = {
	0x000: 'mousex',
	0x001: 'mousey',
	0x002: 'mousew',
	0x003: 'hwnd',
	0x004: 'hinstance',
	0x005: 'hdc',
	0x100: 'ginfo',
	0x101: 'objinfo',
	0x102: 'dirinfo',
	0x103: 'sysinfo'
};

BuiltinFuncNames[Token.Type.CMPCMD] = {
	0x000: 'if',
	0x001: 'else'
};

BuiltinFuncNames[Token.Type.INTFUNC] = {
	0x000: 'int',
	0x001: 'rnd',
	0x002: 'strlen',
	0x003: 'length',
	0x004: 'length2',
	0x005: 'length3',
	0x006: 'length4',
	0x007: 'vartype',
	0x008: 'gettime',
	0x009: 'peek',
	0x00a: 'wpeek',
	0x00b: 'lpeek',
	0x00c: 'varptr',
	0x00d: 'varuse',
	0x00e: 'noteinfo',
	0x00f: 'instr',
	0x010: 'abs',
	0x011: 'limit',
	0x100: 'str',
	0x101: 'strmid',
	0x103: 'strf',
	0x104: 'getpath',
	0x180: 'sin',
	0x181: 'cos',
	0x182: 'tan',
	0x183: 'atan',
	0x184: 'sqrt',
	0x185: 'double',
	0x186: 'absf',
	0x187: 'expf',
	0x188: 'logf',
	0x189: 'limitf'
};

BuiltinFuncNames[Token.Type.SYSVAR] = {
	0x000: 'system',
	0x001: 'hspstat',
	0x002: 'hspver',
	0x003: 'stat',
	0x004: 'cnt',
	0x005: 'err',
	0x006: 'strsize',
	0x007: 'looplev',
	0x008: 'sublev',
	0x009: 'iparam',
	0x00a: 'wparam',
	0x00b: 'lparam',
	0x00c: 'refstr',
	0x00d: 'refdval'
};

BuiltinFuncNames[Token.Type.PROGCMD] = {
	0x000: 'goto',
	0x001: 'gosub',
	0x002: 'return',
	0x003: 'break',
	0x004: 'repeat',
	0x005: 'loop',
	0x006: 'continue',
	0x007: 'wait',
	0x008: 'await',
	0x009: 'dim',
	0x00a: 'sdim',
	0x00b: 'foreach',
	0x00c: 'eachchk',
	0x00d: 'dimtype',
	0x00e: 'dup',
	0x00f: 'dupptr',
	0x010: 'end',
	0x011: 'stop',
	0x012: 'newmod',
	0x013: 'setmod',
	0x014: 'delmod',
	0x016: 'mref',
	0x017: 'run',
	0x018: 'exgoto',
	0x019: 'on',
	0x01a: 'mcall',
	0x01b: 'assert',
	0x01c: 'logmes'
};

BuiltinFuncNames[Token.Type.DLLCTRL] = {
	0x000: 'newcom',
	0x001: 'querycom',
	0x002: 'delcom',
	0x003: 'cnvstow',
	0x004: 'comres',
	0x005: 'axobj',
	0x006: 'winobj',
	0x007: 'sendmsg',
	0x008: 'comevent',
	0x009: 'comevarg',
	0x00a: 'sarrayconv',
	0x100: 'callfunc',
	0x101: 'cnvwtos',
	0x102: 'comevdisp',
	0x103: 'libptr'
};

var BuiltinFuncNameToIdTable = {};
(function() {
	for(var type in BuiltinFuncNames) {
		var t = BuiltinFuncNames[type];
		for(var subid in t) {
			BuiltinFuncNameToIdTable[t[subid]] = subid << 13 | type;
		}
	}
})();

function getTypeByTypeAndSubid(typeAndSubid) {
	return typeAndSubid & 0x1fff;
}

function getSubidByTypeAndSubid(typeAndSubid) {
	return typeAndSubid >> 13;
}


/*
a = gets nil; 0
b = a.scan(/^\t"\$([0-9a-f]+) (\d+) (\w+)",$/).group_by{|s,t,n|t.to_i}
typenames = gets(nil).scan(/^\t(\w+)/).flatten
c = Hash[*b.to_a.sort_by{|k,v|k}.flatten(1)]
c.values[1].reject!{|id,t,name|name=="print"}
c.map{|t,x| "Names[Token.Type.%s] = {\n%s\n};" % [typenames[t], x.map{|id,_,name|"\t0x#{id}: '#{name}'"}.join(",\n")]}.join("\n\n")c
*/

if(typeof HSPonJS != 'undefined') {
	HSPonJS.BuiltinFuncNames = BuiltinFuncNames;
	HSPonJS.BuiltinFuncNameToIdTable = BuiltinFuncNameToIdTable;
}

