"use hopscript"

const hh = require( "hiphop" );
const mach = new hh.ReactiveMachine(
   hiphop module( L ) {
      T1: fork {
	 break T1;
      } par {
	 suspend( L.now ) {
	    yield;
	 }
      }
      hop { console.log( "exit trap" ) }
   } );

mach.react();
