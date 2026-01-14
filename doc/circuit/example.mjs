/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/doc/circuit/example.mjs       */
/*    -------------------------------------------------------------    */
/*    Author      :  manuel serrano                                    */
/*    Creation    :  Fri Jan  9 09:49:26 2026                          */
/*    Last change :  Wed Jan 14 06:47:15 2026 (serrano)                */
/*    Copyright   :  2026 manuel serrano                               */
/*    -------------------------------------------------------------    */
/*    An example of circuit                                            */
/*=====================================================================*/

/*---------------------------------------------------------------------*/
/*    The module                                                       */
/*---------------------------------------------------------------------*/
import { writeFileSync, existsSync, renameSync, unlinkSync } from "node:fs";
import { svg, xml } from "./svg.mjs";
import { named, k0, seq , pause } from "./circuit.mjs";

const n = named({ stroke: "green", box: true, name: "", wire: true }, 0, 0);
writeFileSync("named.svg", xml(svg({width: n.width + n.x, height: n.height + n.y}, n)));

const k = k0({ stroke: "#ff00cc", box: true }, 0, 0);
writeFileSync("k.svg", xml(svg({width: k.width + k.x, height: k.height + k.y}, k)));

const s = seq({ stroke: "blue", box: true }, "P", "Q");
writeFileSync("seq.svg", xml(svg({width: s.width + s.x, height: s.height + s.y}, s)));

const p = pause({ stroke: "red", box: true });
writeFileSync("pause.svg", xml(svg({width: p.width + p.x, height: p.height + p.y}, p)));
