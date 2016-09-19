"require  hopscript"

var hh = require("hiphop");

var inSig = {accessibility: hh.IN};
var outSig = {accessibility: hh.OUT};

var prg =
    <hh.module A=${inSig} B=${inSig} C=${inSig} R=${inSig} O=${outSig}>
      <hh.loopeach R>
	<hh.parallel>
	  <hh.await A/>
	  <hh.await B/>
	  <hh.await C/>
	</hh.parallel>
	<hh.emit O/>
      </hh.loopeach>
    </hh.module>;

exports.prg = new hh.ReactiveMachine(prg, "ABCRO");
