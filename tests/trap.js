"use hopscript"

var rjs = require("hiphop");

var prg = <rjs.reactivemachine debug name="trapsimple">
  <rjs.outputsignal name="A"/>
  <rjs.outputsignal name="B"/>
  <rjs.outputsignal name="C"/>
  <rjs.sequence>
    <rjs.emit signal_name="A"/>
    <rjs.trap trap_name="T">
      <rjs.sequence>
	<rjs.exit trap_name="T"/>
	<rjs.emit signal_name="B"/>
      </rjs.sequence>
    </rjs.trap>
    <rjs.emit signal_name="C"/>
  </rjs.sequence>
</rjs.reactivemachine>;

exports.prg = prg;
