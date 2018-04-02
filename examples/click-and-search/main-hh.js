const hh = require("hiphop");

module.exports = function(searchWiki, translate) {
   return new hh.ReactiveMachine(
      MODULE (IN word, OUT green, OUT red, OUT black, OUT wiki, OUT trans, OUT err) {
	 EVERY IMMEDIATE(NOW(word)) {
	    EMIT black(PREVAL(word));
	    EMIT red(VAL(word));
	    FORK {
	       PROMISE wiki, err searchWiki(VAL(word));
	    } PAR {
	       PROMISE trans, err translate(VAL(word));
	    }
	    EMIT green(VAL(word));
	 }
      },
      { debuggerName: 'debug', sweep: false }
   );
}
