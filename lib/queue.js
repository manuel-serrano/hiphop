/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/lib/queue.js                  */
/*    -------------------------------------------------------------    */
/*    Author      :  Manuel Serrano                                    */
/*    Creation    :  Sat Sep  8 18:46:57 2018                          */
/*    Last change :  Wed Mar 11 09:23:57 2020 (serrano)                */
/*    Copyright   :  2018-20 Manuel Serrano                            */
/*    -------------------------------------------------------------    */
/*    Queue implementation                                             */
/*=====================================================================*/
"use strict";

function Queue( length ) {
   this.data = new Array( length );
   this.start = 0;
   this.end = 0;
}

Queue.prototype.push = function( item ) {
   item.isInKnownList = true;
   this.data[ this.end++ ] = item;
}

Queue.prototype.shift = function() {
   return this.data[ this.start++ ];
}


Queue.prototype.reset = function() {
   this.start = 0;
   this.end = 0;
   return this;
}

Object.defineProperty( Queue.prototype, "length", {
   get: function() { return this.end - this.start; }
} )
		       

module.exports = Queue;
