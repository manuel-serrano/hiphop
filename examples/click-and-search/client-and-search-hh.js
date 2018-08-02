const hh = require("hiphop");

module.exports = function( searchWiki, translate ) {
   return new hh.ReactiveMachine(
      module( in word, out green, out red, out black, out wiki, out trans ) {
	 every( immediate( now( word ) ) ) {
	    emit black( preval( word ) );
	    emit red( val( word ) );
	    fork {
	       async wikit {
		  hh.Promise( this, searchWiki( val( word ) ) );
	       }
	    } par {
	       async trans {
		  hh.Promise( this, translate( val( word ) ) );
	       }
	    }
	    
	    emit green( val( word ) );
	 }
      },
      { debuggerName: 'debug', sweep: false }
   );
}
