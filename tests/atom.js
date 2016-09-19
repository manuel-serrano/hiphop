"use strict"

var hh = require("hiphop");

var func = function() {
   console.log("atom works!");
}

var prg = <hh.module>
  <hh.loop>
    <hh.sequence>
      <hh.pause/>
      <hh.atom apply=${func}/>
    </hh.sequence>
  </hh.loop>
</hh.module>;

exports.prg = new hh.ReactiveMachine(prg, "atom");
