"use hopscript"

var hh = require("hiphop");

var prg = <hh.module J>
  <hh.let I>
    <hh.parallel>
      <hh.emit I/>
      <hh.sequence>
	<hh.await I/>
	<hh.emit J/>
      </hh.sequence>
    </hh.parallel>
  </hh.let>
</hh.module>;

exports.prg = new hh.ReactiveMachine(prg, "parallel");
