import * as hh from "@hop/hiphop";

const sigs = [ "O", "P" ];

hiphop module prg() {
   out ... ${sigs} combine (x, y) => x + y;
   loop {
      fork "par" {
	 emit O(1);
	 emit P(1);
      }
      yield;
      yield;
   }
}

function add_emit(machine) {
   machine.getElementById("par").appendChild(hiphop { emit O(1); emit P(1); });
}

export const mach = new hh.ReactiveMachine(prg, { name: "incr-branch", sweep: false });
mach.outbuf = "";
mach.debug_emitted_func = val => {
   mach.outbuf += (val.toString() ? "[ '" + val + "' ]\n" : "[]\n");
}

mach.react()
mach.react()
mach.react()
mach.react()
add_emit(mach);
mach.react()
mach.react()
mach.react()
add_emit(mach);
add_emit(mach);
add_emit(mach);
mach.react()
mach.react()
