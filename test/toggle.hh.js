import * as hh from "@hop/hiphop";

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
   inout TOGGLE;
		
   loop {
      emit SEQ(SEQ.preval + 1);
      emit STATE1(true);
      emit STATE1(false);
      emit STATE2(true);
      emit STATE2(false);
      if (S.pre) {
	 emit TOGGLE(true);
      } else {
	 emit TOGGLE(false);
	 emit S();
      }
      yield;
   }
}

export const mach = new hh.ReactiveMachine(prg, "toggle");
