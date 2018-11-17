"use hiphop"
"use hopscript"

const hh = require( "hiphop" );

function inputAndReact( val ) {
   function disp( emitted ) {
      console.log( "IN(" + val + ") -->", emitted );
   }
   /* on trace, "IN(..) --> ..." is printed after traces embeded in
      the reactive program */
   m.debug_emitted_func = disp;
   m.inputAndReact( "IN", val );
   m.debug_emitted_func = console.log
}

hiphop module prg( in IN combine (a, b) => b, OUT1="1|", OUT2="2|" ) {
   loop {
      await immediate IN.now;
      hop { console.log("   will trigger exec") }
      trap: fork {
	 async OUT1 {
	    let timeout = 100;

	    if ( IN.nowval == "LONGWAIT") timeout = timeout * 3;

	    console.log( "   exec started", timeout, IN.nowval );
	    setTimeout( function( self, v ) {
	       console.log( "   exec returns", timeout, v );
	       self.notify( v + "--|" + timeout, false );
	    }, timeout, this, IN.nowval );
	 }
      } par {
	 async OUT2 {
	    let timeout = 200;

	    if( IN.nowval == "LONGWAIT" ) timeout = timeout * 3;

	    console.log( "   exec started", timeout, this.IN.nowval );
	    setTimeout( function( self, v ) {
	       console.log( "   exec returns", timeout, v );
	       self.notify( v + "--|" + timeout, false );
	    }, timeout, this, IN.nowval );
	 }
      } par {
	 await IN.now;
	 hop { console.log("   will trap") }
	 break trap;
      }
   }
}

var m = new hh.ReactiveMachine( prg );
m.debug_emitted_func = console.log;

/* TEST 1 */
setTimeout( function() {
   console.log( "--- TEST 1 ---" );
   m.react()
   inputAndReact( "|" );
   m.react()
   setTimeout( function() {m.react()}, 150 );
   setTimeout( function() {m.react()}, 300 );
}, 0 );

/* TEST 2 */
setTimeout( function() {
   console.log( "--- TEST 2 ---" );
   inputAndReact( "|" );
   m.react()
   setTimeout( function() {m.react()}, 300 );
   setTimeout( function() {m.react()}, 350 );
}, 500 );

/* TEST 3 */
setTimeout( function() {
   console.log( "--- TEST 3 ---" );
   inputAndReact( "|1|" );
   /* Only output signal with value |2|--... should be emitted */
   setTimeout( function() {inputAndReact( "|2|" )}, 50 );
   setTimeout( function() {m.react()}, 120 );
   setTimeout( function() {m.react()}, 350 );
}, 1000 );

/* TEST 4 */
setTimeout( function() {
   console.log( "--- TEST 4 ---" );
   /* This event will trigger exec that will be interrupted 50ms after.
      However, the exec return will be trigger *after* the second ones,
      but it is ignored (or the test failed) */
   inputAndReact( "LONGWAIT" );
   setTimeout( function() {inputAndReact("|2|")}, 50 );
   setTimeout( function() {m.react()}, 2000 );
}, 1500 );
