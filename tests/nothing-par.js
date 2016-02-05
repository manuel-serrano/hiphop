"use hopscript"

var hh = require("hiphop");

var prg = <hh.module>
  <hh.parallel>
    <hh.sequence>
      <hh.nothing/>
      <hh.pause/>
    </hh.sequence>
    <hh.nothing/>
  </hh.parallel>
</hh.module>;

exports.prg = new hh.ReactiveMachine(prg, "nothingpar");
