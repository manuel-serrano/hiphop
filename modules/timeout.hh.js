/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/modules/timeout.hh.js         */
/*    -------------------------------------------------------------    */
/*    Author      :  Manuel Serrano                                    */
/*    Creation    :  Sat Aug  4 13:43:31 2018                          */
/*    Last change :  Mon May 23 20:19:58 2022 (serrano)                */
/*    Copyright   :  2022 Manuel Serrano                               */
/*    -------------------------------------------------------------    */
/*    HipHop timeout module.                                           */
/*=====================================================================*/
"use @hop/hiphop";
"use hopscript";

/*---------------------------------------------------------------------*/
/*    module                                                           */
/*---------------------------------------------------------------------*/
export { timeout, Timeout };
       
/*---------------------------------------------------------------------*/
/*    sleep ...                                                        */
/*---------------------------------------------------------------------*/
const sleep = hiphop module (duration) {
   out elapsed;

   let tmt = false;
   let d0 = Date.now();
   let dr = 0;

   async (elapsed) {
      tmt = setTimeout(() => { tmt = false; this.notify(duration) }, duration);
   } suspend {
      if (tmt) {
	 clearTimeout(tmt);
	 tmt = false;
      }
      dr = duration - (Date.now() - d0);
   } resume {
      if (dr > 0) {
	 tmt = setTimeout(() => this.notify(duration), dr);
      } else {
	 this.notify(duration);
      }
   } kill {
      if (tmt) {
	 clearTimeout(tmt);
	 tmt = false;
      }
   }
}

/*---------------------------------------------------------------------*/
/*    Interface ...                                                    */
/*---------------------------------------------------------------------*/
hiphop interface Timeout {
   in reset;
   in pause;
   in elapsed;
}

/*---------------------------------------------------------------------*/
/*    timeout ...                                                      */
/*---------------------------------------------------------------------*/
hiphop module timeout(duration) implements Timeout {
   done: {
      do {
	 suspend toggle (pause.now) {
	    run ${sleep}(duration) { * };
            break done;
	 }
      } every (reset.now);
   }
}
