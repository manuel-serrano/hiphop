"use hiphop";
"use hopscript";

const hh = require( "hiphop" );
const pm = hh.parallelmap;

function setTimeout( proc, count ) { 
   proc();
}

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
      this.notify( simul_data[ airline ] );
   }, rand( airline ) );
}

function svcSearch1( src, dst ) {
   setTimeout( () => {
      console.log( "svcSearch1 0", src, dst, "returns" );
      this.notify(Object.keys( simul_data ) )
   }, 0 );
}

function svcSearch2( src, dst ) {
   setTimeout( () => {
      console.log( "svcSearch2 1", src, dst, "returns" );
      this.notify(Object.keys(simul_data).reverse( ))
   }, 1 );
}

const machine = new hh.ReactiveMachine(
   hiphop module( SRC, DST, AIRLINESWITHDIRECT ) {
      do {
	 signal AIRLINESFOUND;
	 
	 weakabort( AIRLINESFOUND.now ) {
	    fork {
	       async AIRLINESFOUND { svcSearch1.call( this, SRC.nowval, DST.nowval ) }
	    } par {
	       async AIRLINESFOUND { svcSearch2.call( this, SRC.nowval, DST.nowval ) }
	    }
	 }

	 {
	    signal TEMP = {};

	    ${ <pm.parallelmap apply=${function() {return this.AIRLINESFOUND.nowval}} AIRLINE>
               ${ hiphop {
		  signal BADSEATS;
		  async BADSEATS { svcSeatGuru.call( this, AIRLINE.nowval ) }
		  emit TEMP( (function( t, airline, badseats ) {
      	             t[ airline ] = badseats;
      	             return t;
		  })( TEMP.preval, AIRLINE.nowval, BADSEATS.nowval ) );
	       } }
	       </pm.parallelmap> }
	    emit AIRLINESWITHDIRECT( TEMP.nowval );
	 }
      } every( SRC.now || DST.now )
   },
   { tracePropagation:false } );

machine.addEventListener(
   "AIRLINESWITHDIRECT",
   evt => console.log( evt.type, evt.nowval ) );

machine.react( { SRC: "Nice", DST: "Paris" } );
machine.react( { SRC: "Montpellier", DST: "Dublin" } );
