"use hopscript"

const hh = require("hiphop");
let prg = <hh.module>
                 <hh.local V_S_C>
                   <hh.local V_S_i>
                     <hh.sequence>
                       <hh.if V_S_C><hh.nothing/><hh.nothing/></hh.if>
                       <hh.if V_S_i><hh.emit V_S_C/><hh.nothing/></hh.if>
                     </hh.sequence>
                   </hh.local>
                 </hh.local>
               </hh.module>;
let machine = new hh.ReactiveMachine(prg );
try {
   machine.react();
} catch(e) {
   console.log( "causality error" );
}
