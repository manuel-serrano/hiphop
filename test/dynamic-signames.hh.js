import { ReactiveMachine } from "@hop/hiphop";

let outbuf = "";

function foo() {
   outbuf += "in foo\n";
   return "BBB";
}

function bar() {
   outbuf += "in bar\n";
   return "BBB";
}

hiphop module prg() {
   in AAA, BBB;

   if (AAA.now && this[bar()].now) {
      pragma { mach.outbuf += (outbuf + "yep "+ AAA.nowval + ", " + this[foo()].nowval + "\n"); }
   }
}

export const mach = new ReactiveMachine(prg);
mach.outbuf = "";

mach.react({AAA: 1, BBB: 2});
 
