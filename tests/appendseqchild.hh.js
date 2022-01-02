"use hopscript";

const hh = require("hiphop");

function makePar(x, y) {
   return hiphop fork {
      host { x() }
   } par {
      host { y() }
   }
}

hiphop machine M() {
   "myseq" {
      loop {	      
        host { console.log("a") }
	yield;
        host { console.log("b") }
	yield;
        host { console.log("c") }
	yield;
      }
   }
}

M.react();

const seq = M.getElementById("myseq");

seq.appendChild(makePar(() => console.log("p1"), () => console.log("p2")));

M.react();
M.react();
