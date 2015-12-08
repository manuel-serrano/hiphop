"use hopscript"

var rjs = require("hiphop");

var prg = <rjs.reactivemachine debug name="example2">
  <rjs.outputsignal name="T"/>
  <rjs.outputsignal name="V"/>
  <rjs.localsignal signal_name="S">
    <rjs.loop>
      <rjs.sequence>
	<rjs.emit signal_name="S"/>
	<rjs.present signal_name="S">
	  <rjs.emit signal_name="T"/>
	</rjs.present>
	<rjs.pause/>
	<rjs.emit signal_name="V"/>
      </rjs.sequence>
    </rjs.loop>
  </rjs.localsignal>
</rjs.ReactiveMachine>

exports.prg = prg;
