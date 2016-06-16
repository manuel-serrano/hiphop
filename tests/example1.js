"use strict"

var hh = require("hiphop");

var prg = <hh.module>
  <hh.outputsignal name="T"/>
  <hh.sequence>
    <hh.pause/>
    <hh.let>
      <hh.signal name="S"/>
      <hh.sequence>
	<hh.emit signal="S"/>
	<hh.present signal="S">
	  <hh.emit signal="T"/>
	</hh.present>
      </hh.sequence>
    </hh.let>
  </hh.sequence>
</hh.module>

exports.prg = new hh.ReactiveMachine(prg, "example1");
