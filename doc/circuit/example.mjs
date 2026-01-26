/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/doc/circuit/example.mjs       */
/*    -------------------------------------------------------------    */
/*    Author      :  manuel serrano                                    */
/*    Creation    :  Fri Jan  9 09:49:26 2026                          */
/*    Last change :  Mon Jan 26 11:11:41 2026 (serrano)                */
/*    Copyright   :  2026 manuel serrano                               */
/*    -------------------------------------------------------------    */
/*    An example of circuit                                            */
/*=====================================================================*/

/*---------------------------------------------------------------------*/
/*    The module                                                       */
/*---------------------------------------------------------------------*/
import { writeFileSync, existsSync, renameSync, unlinkSync } from "node:fs";
import { svg, xml } from "./svg.mjs";
import { named, kn, seq, par, pause, loop, emit, prog } from "./circuit.mjs";

const n = named({ stroke: "green", box: true, name: "", wire: true }, 0, 0);
writeFileSync("named.svg", xml(svg({width: n.width + n.x, height: n.height + n.y}, n)));

const e = emit({ stroke: "green", box: true, name: "", wire: true, x: 100, y: 200 });
writeFileSync("emit.svg", xml(svg({width: e.width + e.x, height: e.height + e.y}, e)));

const k = kn({ stroke: "#ff00cc", box: true, x: 30, y: 10 }, 0, 0);
writeFileSync("k.svg", xml(svg({width: k.width + k.x, height: k.height + k.y}, k)));

const s = seq({ stroke: "blue", box: true, x: 100, y: 10 }, "P", "Q");
writeFileSync("seq.svg", xml(svg({width: s.width + s.x, height: s.height + s.y}, s)));

const p = pause({ stroke: "red", box: true, x: 200, y: 300 });
writeFileSync("pause.svg", xml(svg({width: p.width + p.x, height: p.height + p.y}, p)));

const l = loop({ stroke: "magenta", box: true, x: 30, y: 50 }, "P");
writeFileSync("loop.svg", xml(svg({width: l.width + l.x, height: l.height + l.y}, l)));

const a = par({ stroke: "darkorange", synchronizer: "orig", box: true, x: 30, y: 50 }, "P", "Q");
writeFileSync("par.svg", xml(svg({width: a.width + a.x, height: a.height + a.y}, a)));

const es = emit({ stroke: "green", box: true, x: 500, y: 200 });
const sp = pause({ stroke: "blue", box: true, x: es.x, y: es.ly + 70});
const ss = seq({ stroke: "magenta", box: true, x: es.x - 250, y: es.y - 100}, es, sp);
const sl = loop({ stroke: "orange", class: "sustain-loop", box: true, x: ss.x - 200, y: ss.y - 100}, ss);
			 
writeFileSync("sustain.svg", xml(svg({width: sl.width + sl.x, height: sl.height + sl.y}, sl)));

   
const ze = emit({ stroke: "orange", class: "sustain-emit", box: true, x: 500, y: 200 });
const zn = kn({ stroke: "magenta", class: "sustain-nothing", box: true, x: ze.x + 200, y: ze.ly + 130});
const zy = pause({ stroke: "blue", class: "sustain-pause", box: true, x: zn.x, y: zn.ly + 100});
const zp = par({ stroke: "green", class: "sustain-par", box: true, x: ze.x, y: zn.y - 100}, zn, zy);
const zs = seq({ stroke: "red", class: "sustain-seq", box: true, x: ze.x - 250, y: ze.y - 100}, ze, zp);
const zl = loop({ stroke: "cyan", class: "sustain-loop", box: true, x: zs.x - 200, y: zs.y - 100}, zs);
writeFileSync("schizo.svg", xml(svg({width: zl.width + zl.x, height: zl.height + zl.y}, zl)));

const zp2 = par({ stroke: "green", class: "sustain-par", synchronizer: "new", box: true, x: ze.x, y: zn.y - 100, }, zn, zy);
const zs2 = seq({ stroke: "red", class: "sustain-seq", box: true, x: ze.x - 250, y: ze.y - 100}, ze, zp2);
const zl2 = loop({ stroke: "cyan", class: "sustain-loop", box: true, x: zs2.x - 200, y: zs2.y - 100}, zs2);
writeFileSync("schizo2.svg", xml(svg({width: zl2.width + zl2.x, height: zl2.height + zl2.y}, zl2)));

const pr = prog({stroke: "#3388cc", box: true, x: 200, y: 100}, "P");
writeFileSync("prog.svg", xml(svg({width: pr.width + pr.x, height: pr.height + pr.y}, pr)));
