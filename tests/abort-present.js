"use hopscript"

var hh = require("hiphop");

var inSig = {accessibility: hh.IN};
var outSig = {accessibility: hh.OUT};

var prg = <hh.module I=${inSig} J=${outSig} K=${outSig} V=${outSig}>
  <hh.loop>
    <hh.sequence>
      <hh.abort I>
	<hh.sequence>
	  <hh.emit J/>
	  <hh.pause/>
	  <hh.emit V/>
	  <hh.pause/>
	</hh.sequence>
      </hh.abort>
      <hh.if I>
	<hh.emit K/>
      </hh.if>
    </hh.sequence>
  </hh.loop>
</hh.module>

exports.prg = new hh.ReactiveMachine(prg, "abortpresent");
