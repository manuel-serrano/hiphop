"use hopscript"

var rjs = require("reactive-js");

var m1 = <rjs.reactivemachine debug name="m1">
  <rjs.inputsignal name=T />
  <rjs.inputsignal name=W />
  <rjs.outputsignal name=V />
  <rjs.outputsignal name=Z />
  <rjs.parallel>
    <rjs.present signal_name="T">
      <rjs.emit signal_name="V"/>
    </rjs.present>
    <rjs.present signal_name="W">
      <rjs.emit signal_name="Z"/>
    </rjs.present>
  </rjs.parallel>
</rjs.reactivemachine>;

var run2 = <rjs.reactivemachine debug name="run2">
  <rjs.inputsignal name=S />
  <rjs.inputsignal name=U />
  <rjs.outputsignal name=A />
  <rjs.outputsignal name=B />
  <rjs.run machine=${m1} sigs_assoc=${{"T":"S",
				       "W":"U",
				       "V":"A",
				       "Z":"B"}}/>
</rjs.reactivemachine>;

exports.prg = run2;
