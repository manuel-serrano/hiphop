"use hopscript"

var hh = require("hiphop");

var prg = <hh.module>
  <hh.inputsignal name="I"/>
  <hh.outputsignal name="O"/>
  <hh.localsignal name="L">
    <hh.parallel>
      <hh.abort signal_name="L">
	<hh.loop>
	  <hh.emit signal_name="O"/>
	  <hh.pause/>
	</hh.loop>
      </hh.abort>
      <hh.sequence>
	<hh.await signal_name="I"/>
	<hh.emit signal_name="L"/>
      </hh.sequence>
    </hh.parallel>
  </hh.localsignal>
</hh.module>;

exports.prg = new hh.ReactiveMachine(prg, "abortpar");
