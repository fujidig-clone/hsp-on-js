function VCRandom() {
	this.x = 1;
}

VCRandom.prototype = {
	srand: function(s) {
		this.x = s|0;
	},
	rand: function rand() {
		this.x = (this.x*214013|0)+2531011|0;
		return (this.x >> 16) & 32767;
	}
};

if(typeof HSPonJS != 'undefined') {
	HSPonJS.VCRandom = VCRandom;
}


