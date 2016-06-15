"use hopscript"

var hh = require("hiphop");

try {
var prg = <hh.module>
  <hh.outputsignal name="O" init_value=0 />
  <hh.emit signal="O" arg=${hh.value("O")}/>
</hh.module>;
}catch(e){console.log(e.message)}
