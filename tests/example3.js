"use hopscript"

var rjs = require("hiphop");

var prg = <rjs.reactivemachine debug name="example3">
  <rjs.inputsignal name="A"/>
  <rjs.outputsignal name="T"/>
  <rjs.outputsignal name="V"/>
  <rjs.abort signal_name="A">
    <rjs.localsignal signal_name="S">
      <rjs.loop>
	<rjs.sequence>
	  <rjs.emit signal_name="S"/>
	  <rjs.present signal_name="S">
	    <rjs.emit signal_name="T"/>
	  </rjs.present>
	  <rjs.pause/>
	  <rjs.emit signal_name="V"/>
	</rjs.sequence>
      </rjs.loop>
    </rjs.localsignal>
  </rjs.abort>
</rjs.ReactiveMachine>

exports.prg = prg;
