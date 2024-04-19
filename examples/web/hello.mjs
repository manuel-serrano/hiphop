import { mach } from "./abro.mjs";

mach.addEventListener("O", e => console.log(e.nowval));

mach.react();
mach.react({ A: undefined });
mach.react({ B: undefined });
mach.react({ B: undefined });
mach.react({ R: undefined });
mach.react({ A: undefined, B: undefined });
mach.react();
