"use hopscript"

var hh = require("hiphop");

var prg = <hh.reactivemachine debug name="forcepre">
  <hh.outputsignal name="O" type="number" init_value=0 />
  <hh.emit signal_name="O" exprs=${hh.value("O")}/>
</hh.reactivemachine>;

exports.prg = prg;
