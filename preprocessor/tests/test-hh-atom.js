const Parser = require('../parser');
const Lexer = require('../lexer');

console.log((new Parser.Parser(new Lexer.Lexer(`
const hh=require("hiphop");


let m = new hh.ReactiveMachine(
MODULE {
  IN i;
  OUT a, b;
  EMIT a(1);
  LOOPEACH(VAL(i) + 1 == 5) {
    LET v1 = 4, v2 = 5;
    ATOM {
      v1=3;
      console.log(v1, v2);
    };
    EMIT b(v1 + v2);
  };
}
);
hh.batch(m);
`))).generateAST()());

