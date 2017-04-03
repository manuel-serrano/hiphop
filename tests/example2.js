"use hopscript"

var hh = require("hiphop");

var prg = <hh.module T V>
  <hh.local S>
    <hh.loop>
      <hh.sequence>
	<hh.emit S/>
	<hh.if S>
	  <hh.emit T/>
	</hh.if>
	<hh.pause/>
	<hh.emit V/>
      </hh.sequence>
    </hh.loop>
  </hh.local>
</hh.module>

exports.prg = new hh.ReactiveMachine(prg, "example2");
