"use hopscript"

var rjs = require("hiphop");

var prg = <rjs.reactivemachine debug name="ABRO">
  <rjs.inputsignal name=R />
  <rjs.inputsignal name=A />
  <rjs.inputsignal name=B />
  <rjs.outputsignal name=O />
  <rjs.loop>
    <rjs.abort signal_name="R">
      <rjs.sequence>
        <rjs.parallel>
          <rjs.await signal_name="A" />
          <rjs.await signal_name="B" />
        </rjs.parallel>
        <rjs.emit signal_name="O" />
	<rjs.halt/>
      </rjs.sequence>
    </rjs.abort>
  </rjs.loop>
</rjs.reactivemachine>;

exports.prg = prg;
