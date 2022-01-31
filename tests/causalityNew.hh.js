"use @hop/hiphop";
"use hopscript";

import * as hh from "@hop/hiphop";

hiphop module example() {
   in I; out O;
      
   if(  I.now ) emit I();
   emit O();
}

let machine = new hh.ReactiveMachine(example, {CausalityErrorTrace:"deep", sweep:false} );

try {
    machine.react();
} catch( e ) { 
    console.log( "causality error" );
}
