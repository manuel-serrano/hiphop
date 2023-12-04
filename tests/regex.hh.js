"use @hop/hiphop";
"use hopscript";

import * as hh from "@hop/hiphop";

hiphop module prg() {
   host { mach.outbuf += "b]a".match(/[ab]/)[0] + "\n"; }
   host { mach.outbuf += "b]a".match(/b]a/)[0] + "\n"; }
   host { mach.outbuf += "baaa".match(/[ab]*/)[0] + "\n"; }
   host { mach.outbuf += "baaaXfoo".match(/[ab]*Xfoo/g)[0] + "\n"; }
   host { mach.outbuf += "baaa\\foo".match(/[ab]*\\foo/)[0] + "\n"; }
   host { mach.outbuf += "baaa/gee".match(/[ab]*\/gee/)[0] + "\n"; }
   host { mach.outbuf += "baaa/hux".match(/[ab]*[/]hux$/)[0] + "\n"; }
}

export const mach = new hh.ReactiveMachine(prg, "regex");
mach.outbuf = "";

mach.react();
