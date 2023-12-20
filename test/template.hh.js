"use @hop/hiphop";
"use hopscript";

import * as hh from "@hop/hiphop";

hiphop module prg() {
   pragma { mach.outbuf += `1:AAA\n` }
   pragma { mach.outbuf += `2:BBB{\n` }
   pragma { mach.outbuf += `3:CCC{{CCC\n` }
   pragma { mach.outbuf += `4:DD$\n` }
   pragma { mach.outbuf += `5:DD$$\n` }
   pragma { mach.outbuf += `6:DD$$D\n` }
   pragma { mach.outbuf += `7:DD$$D{\n` }
   pragma { mach.outbuf += `8:DD$$D{$\n` }
   pragma { mach.outbuf += `9:E${1}\n` }
   pragma { mach.outbuf += `10:EE${12}\n` }
   pragma { mach.outbuf += `11:${12}${34}\n` }
   pragma { mach.outbuf += `12:${13}${35}111\n` }
   pragma { mach.outbuf += `13:${154}010${36}112\n` }
   pragma { mach.outbuf += `14:${16}0x0${377}1243\n` }
   pragma { mach.outbuf += `15:GGG$${125}000${38888}111\n` }
   pragma { mach.outbuf += `16:HHW$$${1233}0-0${3999}1d11\n` }
}

export const mach = new hh.ReactiveMachine(prg, "template");
mach.outbuf = "";

   
   
   
