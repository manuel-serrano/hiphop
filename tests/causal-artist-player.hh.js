"use hiphop";
"use hopscript";

const hh = require( "hiphop" );

function prg2() {
   return hiphop module( artist, playlist ) {
      found: loop {
	 signal candidateArtist, candidatePlaylist;
	 async candidateArtist {
	    setTimeout( () => this.notify( "leartiste" ), 90 );
	 }
	 async candidatePlaylist {
	    setTimeout( () => this.notify( "laplaylist" ), 50 );
	 }
	 if( candidatePlaylist.nowval ) {
	    emit playlist( candidatePlaylist.nowval );
	    emit artist( candidateArtist.nowval );
	    break found;
	 }
      }
   }
}

hiphop module prg( artist, playlist, exit ) {
   abort( exit.now ) {
      fork {
	 run ${prg2()}( artist as artist, ... );
      } par {
	 every( artist.now ) {
	    hop { console.log( "***ARTIST***", artist.nowval ) };
	 }
      } par {
	 every( playlist.now ) {
	    hop { console.log( "***PLAYLIST***", playlist.nowval ) };
	 }
      }
   }
}

const m = new hh.ReactiveMachine( prg )
//console.log(m.ast.pretty_print());
m.react();
