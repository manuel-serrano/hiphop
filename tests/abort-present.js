"use hopscript"

var hh = require("hiphop");

var prg = <hh.module>
  <hh.inputsignal name="I"/>
  <hh.outputsignal name="J"/>
  <hh.outputsignal name="K"/>
  <hh.outputsignal name="V"/>
  <hh.loop>
    <hh.sequence>
      <hh.abort signal="I">
	<hh.sequence>
	  <hh.emit signal="J"/>
	  <hh.pause/>
	  <hh.emit signal="V"/>
	  <hh.pause/>
	</hh.sequence>
      </hh.abort>
      <hh.present signal="I">
	<hh.emit signal="K"/>
      </hh.present>
    </hh.sequence>
  </hh.loop>
</hh.module>

exports.prg = new hh.ReactiveMachine(prg, "abortpresent");
