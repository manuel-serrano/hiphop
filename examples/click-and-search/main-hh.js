const hh = require("hiphop");
module.exports = (searchWiki, translate) => new hh.ReactiveMachine(
   MODULE (IN word, OUT green, red, black, wiki, trans, err) {
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
   { sweep: false }
);
