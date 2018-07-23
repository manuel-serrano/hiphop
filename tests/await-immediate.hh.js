"use hopscript"

var hh = require("hiphop");

var prg = MODULE( IN I, OUT O ) {
   LOOP {
      AWAIT IMMEDIATE NOW( I );
      EMIT O;
      PAUSE;
   }
}

exports.prg = new hh.ReactiveMachine(prg, "awaitimmediate");
