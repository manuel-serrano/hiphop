/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/doc/circuit/example.mjs       */
/*    -------------------------------------------------------------    */
/*    Author      :  manuel serrano                                    */
/*    Creation    :  Fri Jan  9 09:49:26 2026                          */
/*    Last change :  Wed Jan 14 13:49:41 2026 (serrano)                */
/*    Copyright   :  2026 manuel serrano                               */
/*    -------------------------------------------------------------    */
/*    An example of circuit                                            */
/*=====================================================================*/

/*---------------------------------------------------------------------*/
/*    The module                                                       */
/*---------------------------------------------------------------------*/
import { writeFileSync, existsSync, renameSync, unlinkSync } from "node:fs";
import { svg, xml } from "./svg.mjs";
import { named, k0, seq , pause, loop, emit } from "./circuit.mjs";

const n = named({ stroke: "green", box: true, name: "", wire: true }, 0, 0);
writeFileSync("named.svg", xml(svg({width: n.width + n.x, height: n.height + n.y}, n)));

const e = emit({ stroke: "green", box: true, name: "", wire: true, x: 100, y: 200 });
writeFileSync("emit.svg", xml(svg({width: e.width + e.x, height: e.height + e.y}, e)));

const k = k0({ stroke: "#ff00cc", box: true, x: 30, y: 10 }, 0, 0);
writeFileSync("k.svg", xml(svg({width: k.width + k.x, height: k.height + k.y}, k)));

const s = seq({ stroke: "blue", box: true, x: 100, y: 10 }, "P", "Q");
writeFileSync("seq.svg", xml(svg({width: s.width + s.x, height: s.height + s.y}, s)));

const p = pause({ stroke: "red", box: true, x: 200, y: 300 });
writeFileSync("pause.svg", xml(svg({width: p.width + p.x, height: p.height + p.y}, p)));

const l = loop({ stroke: "magenta", box: true, x: 30, y: 50 }, "P");
writeFileSync("loop.svg", xml(svg({width: l.width + l.x, height: l.height + l.y}, l)));

const es = emit({ stroke: "green", box: true, x: 500, y: 200 });
const sp = pause({ stroke: "blue", box: true, x: es.x, y: es.ly + 70});
const ss = seq({ stroke: "magenta", box: true, x: es.x - 250, y: es.y - 100}, es, sp);
const sl = loop({ stroke: "orange", class: "sustain-loop", box: true, x: ss.x - 200, y: ss.y - 100}, ss);
			 
writeFileSync("sustain.svg", xml(svg({width: sl.width + sl.x, height: sl.height + sl.y}, sl)));

   
