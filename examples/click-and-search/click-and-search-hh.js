"use hiphop";

const hh = require("hiphop");

module.exports = function( searchWiki, translate ) {
   return new hh.ReactiveMachine(
      hiphop module( in word, out green, out red, out black, out wiki, out trans ) {
	 every( immediate( now( word ) ) ) {
	    emit black( preval( word ) );
	    emit red( nowval( word ) );
	    fork {
	       async wiki {
		  this.notifyAndReact( searchWiki( nowval( word ) ) );
	       }
	    } par {
	       async trans {
		  this.notifyAndReact( translate( nowval( word ) ) );
	       }
	    }
	    
	    emit green( nowval( word ) );
	 }
      },
      { debuggerName: 'debug', sweep: false }
   );
}
