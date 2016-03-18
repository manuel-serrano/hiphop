"use hopscript"

const machine = require("./toogle.js").prg;

let state1 = machine.save();
let state2 = null;
let state3 = null;

console.log(machine.react());
state2 = machine.save();

console.log(machine.react());
state3 = machine.save();

console.log(machine.react());

machine.restore(state1);
console.log(machine.react());
console.log(machine.react());

machine.restore(state1);
console.log(machine.react());
console.log(machine.react());

machine.restore(state2);
console.log(machine.react());
console.log(machine.react());

machine.restore(state3);
console.log(machine.react());
console.log(machine.react());

machine.restore(state1);
console.log(machine.react());
