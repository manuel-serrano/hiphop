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
	 if (candidatePlaylist.nowval) {
	    emit playlist(candidatePlaylist.nowval);
	    emit artist(candidateArtist.nowval);
	    break found;
	 }
      }
   }
}

const PRG2 = prg2();

hiphop module prg(resolve) {
   inout artist, playlist, exit;
   abort (exit.now) {
      fork {
	 run PRG2() { * };
      } par {
	 every (artist.now) {
	    pragma { mach.outbuf += ("***ARTIST*** " + artist.nowval) + "\n" };
	 }
      } par {
	 every (playlist.now) {
	    pragma { mach.outbuf += ("***PLAYLIST*** " + playlist.nowval) + "\n" };
	 }
      }
   }
   pragma { resolve(false); }
}

export const mach = new hh.ReactiveMachine(prg);
mach.outbuf = "";
mach.batchPromise = new Promise((res, rej) => mach.init(res));
mach.react();
setTimeout(() => mach.react({exit: true}), 200);
