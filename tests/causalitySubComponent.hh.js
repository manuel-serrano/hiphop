"use @hop/hiphop"
"use hopscript"

import * as hh from "@hop/hiphop";

hiphop module RRNode1() {
   in Req1, Initial1, TokenIn1, PrevNok1;
   out TokenOut1, Ok1, Nok1;
   signal Try1;
 //  if (TokenIn1.pre) emit TokenOut1();
   if (TokenIn1.pre || PrevNok1.now) emit Try1();
   if (Try1.now && Req1.now) emit Ok1();
   if (Try1.now && !Req1.now ) emit Nok1();
}

hiphop module RRNode2() {
   in Req2, Initial2, TokenIn2, PrevNok2;
   out TokenOut2, Ok2, Nok2;
   signal Try2;
 // if (TokenIn2.pre) emit TokenOut2();
   if (TokenIn2.pre || PrevNok2.now) emit Try2();
   if (Try2.now && Req2.now) emit Ok2();
   if (Try2.now && !Req2.now ) emit Nok2();
}




/*
hiphop module RR (in Req1, in Req2, in Req3,
		 out Ok1, out Ok2, out Ok3) {
    signal Initial1, Initial2, Initial3,
           TokenIn1, TokenIn2, TokenIn3, 
           TokenOut1, TokenOut2, TokenOut3,
       PrevNok1, PrevNok2, PrevNok3,
           Nok1, Nok2, Nok3;
   emit Initial1();
   fork { 
      run RRNode (Initial as Initial1, Req as Req1,
		 TokenIn as TokenIn1, PrevNok as PrevNok1,
		 TokenOut as TokenOut1, Ok as Ok1, Nok as Nok1);
   } par {
      run RRNode (Initial as Initial2, Req as Req2,
		 TokenIn as TokenIn2, PrevNok as PrevNok2,
		 TokenOut as TokenOut2, Ok as Ok2, Nok as Nok2);

   } par {
      run RRNode (Initial as Initial3, Req as Req3,
		 TokenIn as TokenIn3, PrevNok as PrevNok3,
		 TokenOut as TokenOut3, Ok as Ok3, Nok3 as Nok3);
   } par {
      if (TokenOut1.now) emit TokenIn2();
   } par {
      if (TokenOut2.now) emit TokenIn3();
   } par {
      if (TokenOut3.now) emit TokenIn1();
   } par {
      if (Nok1.now) emit PrevNok2();
   } par {
      if (Nok2.now) emit PrevNok3();
   } par {
      if (Nok3.now) emit PrevNok1();
   }
}
*/

hiphop module RR() {
   in Req1; in Req2;
   out Ok1; out Ok2;
   signal Initial1, Initial2,
	  TokenIn1, TokenIn2,
	  TokenOut1, TokenOut2,
	  PrevNok1, PrevNok2,
	  Nok1, Nok2;
//   emit Initial1();
   fork { 
      run RRNode1() { Initial1,  Req1,
		      TokenIn1,  PrevNok1,
		      TokenOut1, Ok1, Nok1 };
   } par {
      run RRNode2() { Initial2, Req2,
		      TokenIn2,PrevNok2,
		      TokenOut2,  Ok2,  Nok2 };
   } par {
      if (TokenOut1.now) emit TokenIn2();
   } par {
      if (TokenOut2.now) emit TokenIn1();
   } par {
      if (Nok1.now) emit PrevNok2();
   } par {
      if (Nok2.now) emit PrevNok1();
   }
}

export const mach = new hh.ReactiveMachine(RR, { verbose: -1 });
mach.outbuf = "";
try {
    mach.react();
} catch( e ) { 
    mach.outbuf += ( "causality error" ) + "\n";
}
