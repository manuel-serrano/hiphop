/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/modules/promise.hh.js         */
/*    -------------------------------------------------------------    */
/*    Author      :  Manuel Serrano                                    */
/*    Creation    :  Sun Apr 10 08:11:59 2022                          */
/*    Last change :  Wed Apr 10 11:26:03 2024 (serrano)                */
/*    Copyright   :  2022-24 Manuel Serrano                            */
/*    -------------------------------------------------------------    */
/*    Promise module.                                                  */
/*=====================================================================*/

/*---------------------------------------------------------------------*/
/*    module                                                           */
/*---------------------------------------------------------------------*/
export { promise, Promise };

/*---------------------------------------------------------------------*/
/*    Promise ...                                                      */
/*---------------------------------------------------------------------*/
hiphop interface Promise {
    out value;
}
       
/*---------------------------------------------------------------------*/
/*    promise ...                                                      */
/*---------------------------------------------------------------------*/
hiphop module promise(promise) implements Promise {
   let self;
   let state = "active";
   let res, rej = false;
   
   let onres = (val) => {
      switch (state) {
	 case "suspend":
	    state = "pending";
	    res = val;
	    break;
	 case "kill":
	    break;
	 default:
	    self.notify({res: val, rej: false});
      }
   };
   
   let onrej = (val) => {
      switch (state) {
	 case "suspend":
	    state = "pending";
	    rej = val;
	    break;
	 case "kill":
	    break;
	 default:
	    self.notify({res: undefined, rej: val});
      }
   };

   async (value) {
      self = this;
      promise.then(onres, onrej);
   } suspend {
      state = "suspend";
   } resume {
      if (state === "pending") {
	 state = "resume";
	 self.notify({res: res, rej: rej});
      }
   } kill {
      state = "kill";
   }
}
