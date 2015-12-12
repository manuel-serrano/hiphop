"use hopscript"

var rjs = require("hiphop");

var prg = <rjs.reactivemachine debug name="abortpar">
  <rjs.inputsignal name="I"/>
  <rjs.outputsignal name="O"/>
  <rjs.localsignal signal_name="L">
    <rjs.parallel>
      <rjs.abort signal_name="L">
	<rjs.loop>
	  <rjs.emit signal_name="O"/>
	  <rjs.pause/>
	</rjs.loop>
      </rjs.abort>
      <rjs.sequence>
	<rjs.await signal_name="I"/>
	<rjs.emit signal_name="L"/>
      </rjs.sequence>
    </rjs.parallel>
  </rjs.localsignal>
</rjs.reactivemachine>;

exports.prg = prg;
