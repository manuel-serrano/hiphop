import * as hh from "@hop/hiphop";

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
	    pragma { mach.outbuf += ("hello\n"); }
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
	    pragma { mach.outbuf += ("goodbye\n"); }
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

export const mach = new hh.ReactiveMachine(prg, { name: "ACTION" });
mach.outbuf = "";

mach.addEventListener("y", v => mach.outbuf += ("got y " + v.nowval + "\n" ));


mach.react();
mach.react({reset: 1});
mach.react({x: 1});
mach.react({reset: 1});
mach.react();

