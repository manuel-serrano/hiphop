"use hopscript"

var hh = require("hiphop");

var inSig = {accessibility: hh.IN};
var outSig = {accessibility: hh.OUT};

var prg =
    <hh.module I=${inSig} O=${outSig}>
      <hh.loop>
	<hh.await I countValue=3 />
	<hh.emit O />
      </hh.loop>
    </hh.module>;

exports.prg = new hh.ReactiveMachine(prg, "await3");

