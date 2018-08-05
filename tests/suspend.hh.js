"use hopscript"

var hh = require( "hiphop" );

hiphop module prg( in I, J, O ) {
   suspend( now( I ) ) {
      loop {
	 emit O();
	 yield;
      }
   }
   emit J();
}   

exports.prg = new hh.ReactiveMachine( prg, "SUSPEND" );
