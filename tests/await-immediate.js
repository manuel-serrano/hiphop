"use hopscript"

var hh = require("hiphop");

var inSig = {accessibility: hh.IN};
var outSig = {accessibility: hh.OUT};

var prg =
    <hh.module I=${inSig} O=${outSig}>
      <hh.loop>
	<hh.sequence>
	  <hh.await I immediate />
	  <hh.emit O />
	  <hh.pause/>
	</hh.sequence>
      </hh.loop>
    </hh.module>;

exports.prg = new hh.ReactiveMachine(prg, "awaitimmediate");
