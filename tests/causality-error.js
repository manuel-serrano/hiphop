"use hopscript"

var hh = require("hiphop");

var example = <hh.module I O>
  <hh.loop>
    <hh.sequence>
      <hh.if O>
	<hh.emit I/>
      </hh.if>
      <hh.emit O/>
      <hh.pause/>
    </hh.sequence>
  </hh.loop>
</hh.module>;

exports.prg = new hh.ReactiveMachine(example, "presentemit");
