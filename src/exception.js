var ErrorCode = {
	NONE:                       0,
	UNKNOWN_CODE:               1,
	SYNTAX:                     2,
	ILLEGAL_FUNCTION:           3,
	WRONG_EXPRESSION:           4,
	NO_DEFAULT:                 5,
	TYPE_MISMATCH:              6,
	ARRAY_OVERFLOW:             7,
	LABEL_REQUIRED:             8,
	TOO_MANY_NEST:              9,
	RETURN_WITHOUT_GOSUB:      10,
	LOOP_WITHOUT_REPEAT:       11,
	FILE_IO:                   12,
	PICTURE_MISSING:           13,
	EXTERNAL_EXECUTE:          14,
	PRIORITY:                  15,
	TOO_MANY_PARAMETERS:       16,
	TEMP_BUFFER_OVERFLOW:      17,
	WRONG_NAME:                18,
	DIVIDED_BY_ZERO:           19,
	BUFFER_OVERFLOW:           20,
	UNSUPPORTED_FUNCTION:      21,
	EXPRESSION_COMPLEX:        22,
	VARIABLE_REQUIRED:         23,
	INTEGER_REQUIRED:          24,
	BAD_ARRAY_EXPRESSION:      25,
	OUT_OF_MEMORY:             26,
	TYPE_INITALIZATION_FAILED: 27,
	NO_FUNCTION_PARAMETERS:    28,
	STACK_OVERFLOW:            29,
	INVALID_PARAMETER:         30,
	INVALID_ARRAYSTORE:        31,
	INVALID_FUNCPARAM:         32,
	WINDOW_OBJECT_FULL:        33,
	INVALID_ARRAY:             34,
	STRUCT_REQUIRED:           35,
	INVALID_STRUCT_SOURCE:     36,
	INVALID_TYPE:              37,
	DLL_ERROR:                 38,
	COMDLL_ERROR:              39,
	NORETVAL:                  40,
	FUNCTION_SYNTAX:           41,
	INTJUMP:                   42,
	EXITRUN:                   43,
	MAX:                       44,
	
	// 拡張エラー
	EXERROR_START:           1024,
	UNINITIALIZED_VARIABLE:  1025
};

var ErrorMessages = [
	"",												// 0
	"システムエラーが発生しました",					// 1
	"文法が間違っています",							// 2
	"パラメータの値が異常です",						// 3
	"計算式でエラーが発生しました",					// 4
	"パラメータの省略はできません",					// 5
	"パラメータの型が違います",						// 6
	"配列の要素が無効です",							// 7
	"有効なラベルが指定されていません",				// 8
	"サブルーチンやループのネストが深すぎます",		// 9
	"サブルーチン外のreturnは無効です",				// 10
	"repeat外でのloopは無効です",					// 11
	"ファイルが見つからないか無効な名前です",		// 12
	"画像ファイルがありません",						// 13
	"外部ファイル呼び出し中のエラーです",			// 14
	"計算式でカッコの記述が違います",				// 15
	"パラメータの数が多すぎます",					// 16
	"文字列式で扱える文字数を越えました",			// 17
	"代入できない変数名を指定しています",			// 18
	"0で除算しました",								// 19
	"バッファオーバーフローが発生しました",			// 20
	"サポートされない機能を選択しました",			// 21
	"計算式のカッコが深すぎます",					// 22
	"変数名が指定されていません",					// 23
	"整数以外が指定されています",					// 24
	"配列の要素書式が間違っています",				// 25
	"メモリの確保ができませんでした",				// 26
	"タイプの初期化に失敗しました",					// 27
	"関数に引数が設定されていません",				// 28
	"スタック領域のオーバーフローです",				// 29
	"無効な名前がパラメーターに指定されています",	// 30
	"異なる型を持つ配列変数に代入しました",			// 31
	"関数のパラメーター記述が不正です",				// 32
	"オブジェクト数が多すぎます",					// 33
	"配列・関数として使用できない型です",			// 34
	"モジュール変数が指定されていません",			// 35
	"モジュール変数の指定が無効です",				// 36
	"変数型の変換に失敗しました",					// 37
	"外部DLLの呼び出しに失敗しました",				// 38
	"外部オブジェクトの呼び出しに失敗しました",		// 39
	"関数の戻り値が設定されていません。",			// 40
	"関数を命令として記述しています。\n(HSP2から関数化された名前を使用している可能性があります)",			// 41
	"*"
];

var ExErrorMessages = [
	"",											// 1024
	"未初期化の変数を参照しました"				// 1025
];

function getErrorMessage(errorCode) {
	if(0 <= errorCode && errorCode < ErrorMessages.length) {
		return ErrorMessages[errorCode];
	}
	if(ErrorCode.EXERROR_START <= errorCode && errorCode < ErrorCode.EXERROR_START + ExErrorMessages.length) {
		return ExErrorMessages[errorCode - ErrorCode.EXERROR_START];
	}
	return undefined;
}

function HSPException() {}

function StopException() {}
StopException.prototype = new HSPException;

function EndException(status) {
	this.status = status;
}
EndException.prototype = new HSPException;

function WaitException(msec) {
	this.msec = msec;
}
WaitException.prototype = new HSPException;

function FileReadException(path, success, error) {
	this.path = path;
	this.success = success;
	this.error = error;
}
FileReadException.prototype = new HSPException;

function VoidException() {
}
VoidException.prototype = new HSPException;

function HSPError(errcode, message) {
	this.errcode = errcode;
	this.message = message;
}
HSPError.prototype = new HSPException;
HSPError.prototype.getErrorMessage = function /*getErrorMessage*/() {
	if(e.message != undefined) return this.message;
	return getErrorMessage(this.errcode);
};


if(typeof HSPonJS != 'undefined') {
	HSPonJS.ErrorCode = ErrorCode;
	HSPonJS.ErrorMessages = ErrorMessages;
	HSPonJS.HSPException = HSPException;
	HSPonJS.WaitException = WaitException;
	HSPonJS.StopException = StopException;
	HSPonJS.EndException = EndException;
	HSPonJS.FileReadException = FileReadException;
	HSPonJS.VoidException = VoidException;
	HSPonJS.HSPError = HSPError;
	HSPonJS.getErrorMessage = getErrorMessage;
}

