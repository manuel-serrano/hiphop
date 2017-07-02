"use hopscript"
let hh = require("hiphop");
let inSig = {accessibility: hh.IN};
let outSig = {accessibility: hh.OUT};
let prg = <hh.module V_S_p=${inSig}><hh.trap T1><hh.suspend V_S_p><hh.exit T1/></hh.suspend></hh.trap></hh.module>;
let machine = new hh.ReactiveMachine(prg, "TEST");
machine.debug_emitted_func = console.log;
machine.react();
machine.react();
