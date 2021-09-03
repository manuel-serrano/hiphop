"use hiphop";
"use hopscript";

var hh = require( "hiphop" );

hiphop module example( I, O ) {

      if(  I.now ) emit I();
      emit O();

}
let machine = new hh.ReactiveMachine(example, {CausalityErrorTrace:"deep", sweep:false} );

try {
    machine.react();
} catch( e ) { 
    console.log( "causality error" );
}
