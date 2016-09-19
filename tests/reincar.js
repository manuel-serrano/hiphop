"use hopstrict"

var hh = require("hiphop");

var prg =
<hh.module O>
  <hh.loop>
    <hh.let S>
      <hh.if S>
	<hh.emit O/>
      </hh.if>
      <hh.pause/>
      <hh.emit S/>
    </hh.let>
  </hh.loop>
</hh.module>

exports.prg = new hh.ReactiveMachine(prg, "reincar");
