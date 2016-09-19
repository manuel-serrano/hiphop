"use hopscript"

var hh = require("hiphop");

var prg = <hh.module J>
  <hh.let I>
    <hh.Parallel>
      <hh.if I>
	<hh.emit J apply=${function() {return this.value.I}} />
      </hh.if>
      <hh.emit I value=${5} />
    </hh.Parallel>
  </hh.let>
</hh.module>;

exports.prg = new hh.ReactiveMachine(prg, "parvalued");
