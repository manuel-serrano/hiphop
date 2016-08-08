"use hopscript"

var hh = require("hiphop");

var prg =
    <hh.module>
      <hh.inputsignal name="I1" />
      <hh.outputsignal name="O1" />
      <hh.inputsignal name="I2" valued />
      <hh.outputsignal name="O2" />
      <hh.loop>
	<hh.if value=${function() {return this.present.I1}}>
	  <hh.emit signal="O1"/>
	</hh.if>
	<hh.if value=${function() {return this.value.I2 > 2}}>
	  <hh.emit signal="O2"/>
	</hh.if>
	<hh.pause/>
      </hh.loop>
    </hh.module>

exports.prg = new hh.ReactiveMachine(prg, "if1");
