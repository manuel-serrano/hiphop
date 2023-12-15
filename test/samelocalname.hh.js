"use @hop/hiphop"
"use hopscript"

import * as hh from "@host/hiphost";
import { format } from "util";

hiphop module prg() {
   in SAME = 1;
   emit SAME( 2 );
   
   host { mach.outbuf += ( "1: " + SAME.nowval ) + "\n" }
   {
      signal S1=5, SAME=10;
      host { mach.outbuf += ( "before2: " + SAME.nowval ) + "\n"; }
      host { mach.outbuf += ( "before2bis: " + SAME.nowval ) + "\n"; }
      {
	 signal SAME=100;
	 host { mach.outbuf += ( "2: " + SAME.nowval ) + "\n"; }
      }

      host { mach.outbuf += ( "after2: " + SAME.nowval ) + "\n"; }
   }

   host { mach.outbuf += ( "3: " + SAME.nowval ) + "\n" }
}

export const mach = new hh.ReactiveMachine( prg );
mach.outbuf = "";
mach.react();
