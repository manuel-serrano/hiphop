"use hopscript"

var rjs = require("hiphop");

var machine = <rjs.reactivemachine debug name="parallel">
  <rjs.outputsignal name="J"/>
  <rjs.localsignal name="I">
    <rjs.parallel>
      <rjs.emit signal_name="I"/>
      <rjs.sequence>
	<rjs.await signal_name="I"/>
	<rjs.emit signal_name="J"/>
      </rjs.sequence>
    </rjs.parallel>
  </rjs.localsignal>
</rjs.reactivemachine>;

exports.prg = machine;
