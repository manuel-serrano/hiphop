/*=====================================================================*/
/*    .../prgm/project/hiphop/hiphop/examples/timer/timer-hh.js        */
/*    -------------------------------------------------------------    */
/*    Author      :  Manuel Serrano                                    */
/*    Creation    :  Sat Aug  4 13:43:31 2018                          */
/*    Last change :  Fri Dec 10 07:52:07 2021 (serrano)                */
/*    Copyright   :  2018-21 Manuel Serrano                            */
/*    -------------------------------------------------------------    */
/*    HipHop part of the Timer example.                                */
/*=====================================================================*/
"use hiphop"
"use hopscript"

/*---------------------------------------------------------------------*/
/*    imports                                                          */
/*---------------------------------------------------------------------*/
const hh = require("hiphop");

/*---------------------------------------------------------------------*/
/*    timeoutMod ...                                                   */
/*---------------------------------------------------------------------*/
function timeoutMod(nms) {
   return hiphop module(elapsed) {
      block { console.log(">>> avant async") }
      async (elapsed) {
        setTimeout(() => this.react(), nms);
      } resume {
        setTimeout(() => this.react(), nms);
      }
      block { console.log("<<< apres async") }
   }
}

hiphop module basicTimer(in duration=0, out elapsed) {
   emit elapsed(0);
   loop {
      block { console.log("basicTimer", elapsed.nowval, duration.nowval); }
      if (elapsed.nowval < duration.nowval) {
	 run ${timeoutMod(100)}(...);
	 block { console.log("ici"); }
	 emit elapsed(elapsed.preval + 0.1);
      } else {
	 yield;
      }
   }
}

hiphop module timer(in duration=0, in reset, out elapsed) {
   do {
      run basicTimer(...);
   } every (reset.now);
}

hiphop interface Timer(in reset, in suspend,
				    out elapsed=0, out suspendcolor,
				    inout duration);

hiphop module suspendableTimer() implements Timer {
   block { console.log("waiting...", duration.nowval); }
   do {
      fork {
	 suspend toggle (suspend.now) {
	    run timer(...);
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

hiphop module suspendableTimerDbg() implements Timer {
   fork {		       
      run suspendableTimer(...);
   } par {
      let tick = 0;
      loop {
	 block { console.log("tick:", tick++); }
	 yield;
      }
   }
}
   
module.exports = new hh.ReactiveMachine(suspendableTimerDbg);
