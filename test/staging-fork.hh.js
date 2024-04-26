import * as hh from "@hop/hiphop";
import { format } from "util";

const Instruments = [ "violin", "piano", "trumpet", "sax" ];

function makeAwait(instruments) {
   return hiphop fork ${ instruments.map(val => hiphop {
      await (this[`${val}IN`].nowval);
      emit ${`${val}OUT`}(${val});
   }) }
}

hiphop module prg() {
   in ... ${ Instruments.map(i => `${i}IN`) };
   out ... ${ Instruments.map(i => `${i}OUT`) };
			
   ${ makeAwait(Instruments) }
}

export const mach = new hh.ReactiveMachine(prg);
mach.outbuf = "";
mach.debug_emitted_func = emitted => {
   mach.outbuf += format(emitted) + "\n";
}

mach.react();
mach.react({ violinIN: true, saxIN: true });
mach.react({ pianoIN: true });
mach.react()
