const Parser = require('../parser');
const Lexer = require('../lexer');

console.log((new Parser.Parser(new Lexer.Lexer(`
const hh=require("hiphop");

function TimeoutMod(ms) {
return MODULE {
  LET id;
  ATOM{console.log('start timeout', ms)};
  EXEC id=setTimeout(COMPLETEANDREACT, ms)
    ONKILL clearTimeout(id)
    ONSUSP clearTimeout(id)
    ONRES id=setTimeout(COMPLETEANDREACT, ms);
  ATOM{console.log('end timeout')};
}
}

let m = new hh.ReactiveMachine(
MODULE Timer {
   IN duration (0) , reset ;
   OUT elapsed ;
   LOOPEACH ( NOW ( reset )) {
      EMIT elapsed (0);
      LOOP {
ATOM{console.log(VAL(elapsed), VAL(duration))};
	 IF ( VAL ( elapsed ) < VAL ( duration )) {
	    RUN ( TimeoutMod (100));
	    EMIT elapsed ( Number ( PREVAL ( elapsed ) + 0.1));
	 } ELSE {
	    PAUSE ;
	 };
      };
   };
}
);
hh.batch(m);`))).generateAST()());
