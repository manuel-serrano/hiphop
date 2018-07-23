"use hopscript"

var hh = require("hiphop");

var prg = MODULE( IN I, OUT O ) {
   LOOP {
      AWAIT COUNT( 3, PRE( I ) );
      EMIT O;
   }
}

exports.prg = new hh.ReactiveMachine(prg, "await3");
