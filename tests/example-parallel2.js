"use hopscript"

var hh = require("hiphop");

var prg = <hh.module J>
  <hh.local I>
    <hh.Parallel>
      <hh.if I>
	<hh.emit J/>
      </hh.if>
      <hh.emit I/>
    </hh.Parallel>
  </hh.local>
</hh.module>;

exports.prg = new hh.ReactiveMachine(prg, "parallel2");
