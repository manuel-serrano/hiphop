"use hopscript"

export { mach } from "./valuepre1.hh.js";
import { mach as machine } from "./valuepre1.hh.js";
import { format } from "util";

machine.outbuf = "";
machine.debug_emitted_func = val => {
   machine.outbuf += format(val) + "\n";
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
