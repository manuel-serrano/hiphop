"use @hop/hiphop";
"use hopscript";

import * as hh from "@hop/hiphop";

function prg2() {
   return hiphop module() {
      inout artist, playlist;
      found: loop {
	 signal candidateArtist, candidatePlaylist;
	 async (candidateArtist) {
	    setTimeout(() => this.notify("leartiste"), 90);
	 }
	       async (candidatePlaylist) {
	    setTimeout(() => this.notify("laplaylist"), 50);
	 }
	 if(candidatePlaylist.nowval) {
	    emit playlist(candidatePlaylist.nowval);
	    emit artist(candidateArtist.nowval);
	    break found;
	 }
      }
   }
}

hiphop module prg() {
   inout artist, playlist, exit;
   abort(exit.now) {
      fork {
	 run ${prg2()}() { artist as artist, * };
      } par {
	 every(artist.now) {
	    host { mach.outbuf += ("***ARTIST***", artist.nowval) + "\n" };
	 }
      } par {
	 every(playlist.now) {
	    host { mach.outbuf += ("***PLAYLIST***", playlist.nowval) + "\n" };
	 }
      }
   }
}

export const mach = new hh.ReactiveMachine(prg)
mach.react();
