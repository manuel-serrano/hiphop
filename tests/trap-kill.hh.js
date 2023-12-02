"use @hop/hiphop";
"use hopscript"


import * as hh from "@hop/hiphop";

export const mach = new hh.ReactiveMachine(
   hiphop module() {
      T: fork {
	 async () {
	    setTimeout(this.notify.bind(this), 500);
	 }
	 break T;
      } par {
      	 async () {
	    setTimeout(this.notify.bind(this), 1000);
	 } kill {
	    mach.outbuf = ("been killed");
	 }
      }
   });

mach.outbuf = "";
mach.react();
