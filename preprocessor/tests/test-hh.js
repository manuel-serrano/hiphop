const Parser = require('../parser');
const Lexer = require('../lexer');

console.log((new Parser.Parser(new Lexer.Lexer(`

function makeAbro() {
   return MODULE abro {
      IN a, b, r;
      OUT o;
      LOOPEACH(NOW(r)) {
	 FORK {
	    AWAIT(NOW(a));
	 } PAR {
	    AWAIT(NOW(b));
	 };
	 EMIT o;
      };
   }
}

let m = new hh.ReactiveMachine(makeAbro());
`))).generateAST()());

console.log((new Parser.Parser(new Lexer.Lexer(`
function fork() {
return  FORK {
	    AWAIT(NOW(a));
	 } PAR {
	    AWAIT(NOW(b));
	 };
}

function makeAbro() {
   return MODULE abro {
      IN a, b, r;
      OUT o;
      LOOPEACH(NOW(r)) {
	${"$"}{fork()};
	 EMIT o;
      };
   }
}

let m = new hh.ReactiveMachine(makeAbro());
`))).generateAST()());

console.log((new Parser.Parser(new Lexer.Lexer(`
const hh=require("hiphop");
let m = new hh.ReactiveMachine(
MODULE {
  OUT a, b;
  EMIT a(1);
  EXEC setTimeout(COMPLETEANDREACT, 5000);
  EMIT b(2);
}
);
hh.batch(m);
`))).generateAST()());


console.log((new Parser.Parser(new Lexer.Lexer(`
const hh=require("hiphop");

function start(completeAndReact) {
setTimeout(function() {completeAndReact(4)}, 2000)
}

function onkill() {
console.log('killed');
}

let m = new hh.ReactiveMachine(
MODULE {
  OUT a, b;
  EMIT a(1);
  EXECEMIT b start(COMPLETEANDREACT) ONKILL onKill();
}
);
hh.batch(m);
`))).generateAST()());

