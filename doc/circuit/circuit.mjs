/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/doc/circuit/circuit.mjs       */
/*    -------------------------------------------------------------    */
/*    Author      :  Manuel Serrano                                    */
/*    Creation    :  Fri Jan  9 18:26:39 2026                          */
/*    Last change :  Wed Jan 14 12:16:33 2026 (serrano)                */
/*    Copyright   :  2026 Manuel Serrano                               */
/*    -------------------------------------------------------------    */
/*    Svg circuits                                                     */
/*=====================================================================*/

/*---------------------------------------------------------------------*/
/*    The module                                                       */
/*---------------------------------------------------------------------*/
export { css, and, or, assig, reg, named, k0, seq, pause, emit, loop };

import * as gate from "./gate.mjs";
import { getId, getStyle } from "./gate.mjs";
import * as path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

/*---------------------------------------------------------------------*/
/*    css ...                                                          */
/*---------------------------------------------------------------------*/
const css = path.join(dirname(fileURLToPath(import.meta.url)), "circuit.css");

/*---------------------------------------------------------------------*/
/*    SVG ...                                                          */
/*---------------------------------------------------------------------*/
function SVG(...nodes) {
   return nodes.filter(n => n.svg).map(n => n.svg).join("");
}

/*---------------------------------------------------------------------*/
/*    and ...                                                          */
/*---------------------------------------------------------------------*/
function and(attrs, X, Y, Z) {
   const stroke = attrs.stroke;
   const x = attrs?.x ?? 0;
   const y = attrs?.y ?? 0;

   const lm = 45;
   const km = 20;
   const andw = attrs?.width ?? 60;
   const width = andw + 2*lm + 2*km;
   const height = 40;
   const connectm = 8;

   const g = gate.and({ stroke, width: andw }, x + km + lm, y);
   const xw = gate.wireM({ stroke, label: X, anchor: "l", dot: attrs.X === false ? "not" : "" }, [x + lm, g.y + connectm], [g.x, null]);
   const yw = gate.wireM({ stroke, label: Y, anchor: "l", dot: attrs.Y === false ? "not" : "" }, [x + lm, g.ly - connectm], [g.x, null]);
   const zw = gate.wireM({ stroke, label: Z, anchor: "r" }, [g.lx, g.outy], [width - lm, null]);

   const svg = SVG(g, xw, yw, zw);

   return { svg, x, y, width, height };
}

/*---------------------------------------------------------------------*/
/*    or ...                                                           */
/*---------------------------------------------------------------------*/
function or(attrs, X, Y, Z) {
   const stroke = attrs.stroke;
   const x = attrs?.x ?? 0;
   const y = attrs?.y ?? 0;

   const lm = 45;
   const km = 20;
   const andw = attrs?.width ?? 60;
   const width = andw + 2*lm + 2*km;
   const height = 40;
   const connectm = 8;

   const g = gate.or({ stroke, width: andw }, x + km + lm, y);
   const xw = gate.wireM({ stroke, label: X, anchor: "l", dot: attrs.X === false ? "not" : "" }, [x + lm, g.y + connectm], [g.x + 8, null]);
   const yw = gate.wireM({ stroke, label: Y, anchor: "l", dot: attrs.Y === false ? "not" : "" }, [x + lm, g.ly - connectm], [g.x + 8, null]);
   const zw = gate.wireM({ stroke, label: Z, anchor: "r" }, [g.lx, g.outy], [width - lm, null]);

   const svg = SVG(g, xw, yw, zw);

   return { svg, x, y, width, height };
}

/*---------------------------------------------------------------------*/
/*    assig ...                                                        */
/*---------------------------------------------------------------------*/
function assig(attrs, X, Z) {
   const stroke = attrs.stroke;
   const x = attrs?.x ?? 0;
   const y = attrs?.y ?? 0;

   const lm = 45;
   const km = 20;
   const andw = attrs?.width ?? 60;
   const width = andw + 2*lm + 2*km;
   const height = 40;
   const connectm = 8;

   const g = gate.assig({ stroke, width: andw }, x + km + lm, y);
   const xw = gate.wireM({ stroke, label: X, anchor: "l", dot: attrs.X === false ? "not" : "" }, [x + lm, g.outy], [g.x, null]);
   const zw = gate.wireM({ stroke, label: Z, anchor: "r" }, [g.lx, g.outy], [width - lm, null]);

   const svg = SVG(g, xw, zw);

   return { svg, x, y, width, height };
}

/*---------------------------------------------------------------------*/
/*    reg ...                                                          */
/*---------------------------------------------------------------------*/
function reg(attrs, X, Z) {
   const stroke = attrs.stroke;
   const x = attrs?.x ?? 0;
   const y = attrs?.y ?? 0;

   const lm = 45;
   const km = 20;
   const andw = attrs?.width ?? 60;
   const width = andw + 2*lm + 2*km;
   const height = 40;
   const connectm = 8;

   const g = gate.reg({ stroke, width: andw }, x + km + lm, y);
   const xw = gate.wireM({ stroke, label: X, anchor: "l", dot: attrs.X === false ? "not" : "" }, [x + lm, g.outy], [g.x, null]);
   const zw = gate.wireM({ stroke, label: Z, anchor: "r" }, [g.lx, g.outy], [width - lm, null]);

   const svg = SVG(g, xw, zw);

   return { svg, x, y, width, height };
}

/*---------------------------------------------------------------------*/
/*    named ...                                                        */
/*---------------------------------------------------------------------*/
function named(attrs, x, y) {
   if (typeof attrs !== "object") {
      throw new TypeError("named: bad attributes " + attrs);
   }

   const margin = attrs?.margin ?? "   ";
   const name = attrs?.name ?? "P";
   const width = attrs?.width ?? 150;
   const height = attrs?.height ?? 200;
   const padding = width / 15;
   const stroke = attrs.stroke;

   const ins = ["go", "res", "susp", "kill", ""];
   const outs = ["sel", "k0", "k1", "k2", "..."];
   const wires = [];

   const circuit = { width, height, x, y, lx: x + width, ly: y + height };

   let b = attrs.wire
      ? { x: x + 10, y: x + 10, lx: x + width - 10, ly: y + width - 10, width: width - 20, height: height - 20 }
      : { x: x, y: y, lx: x + width, ly: y + width, width, height };

   ins.forEach((t, i) => circuit[t] =
      { X: b.x, Y: b.y + (b.height/(ins.length + 1))*(i+1) });
   
   outs.forEach((t, i) => circuit[t] =
      { X: b.x + b.width, Y: b.y + (b.height/(outs.length + 1))*(i+1) });

   ["e", "e2"].forEach((t, i) => circuit[t] = {
      x: b.x  + (b.width * (i + 1) * (1/3)), y: b.y + 15 });

   if (attrs.wire) {
      wires.push(gate.wireM({ class: "e", stroke }, [circuit.e.x, 0], [null, b.x]));
      wires.push(gate.wireM({ class: "e", stroke }, [circuit.e2.x, 0], [null, b.x]));
      wires.push(gate.wireM({ class: "go", stroke }, [0, circuit.go.Y], [b.x, null]));
      wires.push(gate.wireM({ class: "res", stroke }, [0, circuit.res.Y], [b.x, null]));
      wires.push(gate.wireM({ class: "susp", stroke }, [0, circuit.susp.Y], [b.x, null]));
      wires.push(gate.wireM({ class: "kill", stroke }, [0, circuit.kill.Y], [b.x, null]));
      wires.push(gate.wireM({ class: "sel", stroke }, [b.lx, circuit.sel.Y], [width, null]));
      wires.push(gate.wireM({ class: "k0", stroke }, [b.lx, circuit.k0.Y], [width, null]));
      wires.push(gate.wireM({ class: "k1", stroke }, [b.lx, circuit.k1.Y], [width, null]));
      wires.push(gate.wireM({ class: "k2", stroke }, [b.lx, circuit.k2.Y], [width, null]));
   }

   circuit.svg = `${margin}<g`
      + getId(attrs)
      + ` style="${getStyle(attrs)}"`
      + ">\n"
      + `${margin}   <path class="${attrs.class ?? "circuit"}" d="m ${b.x},${b.y} ${b.width},0 0,${b.height} -${b.width},0 Z"/>\n`
      + `${margin}</g>\n`
      + `${margin}<text class="circuit-name" x="${x + width/2}" y="${y + height/2}" text-anchor="middle" dominant-baseline="middle">${name}</text>\n`
      + ins.map((t, i) => `${margin}<text class="${t}" x="${b.x + padding}" y="${circuit[t].Y}" text-anchor="start" dominant-baseline="middle">${t.toUpperCase()}</text>\n`).join("")
      + outs.map((t, i) => `${margin}<text class="${t}" x="${b.lx - padding}" y="${circuit[t].Y}" text-anchor="end" dominant-baseline="middle">${t.toUpperCase()}</text>\n`).join("")
      + `${margin}<text class="E" x="${circuit.e.x}" y="${b.y + 15}" text-anchor="middle" dominant-baseline="middle">E</text>\n`
      + `${margin}<text class="E" x="${circuit.e2.x}" y="${b.y + 15}" text-anchor="middle" dominant-baseline="middle">E'</text>\n`
      + wires.map(w => w.svg).join("");

   return circuit;
}

/*---------------------------------------------------------------------*/
/*    k0 ...                                                           */
/*---------------------------------------------------------------------*/
function k0(attrs) {
   const margin = attrs?.margin ?? "   ";
   const stroke = attrs.stroke;
   
   const lm = 45;
   const km = 20;
   const x = attrs?.x ?? 0;
   const y = attrs?.y ?? 0;
   const width = 350;
   const height = 300;
   const regSize = 30;
   const assigSize = 30;
   const connectm = 8;

   const assigx = x + width/2 - assigSize;
   // E
   const ex = lm*2;
   const ey = 15;

   const esl = 1*width/2 - assigSize/2 - ex;
   const esr = 1*width/2 - assigSize/2;
   const e = gate.label({ stroke, class: "E", baseline: "text-bottom" }, "E", ex, ey);
   const e2 = gate.label({ stroke, class: "E2", baseline: "text-bottom" }, "E'", width - ex, ey);
   const e_gw = 30;
   const e_g = gate.assig({ stroke, class: "E", width: e_gw }, assigx, ey + e_gw/2);
   
   const e_w = gate.wireM({ stroke, class: "E" }, [e.x, e.y + 2], [null, e_g.outy], [e_g.x, null]);
   const e2_w = gate.wireM({ stroke, class: "E" }, [e_g.lx, e_g.outy], [e2.x, null], [null, e2.y + 2]);
   
   // go
   const gox = lm;
   const goy = km*5;
   const go_g = gate.assig({ stroke, class: "k0" }, assigx, goy - assigSize/2);
   const go_w = gate.wireM({ stroke, class: "go", label: "GO", anchor: "l" }, [gox, goy], [go_g.x, null]);
   
   // res
   const resx = gox;
   const resy = goy + (km*2);
   const res_w = gate.wireM({ stroke, class: "res", label:"RES", anchor: "l" }, [resx, resy]);

   // susp
   const suspx = gox;
   const suspy = goy + (km*4);
   const susp_w = gate.wireM({ stroke, class: "susp", label:"SUSP", anchor: "l" }, [suspx, suspy]);
   
   // kill
   const killx = gox;
   const killy = goy + (km*6);
   const kill_w = gate.wireM({ stroke, class: "kill", label:"KILL", anchor: "l" }, [killx, killy]);

   // sel
   const selx = width - lm;
   const sely = km*5;

   const sel_g = gate.assig({ stroke, class: "sel" }, selx - km*2 - assigSize/2, sely - assigSize/2);
   const sel_w = gate.wireM({ stroke, class: "sel", label: "SEL", anchor: "r" }, [sel_g.lx, sel_g.outy], [selx, null]);
   const sel0_w = gate.wireM({ stroke, class: "sel", label: "0", anchor: "l" }, [sel_g.x - km, sel_g.outy], [sel_g.x, null]);

   // k0
   const k0x = width - lm;
   const k0y = km*7;
   const k0_w = gate.wireM({ stroke, class: "k0", label: "K0", anchor: "r" }, [go_g.lx, go_g.outy], [go_g.lx + km, null], [null, k0y], [k0x, null]);

   // k1
   const k1x = width - lm;
   const k1y = km*9;

   const k1_g = gate.assig({ stroke, class: "k1" }, k1x - km*2 - assigSize/2, k1y - assigSize/2);
   const k1_w = gate.wireM({ stroke, class: "k1", label: "K1", anchor: "r" }, [k1_g.lx, k1_g.outy], [k1x, null]);
   const k10_w = gate.wireM({ stroke, class: "k1", label: "0", anchor: "l" }, [k1_g.x - km, k1_g.outy], [k1_g.x, null]);

   // k2
   const k2x = width - lm;
   const k2y = km*11;

   const k2_g = gate.assig({ stroke, class: "k2" }, k2x - km*2 - assigSize/2, k2y - assigSize/2);
   const k2_w = gate.wireM({ stroke, class: "k2", label: "K2", anchor: "r" }, [k2_g.lx, k2_g.outy], [k2x, null]);
   const k20_w = gate.wireM({ stroke, class: "k2", label: "0", anchor: "l" }, [k2_g.x - km, k2_g.outy], [k2_g.x, null]);

   // dot
   const dotx = width - lm;
   const doty = km*13;

   const dot_g = gate.assig({ stroke, class: "dot" }, dotx - km*2 - assigSize/2, doty - assigSize/2);
   const dot_w = gate.wireM({ stroke, class: "dot", label: "...", anchor: "r" }, [dot_g.lx, dot_g.outy], [dotx, null]);
   const dot0_w = gate.wireM({ stroke, class: "dot", label: "0", anchor: "l" }, [dot_g.x - km, dot_g.outy], [dot_g.x, null]);

   // surrounding box
   const surrounding = attrs.box
      ? { svg: `${margin}<g`
	 + getId(attrs, "box seq")
	 + ` style="${getStyle(attrs)}"`
	 + ">\n"
	 + `${margin}   <path class="circuit" d="m ${x},${y} ${width},0 0,${height} -${width},0 Z"/>\n`
	 + `${margin}</g>\n` }
      : false;

   const svg = SVG(e, e2, e_w, e_g, e2_w,
		   go_g, go_w, k0_w,
		   res_w, susp_w, kill_w, 
		   sel_g, sel_w, sel0_w,
		   k1_g, k1_w, k10_w,
		   k2_g, k2_w, k20_w, dot_g, dot_w, dot0_w,
		   surrounding);

   return { svg, x, y, width, height, lx: x + width, ly: y + height };
}

/*---------------------------------------------------------------------*/
/*    seq ...                                                          */
/*---------------------------------------------------------------------*/
function seq(attrs, P, Q) {
   const margin = attrs?.margin ?? "   ";
   const stroke = attrs.stroke;

   const lm = 45;
   const km = 20;
   const x = attrs?.x ?? 0;
   const y = attrs?.y ?? 0;
   const cm = 180 + x;
   const p = (typeof P === "string") ? named({ stroke, name: P, margin }, cm, y + km*3) : P;
   const q = (typeof Q === "string") ? named({ stroke, name: Q, margin }, cm, y + p.ly + km*3) : Q;
   const selww = 50;
   const outgx = p.width * 1.3;
   const width = (p.width * 3) + outgx + selww - 20;
   const height = (p.height + q.height) + km*7;
   const connectm = 8;

   // go
   const go_w = gate.wire({ stroke, class: "GO", label: "GO" }, [x + lm, p.go.Y], [p.go.X - (x + lm), 0]);

   // res
   const pRes_w = gate.wire({ stroke, class: "RES", label: "RES" }, [x + lm, p.res.Y], [p.res.X - (x + lm), 0]);
   const qRes_w = gate.wire({ stroke, class: "RES", dot: "branch" }, [p.res.X - 3*km, p.res.Y], [0, q.res.Y - p.res.Y], [q.res.X - (p.x - 3*km), 0]);

   // susp
   const pSusp_w = gate.wire({ stroke, class: "SUSP", label: "SUSP" }, [x + lm, p.susp.Y], [p.susp.X - (x + lm), 0]);
   const qSusp_w = gate.wire({ stroke, class: "SUSP", dot: "branch" }, [p.susp.X - 4*km, p.susp.Y], [0, q.susp.Y - p.susp.Y], [q.susp.X - (p.x - 4*km), 0]);

   // kill
   const pKill_w = gate.wire({ stroke, class: "KILL", label: "KILL" }, [x + lm, p.kill.Y], [p.susp.X - (x + lm), 0]);
   const qKill_w = gate.wire({ stroke, class: "KILL", dot: "branch" }, [p.kill.X - 5*km, p.kill.Y], [0, q.kill.Y - p.kill.Y], [q.kill.X - (p.x - 5*km), 0]);

   // sel
   const sel_g = gate.or({ stroke, class: "seq-sel" }, p.sel.X + outgx, p.sel.Y - 8);
   const sel_w= gate.wire({ stroke, class: "sel-wire", label: "SEL", anchor: "r" }, [sel_g.x + sel_g.width, sel_g.y + sel_g.height/2], [selww, 0]);
   
   // p.sel -> sel
   const pSel_w = gate.wire({ stroke, class: "p-to-sel" }, [p.sel.X, p.sel.Y], [outgx + 8, 0]);
   // q.sel -> sel
   const qSel_w = gate.wire({ stroke, class: "q-to-sel" }, [q.sel.X, q.sel.Y], [km*3, 0], [0, -(q.sel.Y - p.sel.Y - (sel_g.height - 8 * 2))], [outgx - (km*3) + 8, 0]);

   // p.k0 -> q.go
   const k0a = [p.k0.X, p.k0.Y];
   const k0b = [km, 0];
   const k0c = [0, p.height - p.k0.y + km];
   const k0d = [-(p.width + 2 * km), 0];
   const k0e = [0, q.go.Y - (k0a[1] + k0c[1])];
   const k0f = [km, 0];

   const pk0_w = gate.wireM({ stroke, class: "k0-to-go" }, [p.k0.X, p.k0.Y], [p.k0.X + km, null], [null, p.ly + km], [q.x - km, null], [null, q.go.Y], [q.go.X, null]);
   
   // E
   const ex = lm*2;
   const ey = 15;
   const e = gate.label({ stroke, class: "E", baseline: "text-bottom" }, "E", ex, ey);
   const ep_w = gate.wireM({ stroke, class: "E"}, [e.x, e.y + 2], [null, p.y - km], [p.e.x, null], [null, p.y]);
   
   const e2 = gate.label({ stroke, class: "E", baseline: "text-bottom" }, "E'", width - e.x, e.y);
   const e_g = gate.or({ stroke, class: "seq-e" }, p.lx + km*4, p.y - km - connectm);
   const e_w = gate.wireM({ stroke, class: "E" }, [p.e2.x, p.y], [null, p.y - km], [e_g.x + 8, e_g.y + connectm]);
   const ep2_w = gate.wireM({ stroke, class: "E" }, [e_g.lx, e_g.outy], [e2.x, null], [null, e2.y + 2]);

   const eq_w = gate.wireM({ stroke, class: "E", dot: "branch" }, [p.x - 2*km, p.y - km], [null, q.y - km], [q.e.x, null], [null, q.y]);
   const eq2_w = gate.wireM({ stroke, class: "E", id: "q-to-E'" }, [q.e2.x, q.y], [null, q.y - km], [q.lx + 2*km, null], [null, e_g.ly - connectm], [e_g.x + 8, null]);

   // k0
   const qk0_w = gate.wire({ stroke, class: "k0", label: "K0", anchor: "r" }, [q.k0.X, q.k0.Y], [km * 4, 0], [0, (p.y + p.height) - q.k0.Y], [outgx + selww + e_g.width - (km * 4), 0]);

   // k1
   const k1_g = gate.or({ stroke, class: "k1" }, p.k1.X + outgx, q.y - 10);
   const k1_w= gate.wire({ stroke, class: "k1", label: "K1", anchor: "r" }, [k1_g.x + k1_g.width, k1_g.y + k1_g.height/2], [selww, 0]);
   const pk1_w = gate.wire({ stroke, class: "k1" }, [p.k1.X, p.k1.Y], [7*km, 0], [0, k1_g.y - p.k1.Y + 8], [k1_g.x + 8 - (p.k1.X + 7*km), 0]);
   const qk1_w = gate.wire({ stroke, class: "k1" }, [q.k1.X, q.k1.Y], [5*km, 0], [0, (k1_g.y - (q.k1.Y + 8)) + k1_g.height], [k1_g.x + 8 - (q.k1.X + 5*km), 0]);
   
   // k2
   const k2_g = gate.or({ stroke, class: "k2" }, p.k2.X + outgx, q.k0.Y - 10);
   const k2_w= gate.wire({ stroke, class: "k2", label: "K2", anchor: "r" }, [k2_g.x + k2_g.width, k2_g.y + k2_g.height/2], [selww, 0]);
   const pk2_w = gate.wire({ stroke, class: "k2" }, [p.k2.X, p.k2.Y], [6*km, 0], [0, k2_g.y - p.k2.Y + 8], [k2_g.x + 8 - (p.k2.X + 6*km), 0]);
   const qk2_w = gate.wire({ stroke, class: "k2" }, [q.k2.X, q.k2.Y], [8*km, 0], [0, k2_g.y - (q.k2.Y + 8) + k2_g.height], [k2_g.x + 8 - (q.k2.X + 8*km), 0]);

   // surrounding box
   const surrounding = attrs.box
      ? { svg: `${margin}<g`
	 + getId(attrs, "circuit seq")
	 + ` style="${getStyle(attrs)}"`
	 + ">\n"
	 + `${margin}   <path class="circuit" d="m ${x},${y} ${width},0 0,${height} -${width},0 Z"/>\n`
	 + `${margin}</g>\n` }
      : false;

   const svg = SVG(p, q,
		   e, e2, e_g, e_w, ep_w, ep2_w, eq_w, eq2_w,
		   go_w,
		   pRes_w, qRes_w,
		   pSusp_w, qSusp_w,
		   pKill_w, qKill_w,
		   sel_g, sel_w, pSel_w, qSel_w,
		   qk0_w,
		   k1_g, k1_w, pk1_w, qk1_w,
		   k2_g, k2_w, pk2_w, qk2_w,
		   pk0_w,
		   surrounding);

   return { svg, x, y, width, height, lx: x + width, ly: y + height };
}

/*---------------------------------------------------------------------*/
/*    pause ...                                                        */
/*---------------------------------------------------------------------*/
function pause(attrs) {
   const margin = attrs?.margin ?? "   ";
   const stroke = attrs.stroke;
   
   const lm = 45;
   const km = 20;
   const marginLeft = 100;
   const x = attrs?.x ?? 0;
   const y = attrs?.y ?? 0;
   const width = 600;
   const height = 300;
   const regSize = 30;
   const assigSize = 30;
   const connectm = 8;

   // E
   const ex = lm*3;
   const ey = 15;

   const esl = 1*width/3 - assigSize/2 - lm;
   const esr = 2*width/3 - assigSize/2 - lm;
   const e = gate.label({ stroke, class: "E", baseline: "text-bottom" }, "E", ex, ey);
   const e2 = gate.label({ stroke, class: "E2", baseline: "text-bottom" }, "E'", width - ex, ey);
   const e_gw = 30;
   const e_g = gate.assig({ stroke, class: "E", width: e_gw }, ex + esl, ey + e_gw/2);
   
   const e_w = gate.wireM({ stroke, class: "E" }, [e.x, e.y + 2], [null, e_g.outy], [e_g.x, null]);
   const e2_w = gate.wireM({ stroke, class: "E" }, [e_g.lx, e_g.outy], [e2.x, null], [null, e2.y + 2]);
   
   // go
   const gox = lm;
   const goy = km*5;
   
   // res
   const resx = lm;
   const resy = goy + km*2;
   
   // susp
   const suspx = lm;
   const suspy = goy + km*4;
   
   // kill
   const killx = lm;
   const killy = goy + km*6;

   // go_and_not_kill
   const go_and_not_kill = gate.and({ stroke }, marginLeft + km, killy + 20);
   
   // susp_and_not_kill
   const susp_and_not_kill = gate.and({ stroke }, marginLeft + km, suspy - connectm);
   const go_w = gate.wireM({ stroke, class: "go", dot: "branch" },
			   [gox + km, goy],
			   [null, go_and_not_kill.ly - connectm],
			   [go_and_not_kill.x, null]);

   const susp_w = gate.wireM({ stroke, class: "susp", label: "SUSP", anchor: "l" }, [suspx, suspy], [susp_and_not_kill.x, null]);
   const kill1_w = gate.wireM({ stroke, class: "kill", label: "KILL", anchor: "l", dot: "not" }, [killx, killy], [susp_and_not_kill.x - km, null], [null, susp_and_not_kill.ly - connectm], [susp_and_not_kill.x, null]);
   const kill2_w = gate.wireM({ stroke, class: "kill", dot: "branch" }, [killx + 2*km, killy], [null, killy + km + connectm]);
   const kill3_w = gate.wireM({ stroke, class: "kill", dot: "not" }, [kill2_w.x, kill2_w.ly], [go_and_not_kill.x, null]);
			    
   // OR
   const orX = marginLeft + (go_and_not_kill.width*2) + 5*km;
   const orY = go_and_not_kill.y + (susp_and_not_kill.ly  - go_and_not_kill.y - (regSize/2)) / 2;
   const OR = gate.or({ stroke }, orX, orY);
   const OR_w = gate.wireM({ stroke, class: "toreg" }, [OR.lx, OR.outy], [OR.lx + km, null]);

   const go_and_not_kill_w = gate.wireM({ stroke, class: "go_and_not_kill" },
					[go_and_not_kill.lx, go_and_not_kill.outy],
					[OR.x - km, null],
					[null, OR.ly - connectm],
					[OR.x + 8, null]);
   // susp_and_not_kill_and_reg
   const andX = marginLeft + (susp_and_not_kill.width*1) + 3*km;
   const susp_and_not_kill_and_reg = gate.and({ stroke }, andX, susp_and_not_kill.outy - connectm);
   const susp_and_not_kill_w = gate.wireM({ stroke, class: "susp" },
					  [susp_and_not_kill.lx, susp_and_not_kill.outy],
					  [susp_and_not_kill_and_reg.x, null]);
   const susp_and_not_kill_and_reg_w = gate.wireM({ stroke, class: "susp_and_not_kill_and_reg" },
						  [susp_and_not_kill_and_reg.lx, susp_and_not_kill_and_reg.outy],
						  [susp_and_not_kill_and_reg.lx + km, null],
						  [null, OR.y + connectm],
						  [OR.x + 8, null]);
      
   // reg
   const reg = gate.reg({ stroke, width: regSize, id: attrs.id ? attrs.id + "-reg" : false }, OR_w.lx, OR.y);
   
   const k0_gx = (reg.lx) + km*6;
   const k0_gy = resy - connectm;
   const k0_g = gate.and({ stroke }, k0_gx, k0_gy);
   
   const reg_w = gate.wireM({ stroke, class: "reg" }, [reg.lx, reg.outy], [reg.lx + km*3, null], [null, k0_g.ly - connectm], [k0_gx, null]);
   const reg2_wh = (reg.outy) - (susp_and_not_kill.ly) + km;
   const reg2_wx = reg.lx + km;
   const reg2_wy = reg.outy
   const reg2_w = gate.wireM({ stroke, class: "susp", dot: "branch" },
			     [reg2_wx, reg2_wy],
			     [null, reg2_wy + reg2_wh],
			     [susp_and_not_kill_and_reg.x - km, null],
			     [null, susp_and_not_kill_and_reg.ly - connectm],
			     [susp_and_not_kill_and_reg.x, null]);

   // k0
   const k0_w = gate.wireM({ stroke, class: "k0", label: "K0", anchor: "r" }, [k0_g.lx, k0_g.outy], [width - lm, null]);
   const res_w = gate.wireM({ stroke, class: "res", label: "RES", anchor: "l" }, [resx, resy], [k0_g.x, null]);

   // k1
   const assig_g = gate.assig({ stroke, class: "go", height: assigSize }, ex + esl, goy - assigSize/2);
   const go2_w = gate.wireM({ stroke, class: "go", label: "GO", anchor: "l" }, [gox, goy], [assig_g.x, null]);
   const k1_w = gate.wireM({ stroke, class: "k1", label: "K1", anchor: "r" }, [assig_g.lx, assig_g.outy], [assig_g.lx + lm, null], [null, k0_g.outy + lm], [width - lm, null]);

   // selw
   const sel_x = width - (reg.lx + km*2) - lm;
   const sel_y = goy;
   const sel_w = gate.wireM({ stroke, class: "sel", label: "SEL", anchor: "r", dot: "branch" }, [reg.lx + km*2, reg.outy], [null, sel_y], [width - lm, null]);
   
   // surrounding box
   const surrounding = attrs.box
      ? { svg: `${margin}<g`
	 + getId(attrs, "box seq")
	 + ` style="${getStyle(attrs)}"`
	 + ">\n"
	 + `${margin}   <path class="circuit" d="m ${x},${y} ${width},0 0,${height} -${width},0 Z"/>\n`
	 + `${margin}</g>\n` }
      : false;

   const svg = SVG(e, e2, e_w,
		   e_g,
		   e2_w,
		   go_w, go2_w, assig_g, k1_w,
		   go_and_not_kill, go_and_not_kill_w,
		   res_w, 
		   susp_and_not_kill, susp_w, susp_and_not_kill_w,
		   kill1_w, kill2_w, kill3_w,
		   OR, OR_w, susp_and_not_kill_and_reg, susp_and_not_kill_and_reg_w,
		   reg, reg_w, reg2_w,
		   sel_w, 
		   k0_g, k0_w,
		   surrounding);

   return { svg, x, y, width, height, lx: x + width, ly: y + height };
}

/*---------------------------------------------------------------------*/
/*    emit ...                                                         */
/*---------------------------------------------------------------------*/
function emit(attrs) {
   const margin = attrs?.margin ?? "   ";
   const stroke = attrs.stroke;
   
   const lm = 45;
   const km = 20;
   const x = attrs?.x ?? 0;
   const y = attrs?.y ?? 0;
   const width = 350;
   const height = 300;
   const regSize = 30;
   const assigSize = 30;
   const connectm = 8;

   const assigx = x + width/2 - assigSize;
   // E
   const ex = lm*2;
   const ey = 15;

   const esl = 1*width/2 - assigSize/2 - ex;
   const esr = 1*width/2 - assigSize/2;
   const e = gate.label({ stroke, class: "E", baseline: "text-bottom" }, "E", ex, ey);
   const e2 = gate.label({ stroke, class: "E2", baseline: "text-bottom" }, "E'", width - ex, ey);
   const e_gw = 30;
   const e_g = gate.assig({ stroke, class: "E", width: e_gw }, assigx, ey + e_gw/2);
   
   const e_w = gate.wireM({ stroke, class: "E" }, [e.x, e.y + 2], [null, e_g.outy], [e_g.x, null]);
   const e2_w = gate.wireM({ stroke, class: "E" }, [e_g.lx, e_g.outy], [e2.x, null], [null, e2.y + 2]);
   
   const s = gate.label({ stroke, class: "s", baseline: "text-bottom" }, "s", width - ex + lm/3, ey);

   // go
   const gox = lm;
   const goy = km*5;
   const go_g = gate.assig({ stroke, class: "k0" }, assigx, goy - assigSize/2);
   const go_w = gate.wireM({ stroke, class: "go", label: "GO", anchor: "l" }, [gox, goy], [go_g.x, null]);
   const s_w = gate.wireM({ stroke, class: "s", "dot": "branch" },
			  [go_g.lx + 10, go_g.outy],
			  [null, go_g.outy - 2*km],
			  [s.x, null],
			  [null, s.y + 2]);
   
   // res
   const resx = gox;
   const resy = goy + (km*2);
   const res_w = gate.wireM({ stroke, class: "res", label: "RES", anchor: "l" }, [resx, resy]);

   // susp
   const suspx = gox;
   const suspy = goy + (km*4);
   const susp_w = gate.wireM({ stroke, class: "susp", label: "SUSP", anchor: "l" }, [suspx, suspy]);
   
   // kill
   const killx = gox;
   const killy = goy + (km*6);
   const kill_w = gate.wireM({ stroke, class: "kill", label: "KILL", anchor: "l" }, [killx, killy]);

   // sel
   const selx = width - lm;
   const sely = km*5;

   const sel_g = gate.assig({ stroke, class: "sel" }, selx - km*2 - assigSize/2, sely - assigSize/2);
   const sel_w = gate.wireM({ stroke, class: "sel", label: "SEL", anchor: "r" }, [sel_g.lx, sel_g.outy], [selx, null]);
   const sel0_w = gate.wireM({ stroke, class: "sel", label: "0", anchor: "l" }, [sel_g.x - km, sel_g.outy], [sel_g.x, null]);

   // k0
   const k0x = width - lm;
   const k0y = km*7;
   const k0_w = gate.wireM({ stroke, class: "k0", label: "K0", anchor: "r" }, [go_g.lx, go_g.outy], [go_g.lx + km, null], [null, k0y], [k0x, null]);

   // k1
   const k1x = width - lm;
   const k1y = km*9;

   const k1_g = gate.assig({ stroke, class: "k1" }, k1x - km*2 - assigSize/2, k1y - assigSize/2);
   const k1_w = gate.wireM({ stroke, class: "k1", label: "K1", anchor: "r" }, [k1_g.lx, k1_g.outy], [k1x, null]);
   const k10_w = gate.wireM({ stroke, class: "k1", label: "0", anchor: "l" }, [k1_g.x - km, k1_g.outy], [k1_g.x, null]);

   // k2
   const k2x = width - lm;
   const k2y = km*11;

   const k2_g = gate.assig({ stroke, class: "k2" }, k2x - km*2 - assigSize/2, k2y - assigSize/2);
   const k2_w = gate.wireM({ stroke, class: "k2", label: "K2", anchor: "r" }, [k2_g.lx, k2_g.outy], [k2x, null]);
   const k20_w = gate.wireM({ stroke, class: "k2", label: "0", anchor: "l" }, [k2_g.x - km, k2_g.outy], [k2_g.x, null]);

   // dot
   const dotx = width - lm;
   const doty = km*13;

   const dot_g = gate.assig({ stroke, class: "dot" }, dotx - km*2 - assigSize/2, doty - assigSize/2);
   const dot_w = gate.wireM({ stroke, class: "dot", label: "...", anchor: "r" }, [dot_g.lx, dot_g.outy], [dotx, null]);
   const dot0_w = gate.wireM({ stroke, class: "dot", label: "0", anchor: "l" }, [dot_g.x - km, dot_g.outy], [dot_g.x, null]);

   // surrounding box
   const surrounding = attrs.box
      ? { svg: `${margin}<g`
	 + getId(attrs, "box seq")
	 + ` style="${getStyle(attrs)}"`
	 + ">\n"
	 + `${margin}   <path class="circuit" d="m ${x},${y} ${width},0 0,${height} -${width},0 Z"/>\n`
	 + `${margin}</g>\n` }
      : false;

   const svg = SVG(e, e2, e_w, e_g, e2_w,
		   go_g, go_w, k0_w,
		   res_w, susp_w, kill_w, 
		   sel_g, sel_w, sel0_w,
		   k1_g, k1_w, k10_w,
		   k2_g, k2_w, k20_w, dot_g, dot_w, dot0_w,
		   s, s_w,
		   surrounding);

   return { svg, x, y, width, height, lx: x + width, ly: y + height };
}

/*---------------------------------------------------------------------*/
/*    loop ...                                                         */
/*---------------------------------------------------------------------*/
function loop(attrs, P) {
   const margin = attrs?.margin ?? "   ";
   const stroke = attrs.stroke;

   const lm = 45;
   const km = 20;
   const x = attrs?.x ?? 0;
   const y = attrs?.y ?? 0;
   const cm = 180 + x;
   const p = (typeof P === "string") ? named({ stroke, name: P, margin }, cm, y + km*3) : P;
   const q = named({ stroke, name: "Q", margin }, cm, y + p.ly + km*3);
   const selww = 50;
   const outgx = p.width * 1.3;
   const width = (p.width * 2) + outgx;
   const height = (p.height) + km*4;
   const connectm = 8;
   const assigSize = 30;

   // go
   const dummy_g = gate.or({ stroke, class: "go" }, 0, 0);
   const or_g = gate.or({ stroke, class: "go" }, x + lm + 2*km, p.go.Y - dummy_g.height + connectm);
   const go_w = gate.wireM({ stroke, class: "GO", label: "GO" }, [x + lm, p.go.Y], [or_g.x + 8, or_g.ly - connectm]);
   const or_w = gate.wireM({ stroke, class: "GO" }, [or_g.lx, or_g.outy], [or_g.lx + lm/2, null], [null, p.go.Y], [p.go.X, null]);

   // res
   const pRes_w = gate.wire({ stroke, class: "RES", label: "RES" }, [x + lm, p.res.Y], [p.res.X - (x + lm), 0]);

   // susp
   const pSusp_w = gate.wire({ stroke, class: "SUSP", label: "SUSP" }, [x + lm, p.susp.Y], [p.susp.X - (x + lm), 0]);

   // kill
   const pKill_w = gate.wire({ stroke, class: "KILL", label: "KILL" }, [x + lm, p.kill.Y], [p.susp.X - (x + lm), 0]);

   // sel
   const sel_w = gate.wireM({ stroke, class: "sel", label: "SEL", anchor: "r" }, [p.sel.X, p.sel.Y], [width - lm, null]);

   // p.k0 -> q.go
   
   // E
   const ex = lm*2;
   const ey = 15;
   const e = gate.label({ stroke, class: "E", baseline: "text-bottom" }, "E", ex, ey);
   const ep_w = gate.wireM({ stroke, class: "E"}, [e.x, e.y + 2], [null, p.y - 2*km], [p.e.x, null], [null, p.y]);
   
   const e2 = gate.label({ stroke, class: "E", baseline: "text-bottom" }, "E'", width - e.x, e.y);
   const ep2_w = gate.wireM({ stroke, class: "E" }, [p.e2.x, p.y], [null, p.y - 2*km], [e2.x, null], [null, e2.y + 2]);

   // k0
   const k0x = width - lm;
   const k0y = km*7;
   const k0_g = gate.assig({ stroke, class: "k0" }, k0x - km*2 - assigSize/2, k0y - assigSize/2);
   const k0_w = gate.wireM({ stroke, class: "k0", label: "K0", anchor: "r" }, [k0_g.lx, k0_g.outy], [k0x, null]);
   const k00_w = gate.wireM({ stroke, class: "k0", label: "0", anchor: "l" }, [k0_g.x - km, k0_g.outy], [k0_g.x, null]);

   const k0loop_w = gate.wireM({ stroke, class: "k0" },
			       [p.k0.X, p.k0.Y],
			       [p.k0.X + km, null],
			       [null, p.y - km],
			       [or_g.x - km, null],
			       [null, or_g.y + connectm],
			       [or_g.x + 8, null]);

   // k1
   const k1_w = gate.wireM({ stroke, class: "k1", label: "K1", anchor: "r" }, [p.k1.X, p.k1.Y], [width - lm, null]);
   
   // k2
   const k2_w = gate.wireM({ stroke, class: "k2", label: "K2", anchor: "r" }, [p.k2.X, p.k2.Y], [width - lm, null]);

   // surrounding box
   const surrounding = attrs.box
      ? { svg: `${margin}<g`
	 + getId(attrs, "circuit seq")
	 + ` style="${getStyle(attrs)}"`
	 + ">\n"
	 + `${margin}   <path class="circuit" d="m ${x},${y} ${width},0 0,${height} -${width},0 Z"/>\n`
	 + `${margin}</g>\n` }
      : false;

   const svg = SVG(p,
		   e, e2, ep_w, ep2_w,
		   go_w, or_w,
		   pRes_w,
		   pSusp_w,
		   pKill_w,
		   sel_w,
		   k1_w,
		   k2_w,
		   k0_g, k0_w, k00_w,
		   or_g, k0loop_w,
		   surrounding);

   return { svg, x, y, width, height, lx: x + width, ly: y + height };
}
