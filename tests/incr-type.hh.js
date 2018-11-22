"use hopscript"

function WatchTimeType( h, m, s, ampm ) {
   this.hours = h;
   this.minutes = m;
   this.seconds = s;
   this.ampm = ampm;
}


var WatchTime = new WatchTimeType( 0, 0, 0, false );

function IncrementTimeInPlace( t ) {
   let hours = t.hours;
   let minutes = t.minutes;
   let seconds = t.seconds;

   console.log( "foo", t );
   if( t.seconds == 3 ) {
      seconds = 0;
      if( t.minutes == 3 ) {
	 minutes = 0;
	 if( t.hours == 3 ) {
	    hours = 0;
	 } else {
	    hours++;
	 }
      } else {
	 minutes++;
      }
   } else {
      seconds++;
   }
   return new WatchTimeType( hours, minutes, seconds, t.ampm );
}

function print_time( evt ) {
   console.log( evt.nowval.hours
		+ ":" + evt.nowval.minutes
		+ ":" + evt.nowval.seconds );
}


var hh = require( "hiphop" );

hiphop module prg( in I, Time=WatchTime ) {
   loop {
      emit Time( IncrementTimeInPlace( Time.preval ) );
      yield;
   }
}

var m = new hh.ReactiveMachine( prg, "Foo" );

m.addEventListener( "Time", print_time );

exports.prg = m;
