"use hopscript"

var rjs = require("hiphop");

var prg = <rjs.ReactiveMachine debug name="prepure">
  <rjs.outputsignal name="O1"/>
  <rjs.outputsignal name="O2"/>
  <rjs.loop>
    <rjs.localsignal signal_name="S">
      <rjs.sequence>
	<rjs.present test_pre signal_name="S">
	  <rjs.emit signal_name="O1"/>
	  <rjs.emit signal_name="O2"/>
	</rjs.present>
	<rjs.pause/>
	<rjs.emit signal_name="S"/>
      </rjs.sequence>
    </rjs.localsignal>
  </rjs.loop>
</rjs.ReactiveMachine>;

exports.prg = prg;
