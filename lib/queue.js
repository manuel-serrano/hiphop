/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/lib/queue.js                  */
/*    -------------------------------------------------------------    */
/*    Author      :  Manuel Serrano                                    */
/*    Creation    :  Sat Sep  8 18:46:57 2018                          */
/*    Last change :  Wed Jan 26 09:03:51 2022 (serrano)                */
/*    Copyright   :  2018-22 Manuel Serrano                            */
/*    -------------------------------------------------------------    */
/*    Queue implementation                                             */
/*=====================================================================*/
"use strict";
"use hopscript";

/*---------------------------------------------------------------------*/
/*    es6 module                                                       */
/*---------------------------------------------------------------------*/
export { Queue };
       
/*---------------------------------------------------------------------*/
/*    Queue ...                                                        */
/*---------------------------------------------------------------------*/
// @sealed
class Queue {
   #data;
   #start;
   #end;
   
   constructor(length) {
      this.#data = new Array(length);
      this.#start = 0;
      this.#end = 0;
   }

   push(item) {
      this.#data[this.#end++] = item;
   }

   shift() {
      return this.#data[this.#start++];
   }

   reset() {
      this.#start = 0;
      this.#end = 0;
      return this;
   }
   
   get length() {
      return this.#end - this.#start; 
   }
}
