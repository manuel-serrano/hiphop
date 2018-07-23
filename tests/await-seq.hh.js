"use hopscript"

var hh = require("hiphop");

var prg = MODULE( IN A, IN B, OUT O ) {
   AWAIT NOW( A );
   AWAIT NOW( B );
   EMIT O;
}

exports.prg = new hh.ReactiveMachine(prg, "awaitseq");
