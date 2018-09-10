/*=====================================================================*/
/*    serrano/prgm/project/hiphop/0.2.x/lib/queue.js                   */
/*    -------------------------------------------------------------    */
/*    Author      :  Manuel Serrano                                    */
/*    Creation    :  Sat Sep  8 18:46:57 2018                          */
/*    Last change :  Mon Sep 10 15:35:27 2018 (serrano)                */
/*    Copyright   :  2018 Manuel Serrano                               */
/*    -------------------------------------------------------------    */
/*    Queue implementation                                             */
/*=====================================================================*/
"use strict";

function Queue( length, mark ) {
   this.data = new Array( length );
   this.start = 0;
   this.end = 0;
   this.mark = mark
}

Queue.prototype.push = function( item ) {
   this.mark( item );
   this.data[ this.end++ ] = item;
}

Queue.prototype.shift = function( item ) {
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
