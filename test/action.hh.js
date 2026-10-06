import * as hh from "@hop/hiphop";

let reactLogBuffer = [];

function reactLog(msg) {
   reactLogBuffer.push(msg);
}

function getReactLog() {
   const log = reactLogBuffer.sort().join("");
   reactLogBuffer = [];
   return log;
}
   
const prg = hiphop module() {
   in x, reset;
   out y;
   signal x1, x2, y1, y2;

   every (reset.now) {
      fork {
	 if (x.now) {
	    emit x1();
	 } else {
	    if (y2.now) {
	       emit x1();
	    }
	 }
      } par {
	 if (x1.now) {
	    reactLog("A: hello\n");
	    emit y1();
	 }
      } par {
	 if (x.now) {
	    if (y1.now) {
	       emit x2();
	    }
	 } else {
	    emit x2();
	 }
      } par {
	 if (x2.now) {
	    reactLog("B: goodbye\n");
	    emit y2();
	 }
      } par {
	 if (x.now) {
	    if (y2.now) {
	       emit y("y2");
	    }
	 } else {
	    if (y1.now) {
	       emit y("y1");
	    }
	 }
      }
   }
   pragma { console.log("DONE"); }
}

export const mach = new hh.ReactiveMachine(prg, { sweep: true });
mach.outbuf = "";

mach.addEventListener("y", v => mach.outbuf += ("got y " + v.nowval + "\n" ));


mach.react(); mach.outbuf += getReactLog();
mach.react({reset: 1}); mach.outbuf += getReactLog();
mach.react({x: 1}); mach.outbuf += getReactLog();
mach.react({reset: 1}); mach.outbuf += getReactLog();
mach.react(); mach.outbuf += getReactLog();

if (process.env.HIPHOP_TEST) {
   console.log(mach.name() + "...");
   console.log(mach.outbuf);
}
