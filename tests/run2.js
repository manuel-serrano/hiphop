"use hopscript"

var rjs = require("hiphop");

var m1 = <rjs.reactivemachine debug name="m1">
  <rjs.inputsignal name="T"/>
  <rjs.inputsignal name="W"/>
  <rjs.outputsignal name="V"/>
  <rjs.outputsignal name="Z"/>
  <rjs.parallel>
    <rjs.present signal_name="T">
      <rjs.localsignal signal_name="L">
	<rjs.sequence>
	  <rjs.emit signal_name="L"/>
	  <rjs.emit signal_name="V"/>
	</rjs.sequence>
      </rjs.localsignal>
    </rjs.present>
    <rjs.present signal_name="W">
      <rjs.emit signal_name="Z"/>
    </rjs.present>
  </rjs.parallel>
</rjs.reactivemachine>;

var m2 = <rjs.reactivemachine debug name="run22">
  <rjs.inputsignal name="S"/>
  <rjs.inputsignal name="U"/>
  <rjs.outputsignal name="A"/>
  <rjs.outputsignal name="B"/>
  <rjs.sequence>
    <rjs.localsignal signal_name="L">
      <rjs.emit signal_name="L"/>
    </rjs.localsignal>
    <rjs.run machine=${m1} sigs_assoc=${{"T":"S",
					 "W":"U",
					 "V":"A",
					 "Z":"B"}}/>
    <rjs.run machine=${m1} sigs_assoc=${{"T":"S",
					 "W":"U",
					 "V":"A",
					 "Z":"B"}}/>
  </rjs.sequence>
</rjs.reactivemachine>;

exports.prg = m2;
