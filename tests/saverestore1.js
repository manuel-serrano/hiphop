"use hopscript"

import p18 from "./p18.js";
const machine = p18.prg;
let state = machine.save();

machine.debug_emitted_func = console.log

machine.react()

machine.restore(state);
machine.react()

machine.restore(state);
machine.react()

machine.restore(state);
machine.react()
