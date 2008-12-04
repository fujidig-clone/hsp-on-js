#module
#defcfunc _test_eq var a, var b
	if vartype(a) != vartype(b) : return 0
	return a == b
#defcfunc _test_inspect var v
	t = vartype(v)
	if t == 2 {
		result = "\""
		l = strlen(v)
		repeat l
			c = peek(v, cnt)
			if ((0x81 <= c & c <= 0x9f) | (0xe0 <= c & c <= 0xfc)) & cnt < l - 1 {
				c2 = peek(v, cnt + 1)
				if (0x40 <= c2 & c2 <= 0x7e) | (0x80 <= c2 & c2 <= 0xfc) {
					result += strmid(v, cnt, 2)
					continue cnt + 2
				}
			}
			if c == '\t' {
				result += "\\t"
			} else : if c == $0a {
				result += "\\n"
			} else : if c == $0d {
				result += "\\r"
			} else : if c == '"' {
				result += "\\\""
			} else : if c == '\\' {
				result += "\\\\"
			} else : if (0x20 <= c & c <= 0x7e) | (0xa1 <= c & c <= 0xdf) {
				result += strmid(v, cnt, 1)
			} else {
				result += strf("\\x%02x", c)
			}
		loop
		return result + "\""
	}
	if t == 3 | t == 4 {
		return str(v)
	}
	if t == 1 : return "<a label: "+varuse(v)+">"
	if t == 5 : return "<a struct: "+varuse(v)+">"
	return "<unknown value: "+t+">"
#deffunc _write_sep_next_assert
	mes "##NEXT ASSERT:"+_test_tag@
	return
#global

#define ctype is(%1,%2) \
 __a = %1 : __b = %2 : __c = vartype(__a) : __d = vartype(__b) : \
 _write_sep_next_assert : \
 if _test_eq(__a, __b) { \
  mes "pass" \
 } else { \
  mes "fail(line:"+__LINE__+")" : \
  mes _test_inspect(__b)+" expected but was "+_test_inspect(__a)+{" (%1)."} : \
  end \
 } \
 __a = 0 : __b = 0

#define ctype ok(%1=1) \
 __a = %1 : \
 _write_sep_next_assert : \
 if __a { \
  mes "pass" \
 } else { \
  mes "fail(line:"+__LINE__+")" : \
  mes "expression: "+{"%1"} \
  end \
 }

#define ctype assert_error(%1) \
 __a = %1 : \
 _write_sep_next_assert : \
 mes "error: "+(__a)+":"+__LINE__

_test_tag = "TAG"
repeat 8 : _test_tag += "_" + gettime(cnt) : loop
randomize
repeat 4 : _test_tag += strf("_%03x", rnd($1000)) : loop
randomize 1 ; revert to first status
mes "##START TEST:"+_test_tag
onerror *test_onerror_
if 0 {
*test_onerror_
	mes "##ERROR OCCURRED:"+_test_tag+":"+wparam+":"+lparam
	end
}
