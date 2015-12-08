"use hopscript"

var rjs = require("hiphop");

var prg = <rjs.reactivemachine debug name="abortpresent">
  <rjs.inputsignal name="I"/>
  <rjs.outputsignal name="J"/>
  <rjs.outputsignal name="K"/>
  <rjs.outputsignal name="V"/>
  <rjs.loop>
    <rjs.sequence>
      <rjs.abort signal_name="I">
	<rjs.sequence>
	  <rjs.emit signal_name="J"/>
	  <rjs.pause/>
	  <rjs.emit signal_name="V"/>
	  <rjs.pause/>
	</rjs.sequence>
      </rjs.abort>
      <rjs.present signal_name="I">
	<rjs.emit signal_name="K"/>
      </rjs.present>
    </rjs.sequence>
  </rjs.loop>
</rjs.reactivemachine>

exports.prg = prg;
