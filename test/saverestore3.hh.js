import * as hh from "@hop/hiphop";
import { format } from "util";

function bool_and(x, y) {
   return x && y
}

function bool_or(x, y) {
   return x || y
}

function plus(x, y) {
   return x + y
}

hiphop module prg() {
   inout SEQ=1 combine plus;
   inout STATE1=false combine bool_or;
   inout STATE2=false combine bool_and;
   inout S;
   inout TOOGLE;
		
   loop {
      emit SEQ(SEQ.preval + 1);
      emit STATE1(true);
      emit STATE1(false);
      emit STATE2(true);
      emit STATE2(false);
      if(S.pre) {
	 emit TOOGLE(true);
      } else {
	 emit TOOGLE(false);
	 emit S();
      }
      yield;
   }
}

export const mach = new hh.ReactiveMachine(prg, { name: "saverestore3", dynamic: true });

mach.outbuf = "";
mach.debug_emitted_func = val => {
   mach.outbuf += format(val) + "\n";
}

let state1 = mach.save();
let state2 = null;
let state3 = null;

mach.react()
state2 = mach.save();

mach.react()
state3 = mach.save();

mach.react()

mach.restore(state1);
mach.react()
mach.react()

mach.restore(state1);
mach.react()
mach.react()

mach.restore(state2);
mach.react()
mach.react()

mach.restore(state3);
mach.react()
mach.react()

mach.restore(state1);
mach.react()
