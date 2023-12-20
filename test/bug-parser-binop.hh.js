"use @hop/hiphop"
"use hopscript"

import { ReactiveMachine } from "@hop/hiphop";

hiphop module prg() {
   pragma { ; }
}

export const mach = new ReactiveMachine(prg);

// the parser used to fail because after the parsing of the template
// `red` the parser cursor was positioned after the ']' character.
if ("red" in mach) {
   console.log("should not be here");
}

