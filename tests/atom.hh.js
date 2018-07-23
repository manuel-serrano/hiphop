"use strict"

var hh = require("hiphop");

var func = function() {
   console.log("atom works!");
}

var prg = MODULE() {
   LOOP {
      PAUSE;
      ATOM { func() };
   }
}

exports.prg = new hh.ReactiveMachine(prg, "atom");
