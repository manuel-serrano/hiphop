/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/modules/timeout.hh.js         */
/*    -------------------------------------------------------------    */
/*    Author      :  Manuel Serrano                                    */
/*    Creation    :  Sat Aug  4 13:43:31 2018                          */
/*    Last change :  Wed May 18 07:18:51 2022 (serrano)                */
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
   out elapsed;
}

/*---------------------------------------------------------------------*/
/*    timeout ...                                                      */
/*---------------------------------------------------------------------*/
hiphop module timeout(duration) implements Timeout {
   abort (elapsed.now) {
      do {
	 suspend toggle (pause.now) {
	    run ${sleep}(duration) { * };
	 }
      } every (reset.now);
   }
}
