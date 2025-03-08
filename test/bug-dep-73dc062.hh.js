import * as hh from "@hop/hiphop";

function consoleLog(...args) {
   mach.outbuf += args.join("").toString() + "\n";
}

function foo(preval) {
   consoleLog("foo: __internal.preval=" + preval);
   return preval === -1;
}
hiphop module prg(resolve) {
   inout X = 1;
   T: {
      signal __internal = -1 combine (x, y) => x + y;

      loop {
         if (foo(__internal.preval)) {
	    pragma { consoleLog("EMIT __internal X=" + X.nowval); }
            emit __internal(X.nowval + 5);
         }
	 pragma { consoleLog("X=" + X.nowval, " __internal.nowval=" + __internal.nowval, " __internal.preval=" + __internal.preval); }
	 yield;
      }
   }
}

export const mach = new hh.ReactiveMachine(prg, {dumpNets: true});
mach.outbuf = "";

consoleLog("---------------", mach.age());
mach.react();
consoleLog("---------------", mach.age());

 
