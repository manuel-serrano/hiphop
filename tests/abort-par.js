"use hopscript"

var hh = require("hiphop");

var inSig={accessibility: hh.IN};
var outSig={accessibility: hh.OUT};

var prg = <hh.module I=${inSig} O=${outSig}>
  <hh.local L>
    <hh.parallel>
      <hh.abort L>
	<hh.loop>
	  <hh.sequence>
	    <hh.emit O/>
	    <hh.pause/>
	  </hh.sequence>
	</hh.loop>
      </hh.abort>
      <hh.sequence>
	<hh.await I/>
	<hh.emit L/>
      </hh.sequence>
    </hh.parallel>
  </hh.local>
</hh.module>;

exports.prg = new hh.ReactiveMachine(prg, "abortpar");
