import * as hh from "@hop/hiphop";
import { format } from "util";

hiphop module prg() {
   inout OK, O, A, B, C, BBBB, NEVER; in STOP; in AIN;
   abort (STOP.now) {
      loop {
	 JMP: {
	    emit O();
	    FOO: {
	       break JMP;
	       yield;
	       yield;
	    }
	 }
	 emit O();

	 if(O.now) emit OK();
	 yield;
	 emit O();
	 if(O.now) emit OK();
	 yield;

	 fork {
	    emit A();
	    yield;
	    emit C();
	 } par {
	    emit B();
	 } par {
	    emit BBBB();
	 }
      }
   }
   emit NEVER();
   yield;
   await (STOP.now);
   emit B();
   await (AIN.now);
   if (AIN.now) {
      emit C();
   }
}

hiphop module prg2() {
   inout O, V;
   loop {
      yield;
      yield;
      emit O();
      yield;
      emit O();

      if (O.now) {
	 emit V();
      }
   }
   emit O();
}

hiphop module prg3() {
   out O;
   {
      yield;
      emit O();
   }
   emit O();
}

hiphop module prg4() {
   out OK, O;
   emit O();
   if (O.now) {
      emit OK();
   }
}

hiphop module prg5() {
   out OK, O;
   if (O.now) {
      emit OK();
   }
}

export const mach = new hh.ReactiveMachine(prg, "FOO");
mach.outbuf = "";
mach.debug_emitted_func = val => {
   mach.outbuf += format(val) + "\n";
}

mach.outbuf += "will react" + "\n";
mach.react();
mach.outbuf += "will react" + "\n";
mach.react();
mach.outbuf += "will react" + "\n";
mach.react();
mach.outbuf += "will react" + "\n";
mach.react();
mach.outbuf += "will react" + "\n";
mach.react();
mach.outbuf += "will react" + "\n";
mach.react();
mach.outbuf += "will react" + "\n";
mach.react();
mach.outbuf += "will react STOP" + "\n";
mach.react({STOP: undefined});
mach.outbuf += "will react" + "\n";
mach.react();
mach.outbuf += "will react" + "\n";
mach.react();
mach.outbuf += "will react" + "\n";
mach.react();
mach.outbuf += "will react" + "\n";
mach.react();
mach.outbuf += "will react STOP" + "\n";
mach.react({STOP: undefined});
mach.outbuf += "will react" + "\n";
mach.react({AIN: undefined});
mach.outbuf += "will react" + "\n";
mach.react();

const m2 = new hh.ReactiveMachine(prg2, "2");
m2.debug_emitted_func = val => {
   mach.outbuf += format(val) + "\n";
}
mach.outbuf += "m2\n";
m2.react();
m2.react();
m2.react();
m2.react();
m2.react();

const m3 = new hh.ReactiveMachine(prg3, "3");
m3.debug_emitted_func = val => {
   mach.outbuf += format(val) + "\n";
}
mach.outbuf += "m3\n";
m3.react();
m3.react();
m3.react();
m3.react();
m3.react();

const m4 = new hh.ReactiveMachine(prg4, "4");
m4.debug_emitted_func = val => {
   mach.outbuf += format(val) + "\n";
}
mach.outbuf += "m4\n";
m4.react()
m4.react()
m4.react()
m4.react()
m4.react()

const m5 = new hh.ReactiveMachine(prg5, "5");
m5.debug_emitted_func = val => {
   mach.outbuf += format(val) + "\n";
}
mach.outbuf += "m5\n";
m5.react()
m5.react()
m5.react()
m5.react()
m5.react()
