/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/modules/timeout.hh.js         */
/*    -------------------------------------------------------------    */
/*    Author      :  Manuel Serrano                                    */
/*    Creation    :  Sat Aug  4 13:43:31 2018                          */
/*    Last change :  Thu Dec  4 08:49:19 2025 (serrano)                */
/*    Copyright   :  2022-25 Manuel Serrano                            */
/*    -------------------------------------------------------------    */
/*    HipHop timeout module.                                           */
/*=====================================================================*/

/*---------------------------------------------------------------------*/
/*    module                                                           */
/*---------------------------------------------------------------------*/
export { timeout, Timeout };
       
/*---------------------------------------------------------------------*/
/*    $timeout ...                                                     */
/*---------------------------------------------------------------------*/
const $timeout = hiphop module(duration) {
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
   done: {
      do {
	 suspend {
	    run $timeout(duration) { * };
            break done;
	 } toggle (pause.now)
      } every (reset.now);
   }
}
