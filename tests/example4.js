"use hopscript"

var rjs = require("hiphop");

var prg = <rjs.reactivemachine debug name="example4">
  <rjs.inputsignal name="A"/>
  <rjs.outputsignal name="T"/>
  <rjs.outputsignal name="V"/>
  <rjs.localsignal name="S">
    <rjs.loop>
      <rjs.abort signal_name="A">
	<rjs.sequence>
	  <rjs.emit signal_name="S"/>
	  <rjs.present signal_name="S">
	    <rjs.emit signal_name="T"/>
	  </rjs.present>
	  <rjs.pause/>
	  <rjs.emit signal_name="V"/>
	</rjs.sequence>
      </rjs.abort>
    </rjs.loop>
  </rjs.localsignal>
</rjs.ReactiveMachine>

exports.prg = prg;
