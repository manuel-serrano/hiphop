"use hopscript"

var hh = require("hiphop");

var prg = <hh.module>
  <hh.inputsignal name="I"/>
  <hh.outputsignal name="J"/>
  <hh.outputsignal name="K"/>
  <hh.outputsignal name="V"/>
  <hh.loop>
    <hh.sequence>
      <hh.abort signal_name="I">
	<hh.sequence>
	  <hh.emit signal_name="J"/>
	  <hh.pause/>
	  <hh.emit signal_name="V"/>
	  <hh.pause/>
	</hh.sequence>
      </hh.abort>
      <hh.present signal_name="I">
	<hh.emit signal_name="K"/>
      </hh.present>
    </hh.sequence>
  </hh.loop>
</hh.module>

exports.prg = new hh.ReactiveMachine(prg, "abortpresent");
