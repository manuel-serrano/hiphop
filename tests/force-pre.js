"use hopscript"

var hh = require("hiphop");

try {
var prg = <hh.module>
  <hh.outputsignal name="O" type="number" init_value=0 />
  <hh.emit signal_name="O" exprs=${hh.value("O")}/>
</hh.module>;
}catch(e){console.log(e.message)}
