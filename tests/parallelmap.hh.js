"use hopscript"

const hh = require( "hiphop" );
const pm = hh.parallelmap;

const simul_data = {
   "Air France": [ "2A", "34F" ],
   "Ryanair": [ "12F", "9A", "32F" ],
   "American Airlines": [ "15C" ],
   "British Airways": [ "2D", "14A" ]
};

function svcSeatGuru( airline ) {
   function rand( v ) {
      switch( v ) {
	 case "Air France":
	    return 3;
	 case "Ryanair":
	    return 5;
	 case "American Airlines":
	    return 1;
	 case "British Airways":
	    return 6;
      }
   }
   setTimeout( () => {
      console.log( "svcSeatGuru", airline, "returns" );
      this.notifyAndReact( simul_data[ airline ] );
   }, rand( airline ) );
}

function svcSearch1( src, dst ) {
   setTimeout( () => {
      console.log( "svcSearch1 0", src, dst, "returns" );
      this.notifyAndReact(Object.keys( simul_data ) )
   }, 0 );
}

function svcSearch2( src, dst ) {
   setTimeout( () => {
      console.log( "svcSearch2 1", src, dst, "returns" );
      this.notifyAndReact(Object.keys(simul_data).reverse( ))
   }, 1 );
}

const machine = new hh.ReactiveMachine(
   hiphop module( SRC, DST, AIRLINESWITHDIRECT ) {
      do {
	 signal AIRLINESFOUND;

	 weakabort( now( AIRLINESFOUND ) ) {
	    fork {
	       async AIRLINESFOUND { svcSearch1.call( this, val( SRC ), val( DST ) ) }
	    } par {
	       async AIRLINESFOUND { svcSearch2.call( this, val( SRC ), val( DST ) ) }
	    }
	 }

	 {
	    signal TEMP = {};

	    ${ <pm.parallelmap apply=${function() {return this.value.AIRLINESFOUND}} AIRLINE>
               ${ hiphop {
		  signal BADSEATS;
		  async BADSEATS { svcSeatGuru.call( this, val( AIRLINE ) ) }
		  emit TEMP( (function( t, airline, badseats ) {
      	             t[ airline ] = badseats;
      	             return t;
		  })( preval( TEMP ), val( AIRLINE ), val( BADSEATS ) ) );
	       } }
	       </pm.parallelmap> }
	    emit AIRLINESWITHDIRECT( val( TEMP ) );
	 }
      } while( now( SRC ) || now( DST ) )
   },
   { tracePropagation:false } );

machine.addEventListener(
   "AIRLINESWITHDIRECT",
   evt => console.log( evt.signalName, evt.signalValue ) );

machine.input( "SRC", "Nice" );
machine.input( "DST", "Paris" );
machine.react();

machine.input( "SRC", "Montpellier" );
machine.input( "DST", "Dublin" );
machine.react();
