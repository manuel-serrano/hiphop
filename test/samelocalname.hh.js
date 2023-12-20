import * as hh from "@hop/hiphop";
import { format } from "util";

hiphop module prg() {
   in SAME = 1;
   emit SAME( 2 );
   
   pragma { mach.outbuf += ( "1: " + SAME.nowval ) + "\n" }
   {
      signal S1=5, SAME=10;
      pragma { mach.outbuf += ( "before2: " + SAME.nowval ) + "\n"; }
      pragma { mach.outbuf += ( "before2bis: " + SAME.nowval ) + "\n"; }
      {
	 signal SAME=100;
	 pragma { mach.outbuf += ( "2: " + SAME.nowval ) + "\n"; }
      }

      pragma { mach.outbuf += ( "after2: " + SAME.nowval ) + "\n"; }
   }

   pragma { mach.outbuf += ( "3: " + SAME.nowval ) + "\n" }
}

export const mach = new hh.ReactiveMachine( prg );
mach.outbuf = "";
mach.react();
