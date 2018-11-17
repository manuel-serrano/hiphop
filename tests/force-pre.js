"use hopscript"

var hh = require("hiphop");

try {
   var prg = <hh.module O=${{initValue: 0}}>
     <hh.emit O apply=${function() {return this.O.nowval}}/>
   </hh.module>;
}catch(e){console.log("error: self update")}
