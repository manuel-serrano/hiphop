"use hiphop";
"use hopscript"

var hh = require( "hiphop" );

var sub = 
    <hh.module>
      <hh.exit T/>
    </hh.module>;

var main = 
   <hh.module>
     <hh.trap T>
       <hh.run module=${sub}/>
     </hh.trap>
   </hh.module>;


prg = new hh.ReactiveMachine( prg, "abort-error" );
exports.prg = prg;


