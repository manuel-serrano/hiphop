"use strict"

var hh = require("hiphop");

var prg = <hh.module T>
  <hh.sequence>
    <hh.pause/>
    <hh.let S>
      <hh.sequence>
	<hh.emit S/>
	<hh.if S>
	  <hh.emit T/>
	</hh.if>
      </hh.sequence>
    </hh.let>
  </hh.sequence>
</hh.module>

exports.prg = new hh.ReactiveMachine(prg, "example1");
