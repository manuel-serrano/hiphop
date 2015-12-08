"use hopscript"

var rjs = require("hiphop");

var prg = <rjs.reactivemachine debug name="trappar">
  <rjs.outputsignal name="A"/>
  <rjs.outputsignal name="B"/>
  <rjs.outputsignal name="C"/>
  <rjs.trap trap_name="T">
    <rjs.parallel>
      <rjs.sequence>
	<rjs.emit signal_name="A"/>
	<rjs.exit trap_name="T"/>
      </rjs.sequence>
      <rjs.sequence>
	<rjs.emit signal_name="B"/>
	<rjs.pause/>
	<rjs.emit signal_name="C"/>
      </rjs.sequence>
    </rjs.parallel>
  </rjs.trap>
</rjs.reactivemachine>;

exports.prg = prg
