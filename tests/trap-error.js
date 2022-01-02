"use hiphop";
"use hopscript"

const hh = require( "hiphop" );

const sub = 
    <hh.module>
      <hh.exit T/>
    </hh.module>;

const main = 
   <hh.module>
     <hh.trap T>
       <hh.run module=${sub}/>
     </hh.trap>
   </hh.module>;


prg = new hh.ReactiveMachine( prg, "abort-error" );
exports.prg = prg;


