/*=====================================================================*/
/*    .../prgm/project/hiphop/hiphop/examples/timer/timer-hh.js        */
/*    -------------------------------------------------------------    */
/*    Author      :  Manuel Serrano                                    */
/*    Creation    :  Sat Aug  4 13:43:31 2018                          */
/*    Last change :  Fri Dec 24 06:27:06 2021 (serrano)                */
/*    Copyright   :  2018-21 Manuel Serrano                            */
/*    -------------------------------------------------------------    */
/*    HipHop part of the Timer example.                                */
/*=====================================================================*/
"use hiphop"
"use hopscript"

/*---------------------------------------------------------------------*/
/*    module                                                           */
/*---------------------------------------------------------------------*/
export { suspendableTimer };
       
/*---------------------------------------------------------------------*/
/*    timeoutMod ...                                                   */
/*---------------------------------------------------------------------*/
function timeoutMod(nms) {
   return hiphop module(tick) {
      let tmt = false;
      let d = 0;
      async (tick) {
        tmt = setTimeout(() => this.notify(true), nms);
      } suspend {
	 d = Date.now();
	 if (tmt) clearTimeout(tmt);
      } resume {
	 d = Date.now() - d;
	 if (d < nms) {
            tmt = setTimeout(() => this.notify(true), nms - d);
	 } else {
	    this.notify(true);
	 }
      } kill {
	 if (tmt) clearTimeout(tmt);
      }
   }
}

/*---------------------------------------------------------------------*/
/*    basicTimer ...                                                   */
/*---------------------------------------------------------------------*/
hiphop module basicTimer(in duration=0, out elapsed) {
   emit elapsed(0);
   loop {
      if (elapsed.nowval < duration.nowval) {
	 signal tick;
	 run ${timeoutMod(100)}(...);
	 emit elapsed(elapsed.preval + 0.1);
      } else {
	 yield;
      }
   }
}

/*---------------------------------------------------------------------*/
/*    timer ...                                                        */
/*---------------------------------------------------------------------*/
hiphop module timer(in duration=0, in reset, out elapsed) {
   do {
      run basicTimer(...);
   } every (reset.now);
}

/*---------------------------------------------------------------------*/
/*    Timer ...                                                        */
/*---------------------------------------------------------------------*/
hiphop interface Timer(in reset, in suspend,
                       out elapsed=0, out suspendcolor,
                       inout duration);

/*---------------------------------------------------------------------*/
/*    suspendableTimer ...                                             */
/*---------------------------------------------------------------------*/
hiphop module suspendableTimer() implements Timer {
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

/*---------------------------------------------------------------------*/
/*    exports                                                          */
/*---------------------------------------------------------------------*/
module.exports = suspendableTimer;
