"use hopscript"

var hh = require("hiphop");

var prg = MODULE( IN A, IN B, OUT O ) {
   FORK {
      AWAIT NOW( A );
   } PAR {
      AWAIT NOW( B );
   }
   EMIT O;
}

exports.prg = new hh.ReactiveMachine(prg, "awaitpar");
