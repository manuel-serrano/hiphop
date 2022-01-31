/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/modules/interval.hh.js        */
/*    -------------------------------------------------------------    */
/*    Author      :  Manuel Serrano                                    */
/*    Creation    :  Sat Aug  4 13:43:31 2018                          */
/*    Last change :  Tue Jan 18 07:36:44 2022 (serrano)                */
/*    Copyright   :  2018-22 Manuel Serrano                            */
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
hiphop module timeout(duration, step) {
   out tick;
   
   let tmt = false;
   let ds = 0;
   let d = 0;
   
   async (tick) {
      tmt = setTimeout(() => this.notify(step), step);
   } suspend {
      ds = Date.now();
      if (tmt) clearTimeout(tmt);
   } resume {
      const dr = Date.now() - ds;
      if (ds < step) {
	 tmt = setTimeout(() => this.notify(step), ds - step);
      } else {
	 this.notify(step);
      }
   } kill {
      if (tmt) clearTimeout(tmt);
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
   
   loop {
      if (elapsed.nowval < duration) {
	 signal tick;
	 run timeout(duration, step || 100) { * };
         emit elapsed(elapsed.preval + tick.nowval);
      } else {
	 yield;
      }
   }
}

/*---------------------------------------------------------------------*/
/*    Interface ...                                                    */
/*---------------------------------------------------------------------*/
hiphop interface Interval {
   in reset;
   in suspend;
   out elapsed = 0; 
   out state;
}

/*---------------------------------------------------------------------*/
/*    interval ...                                                     */
/*---------------------------------------------------------------------*/
hiphop module interval(duration, step) implements Interval {
   do {
      fork {
	 suspend toggle (suspend.now) {
   	    do {
      	       run basicInterval(duration, step) { * };
   	    } every (reset.now);
	 }
      } par {
	 loop {
	    await (suspend.now);
	    emit state("suspended");
	    await (suspend.now);
	    emit state("running");
	 }
      }
   } every (reset.now);
   emit state("finished");
}
