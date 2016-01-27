"use hopscript"

var hh = require("hiphop");

var prg = <hh.module>
  <hh.outputsignal name="O" type="number" init_value=5
		    combine_with=${(x, y) => x + y}/>
  <hh.loop>
    <hh.sequence>
      <hh.emit signal_name="O" exprs=5 />
      <hh.emit signal_name="O" exprs=10 />
      <hh.pause/>
    </hh.sequence>
  </hh.loop>
</hh.module>;

exports.prg = new hh.ReactiveMachine(prg, "value1");
