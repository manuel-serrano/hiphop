/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/modules/promise.hh.js         */
/*    -------------------------------------------------------------    */
/*    Author      :  Manuel Serrano                                    */
/*    Creation    :  Sun Apr 10 08:11:59 2022                          */
/*    Last change :  Wed Apr 10 10:39:48 2024 (serrano)                */
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
   let prom;
   
   let onres = (value) => {
      switch (state) {
	 case "suspend":
	    state = "pending";
	    res = value;
	    break;
	 case "kill":
	    break;
	 default:
	    self.notify({res: value, rej: false});
      }
   };
   
   let onrej = (value) => {
      switch (state) {
	 case "suspend":
	    state = "pending";
	    rej = value;
	    break;
	 case "kill":
	    break;
	 default:
	    self.notify({res: undefined, rej: value});
      }
   };

   abort (value.now) {
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
}
