"use hopscript"

var hh = require("hiphop");

var prg =
    <hh.module>
      <hh.outputsignal name="O" valued/>
      <hh.loop>
	<hh.let>
	  <hh.signal name="S" value=1/>
	  <hh.emit signal="S" value=${function() {return this.preValue.S + 1}}/>
	  <hh.emit signal="O" value=${function() {return this.value.S}}/>
	</hh.let>
	<hh.pause/>
	<hh.emit signal="O" value=${function() {return this.preValue.O}}/>
	<hh.pause/>
      </hh.loop>
    </hh.module>

exports.prg = new hh.ReactiveMachine(prg, "emitvaluedlocal1");
