"use hopscript"

var hh = require("hiphop");

var prg = <hh.module O1 O2>
  <hh.let S>
    <hh.loop>
      <hh.if pre S>
	<hh.emit O1/>
	<hh.emit O2/>
      </hh.if>
      <hh.pause/>
      <hh.emit S/>
    </hh.loop>
  </hh.let>
</hh.module>;

exports.prg = new hh.ReactiveMachine(prg, "prepure2");
