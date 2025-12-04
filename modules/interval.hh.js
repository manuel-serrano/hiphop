/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/modules/interval.hh.js        */
/*    -------------------------------------------------------------    */
/*    Author      :  Manuel Serrano                                    */
/*    Creation    :  Sat Aug  4 13:43:31 2018                          */
/*    Last change :  Thu Dec  4 08:46:09 2025 (serrano)                */
/*    Copyright   :  2018-25 Manuel Serrano                            */
/*    -------------------------------------------------------------    */
/*    HipHop interval module.                                          */
/*=====================================================================*/
"use @hop/hiphop";
"use hopscript";

/*---------------------------------------------------------------------*/
/*    module                                                           */
/*---------------------------------------------------------------------*/
export { interval, Interval };
       
/*---------------------------------------------------------------------*/
/*    timeout ...                                                      */
/*---------------------------------------------------------------------*/
const timeout = hiphop module(duration, step, preval) {
   out elapsed;
   
   let tmt = false;
   let ds = 0;
   let d = 0;
   
   async (elapsed) {
      tmt = setTimeout(() => this.notify(preval + step), step);
   } suspend {
      ds = Date.now();
      if (tmt) {
	 clearTimeout(tmt);
	 tmt = false;
      }
   } resume {
      const dr = Date.now() - ds;
      if (ds < step) {
	 tmt = setTimeout(() => this.notify(preval + step), ds - step);
      } else {
	 this.notify(preval + step);
      }
   } kill {
      if (tmt) {
	 clearTimeout(tmt);
	 tmt = false;
      }
   }
}

/*---------------------------------------------------------------------*/
/*    basicInterval ...                                                */
/*---------------------------------------------------------------------*/
hiphop module basicInterval(duration, step) {
   out elapsed;
   out state;
   
   emit state("running");
   emit elapsed(0);
   
   abort {
      loop {
	 run timeout(duration, step || 100, elapsed.nowval) { * };
      }
   } when (elapsed.nowval >= duration)
   emit state("finished");
}

/*---------------------------------------------------------------------*/
/*    Interface ...                                                    */
/*---------------------------------------------------------------------*/
hiphop interface Interval {
   in reset;
   in pause;
   out elapsed = 0; 
   out state = "uninitialized";
   in suspend;
}

/*---------------------------------------------------------------------*/
/*    interval ...                                                     */
/*---------------------------------------------------------------------*/
hiphop module interval(duration, step) implements Interval {
   weakabort {
      do {
      	 fork {
	    suspend {
   	       do {
		  run basicInterval(duration, step) { * };
   	       } every (reset.now);
	    } toggle (suspend.now)
      	 } par {
	    loop {
	       await (suspend.now);
	       emit state("suspended");
	       await (suspend.now);
	       emit state("running");
	    }
	 }
      } every (reset.now);
   } when (state.nowval === "finished")
}
