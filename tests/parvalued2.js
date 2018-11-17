"use hopscript"

var hh = require("hiphop");

var prg = <hh.module J>
  <hh.local I>
    <hh.Parallel>
      <hh.emit I value=${5} />
      <hh.if I>
	<hh.emit J apply=${function() {return this.I.nowval}} />
      </hh.if>
    </hh.Parallel>
  </hh.local>
</hh.module>;

exports.prg = new hh.ReactiveMachine(prg, "parvalued2");
