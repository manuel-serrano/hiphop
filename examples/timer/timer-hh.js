/*=====================================================================*/
/*    serrano/prgm/project/hiphop/0.2.x/examples/timer/timer-hh.js     */
/*    -------------------------------------------------------------    */
/*    Author      :  Manuel Serrano                                    */
/*    Creation    :  Sat Aug  4 13:43:31 2018                          */
/*    Last change :                                                    */
/*    Copyright   :  2018 Manuel Serrano                               */
/*    -------------------------------------------------------------    */
/*    HipHop part of the Timer example.                                */
/*=====================================================================*/

/*---------------------------------------------------------------------*/
/*    imports                                                          */
/*---------------------------------------------------------------------*/
const hh = require("hiphop");

/*---------------------------------------------------------------------*/
/*    timeoutMod ...                                                   */
/*---------------------------------------------------------------------*/
function timeoutMod( nms ) {
   return hiphop module() {
      async {
	 const self = this;
	 setTimeout( function() { self.terminateExecAndReact() }, nms );
      } resume {
	 const self = this;
	 setTimeout( function() { self.terminateExecAndReact() }, nms );
      }
   }
}

hiphop module basicTimer( in duration=0, out elapsed ) {
   emit elapsed( 0 );
   loop {
      if( val( elapsed ) < val( duration ) ) {
	 run timeoutMod( 100 )();
	 emit elapsed( preval( elapsed ) + 0.1 );
      } else {
	 yield;
      }
   }
}

hiphop module timer( in duration=0, in reset, out elapsed ) {
   do {
      run basicTimer();
   } every( now(reset ) );
}

hiphop module suspendableTimer( in reset, in suspend,
				out elapsed=0, out suspendcolor,
				inout duration ) {
   do {
      fork {
	 suspend toggle now( suspend ) {
	    run timer();
	 }
      } par {
	 emit suspendcolor( "transparent" );
	 loop {
	    await now( suspend );
	    emit suspendcolor( "orange" );
	    await now( suspend );
	    emit suspendcolor( "transparent" );
	 }
      }
   } every( now( reset ) )
}

module.exports = new hh.ReactiveMachine(suspendableTimer);
