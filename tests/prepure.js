"use hopscript"

var hh = require("hiphop");

var prg = <hh.module O1 O2>
  <hh.loop>
    <hh.let S>
      <hh.if pre S>
	<hh.emit O1/>
	<hh.emit O2/>
      </hh.if>
      <hh.pause/>
      <hh.emit S/>
    </hh.let>
  </hh.loop>
</hh.module>;

exports.prg = new hh.ReactiveMachine(prg, "prepure");
