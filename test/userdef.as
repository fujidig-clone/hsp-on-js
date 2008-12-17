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
#deffunc _write_sep_next_assert int lineno
	mes "##NEXT ASSERT:"+_test_tag@+":"+lineno
	return
#global

#define ctype is(%1,%2) \
 __a = %1 : __b = %2 : \
 _write_sep_next_assert __LINE__: \
 if _test_eq(__a, __b) { \
  mes "pass" \
 } else { \
  mes "fail" : \
  mes _test_inspect(__b)+" expected but was "+_test_inspect(__a)+{" (%1)."} : \
  end \
 } \
 __a = 0 : __b = 0

#define ctype ok(%1=1) \
 __a = %1 : \
 _write_sep_next_assert __LINE__ : \
 if __a { \
  mes "pass" \
 } else { \
  mes "fail" : \
  mes "expression: "+{"%1"} : \
  end \
 }

#define flunk \
 _write_sep_next_assert __LINE__ : \
  mes "fail" : \
  mes "flunked" : \
  end

#define assert_error(%1) \
 __a = %1 : \
 _write_sep_next_assert __LINE__ : \
 mes "error: "+__a

_test_tag = "TAG"
repeat 8 : _test_tag += "_" + gettime(cnt) : loop
mes "##START TEST:"+_test_tag
onerror *test_onerror_
if 0 {
*test_onerror_
	mes "##ERROR OCCURRED:"+_test_tag+":"+wparam+":"+lparam
	end
}
