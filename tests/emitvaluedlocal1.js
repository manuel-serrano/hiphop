"use hopscript"

var hh = require("hiphop");

var prg =
    <hh.module O>
      <hh.loop>
	<hh.let S=${{initValue: 1}}>
	  <hh.emit S apply=${function() {return this.preValue.S + 1}}/>
	  <hh.emit O apply=${function() {return this.value.S}}/>
	</hh.let>
	<hh.pause/>
	<hh.emit O apply=${function() {return this.preValue.O}}/>
	<hh.pause/>
      </hh.loop>
    </hh.module>

exports.prg = new hh.ReactiveMachine(prg, "emitvaluedlocal1");
