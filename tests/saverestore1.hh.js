"use hopscript"

const machine = require( "./p18.js" ).prg;
let state = machine.save();

machine.debug_emitted_func = console.log

machine.react()

machine.restore(state);
machine.react()

machine.restore(state);
machine.react()

machine.restore(state);
machine.react()
