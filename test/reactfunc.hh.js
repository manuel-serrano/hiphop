import * as hh from "@hop/hiphop";

function foo(evt) {
   m.outbuf += ("hi from foo signal " + evt.signame + " is set!\n");
}

function bar(evt) {
   m.outbuf += ("hi from bar signal " + evt.signame + " is set!\n");
}

function foo2(evt) {
   m.outbuf += ("hi from foo2 signal " + evt.signame + " is set with " + evt.nowval + " !\n");
}

function bar2(evt) {
   m.outbuf += ("hi from bar2 signal " + evt.signame + " is set with " + evt.nowval + " !\n");
}

hiphop module prg() {
   in I1; in I2; out O1, O11, O2;
   loop {
      if (I1.now) {
	 emit O1();
	 emit O11();
      }
      if (I2.now) {
	 emit O2(I2.nowval);
      }
      yield;
   }
}

const m = new hh.ReactiveMachine(prg, "reactfunc");
m.outbuf = "";

m.addEventListener("O1", foo);
m.addEventListener("O11", foo);
m.addEventListener("O11", bar);
m.addEventListener("O2", foo2)
m.addEventListener("O2", bar2);

export const mach = m;
