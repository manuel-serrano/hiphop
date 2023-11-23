"use hopscript"

export { mach } from "./toggle.hh.js";
import { mach as machine } from "./toggle.hh.js";
machine = toogle.prg;
machine.outbuf = "";
machine.debug_emitted_func = val => {
   machine.outbuf += (val.toString() ? "[ '" + val + "' ]\n" : "[]\n");
}

let state1 = machine.save();
let state2 = null;
let state3 = null;

machine.react()
state2 = machine.save();

machine.react()
state3 = machine.save();

machine.react()

machine.restore(state1);
machine.react()
machine.react()

machine.restore(state1);
machine.react()
machine.react()

machine.restore(state2);
machine.react()
machine.react()

machine.restore(state3);
machine.react()
machine.react()

machine.restore(state1);
machine.react()
