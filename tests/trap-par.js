"use hopscript"

var hh = require("hiphop");

var prg = <hh.module A B C>
  <hh.trap T>
    <hh.parallel>
      <hh.sequence>
	<hh.emit A/>
	<hh.exit T/>
      </hh.sequence>
      <hh.sequence>
	<hh.emit B/>
	<hh.pause/>
	<hh.emit C/>
      </hh.sequence>
    </hh.parallel>
  </hh.trap>
</hh.module>;

exports.prg = new hh.ReactiveMachine(prg, "trappar");
