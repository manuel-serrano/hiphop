"use hopscript"

var hh = require("hiphop");

var prg =
    <hh.module A B END1 END2>
      <hh.parallel>
	<hh.sequence>
	  <hh.emit A/>
	  <hh.await immediate B/>
	  <hh.emit END1/>
	</hh.sequence>
	<hh.sequence>
	  <hh.emit B/>
	  <hh.await immediate A/>
	  <hh.emit END2/>
	</hh.sequence>
      </hh.parallel>
    </hh.module>;

exports.prg = new hh.ReactiveMachine(prg, "crossawait");
