"use hopscript"

import * as hh from "@hop/hiphop";

try {
   const prg = <hh.module O=${{initValue: 0}}>
     <hh.emit O apply=${function() {return this.O.nowval}}/>
   </hh.module>;
}catch(e){console.log("error: self update")}
