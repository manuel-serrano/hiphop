"use hopscript"

const hh = require( "hiphop" );

function prg2() {
   return hiphop module( artist, playlist ) {
      found: loop {
	 signal candidateArtist, candidatePlaylist;
	 async candidateArtist {
	    setTimeout( () => this.notifyAndReact( "leartiste" ), 90 );
	 }
	 async candidatePlaylist {
	    setTimeout( () => this.notifyAndReact( "laplaylist" ), 50 );
	 }
	 if( nowval( candidatePlaylist ) ) {
	    emit playlist( nowval( candidatePlaylist ) );
	    emit artist( nowval( candidateArtist ) );
	    break found;
	 }
      }
   }
}

hiphop module prg( artist, playlist, exit ) {
   abort( now( exit ) ) {
      fork {
	 run prg2()( artist=artist, playlist=playlist );
      } par {
	 every( now( artist ) ) {
	    hop { console.log( "***ARTIST***", nowval( artist ) ) };
	 }
      } par {
	 every( now( playlist ) ) {
	    hop { console.log( "***PLAYLIST***", nowval( playlist ) ) };
	 }
      }
   }
}

const m = new hh.ReactiveMachine( prg )
//console.log(m.ast.pretty_print());
m.react();
