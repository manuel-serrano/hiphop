"use hopscript"

var rjs = require("hiphop");

var prg = <rjs.reactivemachine debug name="trapnested2">
  <rjs.outputsignal name="A"/>
  <rjs.outputsignal name="B"/>
  <rjs.outputsignal name="C"/>
  <rjs.outputsignal name="D"/>
  <rjs.sequence>
    <rjs.emit signal_name="A"/>
    <rjs.trap trap_name="U">
      <rjs.sequence>
	<rjs.trap trap_name="T">
	  <rjs.sequence>
	    <rjs.exit trap_name="U"/>
	    <rjs.emit signal_name="B"/>
	  </rjs.sequence>
	</rjs.trap>
	<rjs.emit signal_name="C"/>
      </rjs.sequence>
    </rjs.trap>
    <rjs.emit signal_name="D"/>
  </rjs.sequence>
</rjs.reactivemachine>;

exports.prg = prg;
