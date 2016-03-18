"use hopscript"

const machine = require("./p18.js").prg;
let state = machine.save();

console.log(machine.react());

machine.restore(state);
console.log(machine.react());

machine.restore(state);
console.log(machine.react());

machine.restore(state);
console.log(machine.react());
