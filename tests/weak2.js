"use hopscript"

var hh = require("hiphop");

var m =
    <hh.reactivemachine debug name="wabort2">
      <hh.inputsignal name="S"/>
      <hh.outputsignal name="O"/>
      <hh.outputsignal name="F"/>
      <hh.outputsignal name="W"/>
      <hh.outputsignal name="Z"/>
      <hh.abort weak signal_name="S">
	<hh.loop>
	  <hh.emit signal_name="O"/>
	  <hh.pause/>
	  <hh.emit signal_name="W"/>
	  <hh.pause/>
	  <hh.emit signal_name="Z"/>
	</hh.loop>
      </hh.abort>
      <hh.emit signal_name="F"/>
    </hh.reactivemachine>

exports.prg = m;
