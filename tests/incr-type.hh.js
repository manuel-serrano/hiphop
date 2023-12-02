"use @hop/hiphop";
"use hopscript";

import * as hh from "@hop/hiphop";
import { format } from "util";

function WatchTimeType(h, m, s, ampm) {
   this.hours = h;
   this.minutes = m;
   this.seconds = s;
   this.ampm = ampm;
}


const WatchTime = new WatchTimeType(0, 0, 0, false);

function IncrementTimeInPlace(t) {
   let hours = t.hours;
   let minutes = t.minutes;
   let seconds = t.seconds;

   mach.outbuf += ("foo " + `{ hours: ${t.hours}, minutes: ${t.minutes}, seconds: ${t.seconds}, ampm: ${t.ampm} }` + "\n");
   if(t.seconds == 3) {
      seconds = 0;
      if(t.minutes == 3) {
	 minutes = 0;
	 if(t.hours == 3) {
	    hours = 0;
	 } else {
	    hours++;
	 }
      } else {
	 minutes++;
      }
   } else {
      seconds++;
   }
   return new WatchTimeType(hours, minutes, seconds, t.ampm);
}

function print_time(evt) {
   mach.outbuf += (evt.nowval.hours
      + ":" + evt.nowval.minutes
      + ":" + evt.nowval.seconds + "\n");
}


hiphop module prg() {
   in I; out Time=WatchTime;
   loop {
      emit Time(IncrementTimeInPlace(Time.preval));
      yield;
   }
}

const m = new hh.ReactiveMachine(prg, "Foo");

m.addEventListener("Time", print_time);
m.outbuf = "";

export const mach = m;
