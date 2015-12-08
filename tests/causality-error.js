"use hopscript"

var rjs = require("hiphop");

var example = <rjs.reactivemachine debug name="presentemit">
  <rjs.outputsignal name=I />
  <rjs.outputsignal name=O />
  <rjs.loop>
    <rjs.sequence>
      <rjs.present signal_name="O">
	<rjs.emit signal_name="I"/>
      </rjs.present>
      <rjs.emit signal_name="O"/>
      <rjs.pause/>
    </rjs.sequence>
  </rjs.loop>
</rjs.reactivemachine>;

exports.prg = example;
