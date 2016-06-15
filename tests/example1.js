"use strict"

var hh = require("hiphop");

var prg = <hh.module>
  <hh.outputsignal name="T"/>
  <hh.sequence>
    <hh.pause/>
    <hh.localsignal name="S">
      <hh.sequence>
	<hh.emit signal="S"/>
	<hh.present signal="S">
	  <hh.emit signal="T"/>
	</hh.present>
      </hh.sequence>
    </hh.localsignal>
  </hh.sequence>
</hh.module>

exports.prg = new hh.ReactiveMachine(prg, "example1");
