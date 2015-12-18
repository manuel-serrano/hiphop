"use hopscript"

var rjs = require("hiphop");

var prg = <rjs.reactivemachine debug name="P17">
  <rjs.outputsignal name="O"/>
  <rjs.loop>
    <rjs.localsignal name="S1">
      <rjs.sequence>
	<rjs.present signal_name="S1">
	  <rjs.emit signal_name="O"/>
	</rjs.present>
	<rjs.pause/>
	<rjs.emit signal_name="S1"/>
      </rjs.sequence>
    </rjs.localsignal>
  </rjs.loop>
</rjs.reactivemachine>;

exports.prg = prg;
