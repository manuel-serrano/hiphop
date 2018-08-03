"use strict"

var hh = require( "hiphop" );

hiphop module prg( T ) {
   yield;
   {
      signal S;

      emit S();

      if( now( S ) ) emit T();
   }
}

exports.prg = new hh.ReactiveMachine( prg, "example1" );
