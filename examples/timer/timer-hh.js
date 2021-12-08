/*=====================================================================*/
/*    .../prgm/project/hiphop/hiphop/examples/timer/timer-hh.js        */
/*    -------------------------------------------------------------    */
/*    Author      :  Manuel Serrano                                    */
/*    Creation    :  Sat Aug  4 13:43:31 2018                          */
/*    Last change :  Wed Dec  8 16:24:17 2021 (serrano)                */
/*    Copyright   :  2018-21 Manuel Serrano                            */
/*    -------------------------------------------------------------    */
/*    HipHop part of the Timer example.                                */
/*=====================================================================*/
"use hiphop"
//"use hopscript"

/*---------------------------------------------------------------------*/
/*    imports                                                          */
/*---------------------------------------------------------------------*/
const hh = require("hiphop");

/*---------------------------------------------------------------------*/
/*    timeoutMod ...                                                   */
/*---------------------------------------------------------------------*/
function timeoutMod(nms) {
   return hiphop module() {
      async {
	 const self = this;
	 setTimeout(function() { self.terminateExecAndReact() }, nms);
      } resume {
	 const self = this;
	 setTimeout(function() { self.terminateExecAndReact() }, nms);
      }
   }
}

hiphop module basicTimer(in duration=0, out elapsed) {
   emit elapsed(0);
   loop {
      if (elapsed.nowval < duration.nowval) {
	 run ${timeoutMod(100)}();
	 emit elapsed(elapsed.preval + 0.1);
      } else {
	 yield;
      }
   }
}

hiphop module timer(in duration=0, in reset, out elapsed) {
   do {
      run basicTimer();
   } every (reset.now);
}

hiphop module suspendableTimer(in reset, in suspend,
				out elapsed=0, out suspendcolor,
				inout duration) {
   do {
      fork {
	 suspend toggle (suspend.now) {
	    run timer();
	 }
      } par {
	 emit suspendcolor("transparent");
	 loop {
	    await (suspend.now);
	    emit suspendcolor("orange");
	    await (suspend.now);
	    emit suspendcolor("transparent");
	 }
      }
   } every (reset.now)
}

module.exports = new hh.ReactiveMachine(suspendableTimer);
