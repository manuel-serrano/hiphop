"use hopscript"

var rjs = require("hiphop");

var prg = <rjs.reactivemachine debug name="SUSPEND">
  <rjs.inputsignal name="I"/>
  <rjs.outputsignal name="J"/>
  <rjs.outputsignal name="O"/>
  <rjs.sequence>
    <rjs.suspend signal_name="I">
      <rjs.loop>
	<rjs.sequence>
	  <rjs.emit signal_name="O"/>
	  <rjs.pause/>
	</rjs.sequence>
      </rjs.loop>
    </rjs.suspend>
    <rjs.emit signal_name="J"/>
  </rjs.sequence>
</rjs.reactivemachine>;

exports.prg = prg;
