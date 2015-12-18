"use strict"

var rjs = require("hiphop");

var prg = <rjs.reactivemachine debug name="example1">
  <rjs.outputsignal name="T"/>
  <rjs.sequence>
    <rjs.pause/>
    <rjs.localsignal name="S">
      <rjs.sequence>
	<rjs.emit signal_name="S"/>
	<rjs.present signal_name="S">
	  <rjs.emit signal_name="T"/>
	</rjs.present>
      </rjs.sequence>
    </rjs.localsignal>
  </rjs.sequence>
</rjs.ReactiveMachine>

exports.prg = prg;
