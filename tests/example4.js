"use hopscript"

var hh = require("hiphop");

var prg = <hh.module>
  <hh.inputsignal name="A"/>
  <hh.outputsignal name="T"/>
  <hh.outputsignal name="V"/>
  <hh.let>
    <hh.signal name="S"/>
    <hh.loop>
      <hh.abort signal="A">
	<hh.sequence>
	  <hh.emit signal="S"/>
	  <hh.present signal="S">
	    <hh.emit signal="T"/>
	  </hh.present>
	  <hh.pause/>
	  <hh.emit signal="V"/>
	</hh.sequence>
      </hh.abort>
    </hh.loop>
  </hh.let>
</hh.module>

exports.prg = new hh.ReactiveMachine(prg, "example4");
