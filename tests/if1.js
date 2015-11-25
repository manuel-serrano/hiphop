"use hopscript"

var rjs = require("reactive-js");

var prg = <rjs.reactivemachine debug name="if1">
  <rjs.inputsignal name="I1" />
  <rjs.outputsignal name="O1" />
  <rjs.inputsignal name="I2" type="number" />
  <rjs.outputsignal name="O2" />
  <rjs.loop>
    <rjs.sequence>
      <rjs.if exprs=${rjs.present("I1")}>
	<rjs.emit signal_name="O1"/>
      </rjs.if>
      <rjs.if func=${x => x > 2} exprs=${rjs.value("I2")}>
	<rjs.emit signal_name="O2"/>
      </rjs.if>
      <rjs.pause/>
    </rjs.sequence>
  </rjs.loop>
</rjs.reactivemachine>;

exports.prg = prg;
