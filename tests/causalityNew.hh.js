"use hiphop";
"use hopscript";

var hh = require( "hiphop" );

hiphop module example( I, O ) {

      if(  I.now ) emit I();
      emit O();

}
let machine = new hh.ReactiveMachine(example, {dumpNets:false, sweep:false} );

//machine.debug_emitted_func = console.log;
try {
      machine.react();
   } catch(e) {
      console.error(e.toString());
   }
