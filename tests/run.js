"use hopscript"

var hh = require("hiphop");

var m1 = <hh.module>
  <hh.inputsignal name=T />
  <hh.inputsignal name=W />
  <hh.outputsignal name=V />
  <hh.outputsignal name=Z />
  <hh.parallel>
    <hh.present signal_name="T">
      <hh.emit signal_name="V"/>
    </hh.present>
    <hh.present signal_name="W">
      <hh.emit signal_name="Z"/>
    </hh.present>
  </hh.parallel>
</hh.module>;

var run2 = <hh.module>
  <hh.inputsignal name=S />
  <hh.inputsignal name=U />
  <hh.outputsignal name=A />
  <hh.outputsignal name=B />
  <hh.run module=${m1} sigs_assoc=${{"T":"S",
				     "W":"U",
				     "V":"A",
				     "Z":"B"}}/>
</hh.module>;

exports.prg = new hh.ReactiveMachine(run2, "run2");
