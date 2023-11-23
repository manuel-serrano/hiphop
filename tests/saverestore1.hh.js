"use hopscript"

export { mach } from "./p18.hh.js";
import { mach as machine } from "./p18.hh.js";

let state = machine.save();
machine.outbuf = "";
machine.debug_emitted_func = val => {
   machine.outbuf += (val.toString() ? "[ '" + val + "' ]\n" : "[]\n");
}

machine.react()

machine.restore(state);
machine.react()

machine.restore(state);
machine.react()

machine.restore(state);
machine.react()
