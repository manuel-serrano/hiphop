"use strict"

const hh = require("hiphop");

const func = function() {
   console.log("atom works!");
}

const prg = <hh.module>
  <hh.loop>
    <hh.sequence>
      <hh.pause/>
      <hh.atom apply=${func}/>
    </hh.sequence>
  </hh.loop>
</hh.module>;

exports.prg = new hh.ReactiveMachine(prg, "atom");
