/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/doc/circuit/circuit.mjs       */
/*    -------------------------------------------------------------    */
/*    Author      :  Manuel Serrano                                    */
/*    Creation    :  Fri Jan  9 18:26:39 2026                          */
/*    Last change :  Wed Jan 21 07:03:39 2026 (serrano)                */
/*    Copyright   :  2026 Manuel Serrano                               */
/*    -------------------------------------------------------------    */
/*    Svg circuits                                                     */
/*=====================================================================*/

/*---------------------------------------------------------------------*/
/*    The module                                                       */
/*---------------------------------------------------------------------*/
export { css, and, or, assig, reg, named, kn, seq, par, pause, emit, loop };

import * as gate from "./gate.mjs";
import { getId, getStyle, getClass } from "./gate.mjs";
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
   const xw = gate.wire({ stroke, label: X, anchor: "l", dot: attrs.X === false ? "-o" : "" }, [x + lm, g.y + connectm], [g.x, null]);
   const yw = gate.wire({ stroke, label: Y, anchor: "l", dot: attrs.Y === false ? "-o" : "" }, [x + lm, g.ly - connectm], [g.x, null]);
   const zw = gate.wire({ stroke, label: Z, anchor: "r", dot: attrs.Z === false ? "o-" : "" }, [g.lx, g.outy], [width - lm, null]);

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
   const xw = gate.wire({ stroke, label: X, anchor: "l", dot: attrs.X === false ? "-o" : "" }, [x + lm, g.y + connectm], [g.x + 8, null]);
   const yw = gate.wire({ stroke, label: Y, anchor: "l", dot: attrs.Y === false ? "-o" : "" }, [x + lm, g.ly - connectm], [g.x + 8, null]);
   const zw = gate.wire({ stroke, label: Z, anchor: "r", dot: attrs.Z === false ? "o-" : "" }, [g.lx, g.outy], [width - lm, null]);

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
   const xw = gate.wire({ stroke, label: X, anchor: "l", dot: attrs.X === false ? "-o" : "" }, [x + lm, g.outy], [g.x, null]);
   const zw = gate.wire({ stroke, label: Z, anchor: "r" }, [g.lx, g.outy], [width - lm, null]);

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
   const xw = gate.wire({ stroke, label: X, anchor: "l", dot: attrs.X === false ? "-o" : "" }, [x + lm, g.outy], [g.x, null]);
   const zw = gate.wire({ stroke, label: Z, anchor: "r" }, [g.lx, g.outy], [width - lm, null]);

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
   const height = attrs?.height ?? 250;
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
      wires.push(gate.wire({ class: getClass(attrs, "e"), stroke }, [circuit.e.x, 0], [null, b.x]));
      wires.push(gate.wire({ class: getClass(attrs, "e"), stroke }, [circuit.e2.x, 0], [null, b.x]));
      wires.push(gate.wire({ class: getClass(attrs, "go"), stroke }, [0, circuit.go.Y], [b.x, null]));
      wires.push(gate.wire({ class: getClass(attrs, "res"), stroke }, [0, circuit.res.Y], [b.x, null]));
      wires.push(gate.wire({ class: getClass(attrs, "susp"), stroke }, [0, circuit.susp.Y], [b.x, null]));
      wires.push(gate.wire({ class: getClass(attrs, "kill"), stroke }, [0, circuit.kill.Y], [b.x, null]));
      wires.push(gate.wire({ class: getClass(attrs, "sel"), stroke }, [b.lx, circuit.sel.Y], [width, null]));
      wires.push(gate.wire({ class: getClass(attrs, "k0"), stroke }, [b.lx, circuit.k0.Y], [width, null]));
      wires.push(gate.wire({ class: getClass(attrs, "k1"), stroke }, [b.lx, circuit.k1.Y], [width, null]));
      wires.push(gate.wire({ class: getClass(attrs, "k2"), stroke }, [b.lx, circuit.k2.Y], [width, null]));
   }

   circuit.svg = `${margin}<g`
      + getId(attrs, "circuit named")
      + ` style="${getStyle(attrs)}"`
      + ">\n"
      + `${margin}   <path class="${getClass(attrs, "named")}" d="m ${b.x},${b.y} ${b.width},0 0,${b.height} -${b.width},0 Z"/>\n`
      + `${margin}</g>\n`
      + `${margin}<text class="circuit-name" x="${x + width/2}" y="${y + height/2}" text-anchor="middle" dominant-baseline="middle">${name}</text>\n`
      + ins.map((t, i) => `${margin}<text class="${t}" x="${b.x + padding}" y="${circuit[t].Y}" text-anchor="start" dominant-baseline="middle">${t.toUpperCase()}</text>\n`).join("")
      + outs.map((t, i) => `${margin}<text class="${t === "..." ? "etc" : t}" x="${b.lx - padding}" y="${circuit[t].Y}" text-anchor="end" dominant-baseline="middle">${t.toUpperCase()}</text>\n`).join("")
      + `${margin}<text class="E" x="${circuit.e.x}" y="${b.y + 15}" text-anchor="middle" dominant-baseline="middle">E</text>\n`
      + `${margin}<text class="E" x="${circuit.e2.x}" y="${b.y + 15}" text-anchor="middle" dominant-baseline="middle">E'</text>\n`
      + wires.map(w => w.svg).join("");

   return circuit;
}

/*---------------------------------------------------------------------*/
/*    kn ...                                                           */
/*---------------------------------------------------------------------*/
function kn(attrs) {
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

   const classE = getClass(attrs, "e");
   const classGO = getClass(attrs, "go");
   const classRES = getClass(attrs, "res");
   const classSUSP = getClass(attrs, "susp");
   const classKILL = getClass(attrs, "kill");
   const classSEL = getClass(attrs, "sel");
   const classK0 = getClass(attrs, "k0");
   const classK1 = getClass(attrs, "k1");
   const classK2 = getClass(attrs, "k2");
   const classETC = getClass(attrs, "etc");
   
   const assigx = x + width/2 - assigSize;
   // E
   const ex = x + lm*2;
   const ey = y + 15;

   const e2x = x + (width - lm*2);
   const e2y = ey;

   const esl = 1*width/2 - assigSize/2 - ex;
   const esr = 1*width/2 - assigSize/2;
   const e = gate.label({ stroke, class: classE, baseline: "text-bottom" }, "E", ex, ey);
   const e2 = gate.label({ stroke, class: getClass(attrs, "e2"), baseline: "text-bottom" }, "E'", e2x, e2y);
   const e_gw = 30;
   const e_g = gate.assig({ stroke, class: classE, width: e_gw }, assigx, ey + e_gw/2);
   
   const e_w = gate.wire({ stroke, class: classE }, [e.x, e.y + 2], [null, e_g.outy], [e_g.x, null]);
   const e2_w = gate.wire({ stroke, class: classE }, [e_g.lx, e_g.outy], [e2.x, null], [null, e2.y + 2]);
   
   // go
   const gox = x + lm;
   const goy = y + km*5;
   const go_g = gate.assig({ stroke, class: classK0 }, assigx, goy - assigSize/2);
   const go_w = gate.wire({ stroke, class: classGO, label: "GO", anchor: "l" }, [gox, goy], [go_g.x, null]);
   
   // res
   const resx = gox;
   const resy = goy + (km*2);
   const res_w = gate.wire({ stroke, class: classRES, label:"RES", anchor: "l" }, [resx, resy]);

   // susp
   const suspx = gox;
   const suspy = goy + (km*4);
   const susp_w = gate.wire({ stroke, class: classSUSP, label:"SUSP", anchor: "l" }, [suspx, suspy]);
   
   // kill
   const killx = gox;
   const killy = goy + (km*6);
   const kill_w = gate.wire({ stroke, class: classKILL, label:"KILL", anchor: "l" }, [killx, killy]);

   // sel
   const selx = x + width - lm;
   const sely = y + km*5;

   const sel_g = gate.assig({ stroke, class: classSEL }, selx - km*2 - assigSize/2, sely - assigSize/2);
   const sel_w = gate.wire({ stroke, class: classSEL, label: "SEL", anchor: "r" }, [sel_g.lx, sel_g.outy], [selx, null]);
   const sel0_w = gate.wire({ stroke, class: classSEL, label: "0", anchor: "l" }, [sel_g.x - km, sel_g.outy], [sel_g.x, null]);

   // k0
   const k0x = selx;
   const k0y = sely + km*2;
   const k0_w = gate.wire({ stroke, class: classK0, label: "K0", anchor: "r" }, [go_g.lx, go_g.outy], [go_g.lx + km, null], [null, k0y], [k0x, null]);

   // k1
   const k1x = selx;
   const k1y = sely + km*4;

   const k1_g = gate.assig({ stroke, class: classK1 }, k1x - km*2 - assigSize/2, k1y - assigSize/2);
   const k1_w = gate.wire({ stroke, class: classK1, label: "K1", anchor: "r" }, [k1_g.lx, k1_g.outy], [k1x, null]);
   const k10_w = gate.wire({ stroke, class: classK1, label: "0", anchor: "l" }, [k1_g.x - km, k1_g.outy], [k1_g.x, null]);

   // k2
   const k2x = selx;
   const k2y = sely + km*6;

   const k2_g = gate.assig({ stroke, class: classK2 }, k2x - km*2 - assigSize/2, k2y - assigSize/2);
   const k2_w = gate.wire({ stroke, class: classK2, label: "K2", anchor: "r" }, [k2_g.lx, k2_g.outy], [k2x, null]);
   const k20_w = gate.wire({ stroke, class: classK2, label: "0", anchor: "l" }, [k2_g.x - km, k2_g.outy], [k2_g.x, null]);

   // dot
   const dotx = selx;
   const doty = sely + km*8;

   const dot_g = gate.assig({ stroke, class: classETC }, dotx - km*2 - assigSize/2, doty - assigSize/2);
   const dot_w = gate.wire({ stroke, class: classETC, label: "...", anchor: "r" }, [dot_g.lx, dot_g.outy], [dotx, null]);
   const dot0_w = gate.wire({ stroke, class: classETC, label: "0", anchor: "l" }, [dot_g.x - km, dot_g.outy], [dot_g.x, null]);

   // surrounding box
   const surrounding = attrs.box
      ? { svg: `${margin}<g`
	 + getId(attrs, "circuit box k")
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

   return {
      svg, x, y, width, height, lx: x + width, ly: y + height,
      e: { x: ex, y: ey },
      e2: { x: e2x, y: ey },
      go: { X: gox, Y: goy },
      res: { X: resx, Y: resy },
      susp: { X: suspx, Y: suspy },
      kill: { X: killx, Y: killy },
      sel: { X: selx, Y: sely },
      k0: { X: k0x, Y: k0y },
      k1: { X: k1x, Y: k1y },
      k2: { X: k1x, Y: k1y + lm }
   }
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
   const width = Math.max(p.width, q.width) + km*26;
   const height = q.ly - y + km;
   const connectm = 8;

   const classE = getClass(attrs, "e");
   const classGO = getClass(attrs, "go");
   const classRES = getClass(attrs, "res");
   const classSUSP = getClass(attrs, "susp");
   const classKILL = getClass(attrs, "kill");
   const classSEL = getClass(attrs, "sel");
   const classK0 = getClass(attrs, "k0");
   const classK1 = getClass(attrs, "k1");
   const classK2 = getClass(attrs, "k2");
   
   // dummy
   const dummy_g = gate.or({stroke});
   
   // E
   const ex = x + lm*2;
   const ey = y + 15;

   const e2x = x + (width - lm*2);
   const e2y = ey;
   
   const e = gate.label({ stroke, class: classE, baseline: "text-bottom" }, "E", ex, ey);
   const ep_w = gate.wire({ stroke, class: classE}, [e.x, e.y + 2], [null, p.y - km], [p.e.x, null], [null, p.y]);
   
   const e2 = gate.label({ stroke, class: classE, baseline: "text-bottom" }, "E'", e2x, e2y);
   const e_g = gate.or({ stroke, class: getClass(attrs, "seq-e") }, Math.max(p.lx, q.lx) + km*3, p.y - km - connectm);
   const e_w = gate.wire({ stroke, class: classE }, [p.e2.x, p.y], [null, p.y - km], [e_g.x + 8, e_g.y + connectm]);
   const ep2_w = gate.wire({ stroke, class: classE }, [e_g.lx, e_g.outy], [e2.x, null], [null, e2.y + 2]);

   const eq_w = gate.wire({ stroke, class: classE, dot: "*-" }, [p.x - 2*km, p.y - km], [null, q.y - km], [q.e.x, null], [null, q.y]);
   const eq2_w = gate.wire({ stroke, class: classE, id: "q-to-E'" }, [q.e2.x, q.y], [null, q.y - km], [q.lx + 2*km, null], [null, e_g.ly - connectm], [e_g.x + 8, null]);

   // go
   const gox = x;
   const goy = p.go.Y;
   const go_w = gate.wire({ stroke, class: classGO, label: "GO" }, [x + lm, p.go.Y], [p.x, null]);

   // res
   const resx = x;
   const resy = p.res.Y;
   const pRes_w = gate.wire({ stroke, class: classRES, label: "RES" }, [x + lm, p.res.Y], [p.x, null]);
   const qRes_w = gate.wire({ stroke, class: classRES, dot: "*-" }, [p.x - 3*km, p.res.Y], [null, q.res.Y], [q.x, null]);

   // susp
   const suspx = x;
   const suspy = p.susp.Y;
   const pSusp_w = gate.wire({ stroke, class: classSUSP, label: "SUSP" }, [x + lm, p.susp.Y], [p.x, null])
   const qSusp_w = gate.wire({ stroke, class: classSUSP, dot: "*-" }, [p.x - 4*km, p.susp.Y], [null, q.susp.Y], [q.x, null]);

   // kill
   const killx = x;
   const killy = p.kill.Y;
   const pKill_w = gate.wire({ stroke, class: classKILL, label: "KILL" }, [x + lm, p.kill.Y], [p.x, null]);
   const qKill_w = gate.wire({ stroke, class: classKILL, dot: "*-" }, [p.x - 5*km, p.kill.Y], [null, q.kill.Y], [q.x, null]);

   // sel
   const selx = width + x;
   const sely = p.sel.Y + dummy_g.height/2;
   const sel_g = gate.or({ stroke, class: getClass(attrs, "seq-sel") }, selx -lm - 2*km - dummy_g.width, p.sel.Y - connectm);
   const sel_w = gate.wire({ stroke, class: getClass(attrs, "sel-wire"), label: "SEL", anchor: "r" }, [sel_g.lx, sel_g.outy], [selx - lm, null]);
   
   // p.sel -> sel
   const pSel_w = gate.wire({ stroke, class: getClass(attrs, "p-to-sel") }, [p.lx, p.sel.Y], [sel_g.x + 8, null]);
   // q.sel -> sel
   const qSel_w = gate.wire({ stroke, class: getClass(attrs, "q-to-sel") }, [q.lx, q.sel.Y], [q.sel.X + km*3, null], [null, sel_g.ly - connectm], [sel_g.x + 8, null]);

   // p.k0 -> q.go
   const k0x = x + width;
   const k0y = p.k0.Y + connectm;
   const pk0_w = gate.wire({ stroke, class: getClass(attrs, "k0-to-go") },
			    [p.lx, p.k0.Y],
			    [p.lx + km, null],
			    [null, p.ly + km],
			    [q.x - km, null],
			    [null, q.go.Y],
			    [q.x, null]);
   
   // k0
   const qk0_w = gate.wire({ stroke, class: classK0, label: "K0", anchor: "r" },
			    [q.lx, q.k0.Y],
			    [q.lx + km * 4, null],
			    [null, k0y],
			    [k0x - lm, null]);

   // k1
   const k1x = x + width;
   const k1y = p.k1.Y -connectm + dummy_g.height/2;
   const k1_g = gate.or({ stroke, class: classK1 }, sel_g.x, k1y - dummy_g.height/2);
   const k1_w = gate.wire({ stroke, class: classK1, label: "K1", anchor: "r" }, [k1_g.lx, k1y], [k1x - lm, null]);
   const pk1_w = gate.wire({ stroke, class: classK1 }, [p.lx, p.k1.Y], [k1_g.x + 8, null]);
   const qk1_w = gate.wire({ stroke, class: classK1 },
			    [q.lx, q.k1.Y],
			    [q.lx + 5*km, null],
			    [null, k1_g.ly - connectm],
			    [k1_g.x + 8, null]);
   
   // k2
   const k2x = x + width;
   const k2y = p.k2.Y -connectm + dummy_g.height/2;
   const k2_g = gate.or({ stroke, class: classK2 }, sel_g.x, k2y - dummy_g.height/2);
   const k2_w= gate.wire({ stroke, class: classK2, label: "K2", anchor: "r" }, [k2_g.x + k2_g.width, k2_g.y + k2_g.height/2], [k2x -lm, null]);
   const pk2_w = gate.wire({ stroke, class: classK2 }, [p.lx, p.k2.Y], [k2_g.x + 8, null]);
   const qk2_w = gate.wire({ stroke, class: classK2 },
			    [q.lx, q.k2.Y],
			    [q.lx + 6*km, null],
			    [null, k2_g.ly - connectm],
			    [k2_g.x + 8, null]);

   // surrounding box
   const surrounding = attrs.box
      ? { svg: `${margin}<g`
	 + getId(attrs, "circuit box seq")
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

   return {
      svg, x, y, width, height, lx: x + width, ly: y + height,
      e: { x: ex, y: ey },
      e2: { x: e2x, y: ey },
      go: { X: gox, Y: goy },
      res: { X: resx, Y: resy },
      susp: { X: suspx, Y: suspy },
      kill: { X: killx, Y: killy },
      sel: { X: selx, Y: sely },
      k0: { X: k0x, Y: k0y },
      k1: { X: k1x, Y: k1y },
      k2: { X: k1x, Y: k1y + lm }
   };
}

/*---------------------------------------------------------------------*/
/*    par ...                                                          */
/*---------------------------------------------------------------------*/
function par(attrs, P, Q) {

   function xemOrig() {
      const pemx = Math.max(p.sel.X, q.sel.X) + 8*km;
      const pemy = p.sel.Y;
      const qemx = pemx;
      const qemy = q.sel.Y;
      
      const pem_g = gate.or({ stroke, class: getClass(attrs, "par xem p") }, pemx, pemy - dummy_g.xy);
      const qem_g = gate.or({ stroke, class: getClass(attrs, "par xem q") }, qemx, qemy - dummy_g.xy);
      
      const selPem_w = gate.wire({ stroke, class: getClass(attrs, "par sel xem p") },
				 [p.lx, p.sel.Y],
				 [pem_g.xx, null]);
      const selQem_w = gate.wire({ stroke, class: getClass(attrs, "par sel xem q") },
				 [q.lx, q.sel.Y],
				 [qem_g.xx, null]);

      return {
	 pem_g, qem_g,
	 selPem_w, selQem_w,
	 qPem_w: {}, pQem_w: {},
	 emdot: "o-"
      };
   }
   
   function xemNew() {
      const pemx = Math.max(p.sel.X, q.sel.X) + 8*km;
      const pemy = p.sel.Y;
      const qemx = pemx;
      const qemy = q.sel.Y;
      
      const pem_g = gate.and({ stroke, class: getClass(attrs, "par xem p") }, pemx, pemy - dummy_g.xy);
      const qem_g = gate.and({ stroke, class: getClass(attrs, "par xem q") }, qemx, qemy - dummy_g.xy);
      
      const selPem_w = gate.wire({ stroke, class: getClass(attrs, "par sel xem p"), dot: "-o" },
				 [p.sel.X, p.sel.Y],
				 [pem_g.xx, null]);
      const selQem_w = gate.wire({ stroke, class: getClass(attrs, "par sel xem q"), dot: "-o" },
				 [q.sel.X, q.sel.Y],
				 [qem_g.xx, null]);


      const qPem_w = gate.wire({ stroke, class: getClass(attrs, "par sel xem p"), dot: "*-" },
			       [pem_g.x - 3*km, q.sel.Y],
			       [null, pem_g.outy],
			       [pem_g.xx, null]);
      const pQem_w = gate.wire({ stroke, class: getClass(attrs, "par sel xem q"), dot: "*-" },
			       [qem_g.x - 2*km, p.sel.Y],
			       [null, qem_g.outy],
			       [qem_g.xx, null]);
      return {
	 pem_g, qem_g,
	 selPem_w, selQem_w,
	 qPem_w, pQem_w,
	 emdot: "-"
      };
   }
   
   function xem() {
      const { pem_g, qem_g, selPem_w, selQem_w, qPem_w, pQem_w, emdot } = 
	 (attrs.synchronizer === "new") ? xemNew() : xemOrig();

      const pem_w = gate.wire({ stroke, class: getClass(attrs, "par go xem p"), dot: "*-" },
			      [pGo_w.lx, p.ly + km],
			      [pem_g.x - km, null],
			      [null, pem_g.yy],
			      [pem_g.yx, null]);
      const qem_w = gate.wire({ stroke, class: getClass(attrs, "par go xem q"), dot: "*-" },
			      [qem_g.x - km, p.ly + km],
			      [null, qem_g.yy],
			      [qem_g.yx, null]);

      return {
	 pem_g, qem_g,
	 selPem_w, selQem_w,
	 pem_w, qem_w,
	 qPem_w, pQem_w,
	 emdot
      };
   }

   const margin = attrs?.margin ?? "   ";
   const stroke = attrs.stroke;

   const lm = 45;
   const km = 20;
   const x = attrs?.x ?? 0;
   const y = attrs?.y ?? 0;
   const cm = km * 12;
   const p = (typeof P === "string") ? named({ stroke, name: P, margin }, cm, y + km*5) : P;
   const q = (typeof Q === "string") ? named({ stroke, name: Q, margin }, cm, y + p.ly + km*5) : Q;
   const selww = 50;
   const width = Math.max(p.width, q.width) + km*49;
   const height = q.ly - y + km;
   const connectm = 8;

   const classE = getClass(attrs, "par e");
   const classGO = getClass(attrs, "par go");
   const classRES = getClass(attrs, "par res");
   const classSUSP = getClass(attrs, "par susp");
   const classKILL = getClass(attrs, "par kill");
   const classSEL = getClass(attrs, "par sel");
   const classK0 = getClass(attrs, "par k0");
   const classK0P = getClass(attrs, "par p k0");
   const classK0Q = getClass(attrs, "par q k0");
   const classK1 = getClass(attrs, "par k1");
   const classK1P = getClass(attrs, "par p k1");
   const classK1Q = getClass(attrs, "par q k1");
   const classK2 = getClass(attrs, "par k2");
   const classXEMP = getClass(attrs, "par xem");
   const classXEMQ = getClass(attrs, "par xem");
   const classGOXEMP = getClass(attrs, "par go xem p");
   const classGOXEMQ = getClass(attrs, "par go xem q");
   const classK0XEMP = getClass(attrs, "par k0 xem p");
   const classK0XEMQ = getClass(attrs, "par k0 xem q");
   const classSYNC = getClass(attrs, "par sync");
   const classSYNCK0P = getClass(attrs, "par sync k0 p");
   const classSYNCK0U = getClass(attrs, "par sync k0 u");
   const classSYNCK0Q = getClass(attrs, "par sync k0 q");
   
   // dummy
   const dummy_g = gate.or({stroke}, 0, 0);
   
   // E
   const ex = x + lm*2;
   const ey = y + 15;

   const e2x = x + (width - lm*2);
   const e2y = ey;
   
   const e = gate.label({ stroke, class: classE, baseline: "text-bottom" }, "E", ex, ey);
   const ep_w = gate.wire({ stroke, class: classE}, [e.x, e.y + 2], [null, e.y + km], [p.e.x, null], [null, p.y]);
   
   const e2 = gate.label({ stroke, class: classE, baseline: "text-bottom" }, "E'", e2x, e2y);
   const e_g = gate.or({ stroke, class: getClass(attrs, "par e") }, Math.max(p.lx, q.lx) + km*14, e.y + km - connectm);
   const e_w = gate.wire({ stroke, class: classE }, [p.e2.x, p.y], [null, e.y + km], [e_g.x + 8, e_g.y + connectm]);
   const ep2_w = gate.wire({ stroke, class: classE }, [e_g.lx, e_g.outy], [e2.x, null], [null, e2.y + 2]);

   const eq_w = gate.wire({ stroke, class: classE, dot: "*-" }, [p.x - km, e.y + km], [null, q.y - km], [q.e.x, null], [null, q.y]);
   const eq2_w = gate.wire({ stroke, class: classE, id: "q-to-E'" }, [q.e2.x, q.y], [null, q.y - km], [q.lx + km, null], [null, e_g.ly - connectm], [e_g.x + 8, null]);

   // go
   const gox = x;
   const goy = p.go.Y + km;
   const pGo_w = gate.wire({ stroke, class: classGO, label: "GO", dot: "-*" }, [x + lm, goy], [p.x - 5*km, null]);
   const qGo_w = gate.wire({ stroke, class: classGO }, [p.x, p.go.Y], [p.x - 5*km, null], [null, q.go.Y], [q.x, null]); 

   // res
   const resx = x;
   const resy = goy + 2*km;
   const pRes_w = gate.wire({ stroke, class: classRES, label: "RES", dot: "-*" }, [x + lm, resy], [p.x - 4*km, null]);
   const qRes_w = gate.wire({ stroke, class: classRES }, [p.x, p.res.Y], [p.x - 4*km, null], [null, q.res.Y], [q.x, null]); 


   // susp
   const suspx = x;
   const suspy = goy + 4*km;
   const pSusp_w = gate.wire({ stroke, class: classSUSP, label: "SUSP", dot: "-*" }, [x + lm, suspy], [p.x - 3*km, null]);
   const qSusp_w = gate.wire({ stroke, class: classSUSP }, [p.x, p.susp.Y], [p.x - 3*km, null], [null, q.susp.Y], [q.x, null]); 

   // kill
   const killx = x;
   const killy = goy + 6*km;
   const pKill_w = gate.wire({ stroke, class: classKILL, label: "KILL", dot: "-*" }, [x + lm, killy], [p.x - 2*km, null]);
   const qKill_w = gate.wire({ stroke, class: classKILL }, [p.x, p.kill.Y], [p.x - 2*km, null], [null, q.kill.Y], [q.x, null]); 

   // sel
   const selx = width + x;
   const sely = p.y - dummy_g.yy;

   const sel_g = gate.or({ stroke, class: getClass(attrs, "par sel g") }, e_g.x, sely);
   const sel_w = gate.wire({ stroke, class: getClass(attrs, "par sel"), label: "SEL", anchor: "r" }, [sel_g.lx, sel_g.outy], [selx - lm, null]);
   
   // p.sel -> sel
   const pSel_w = gate.wire({ stroke, class: getClass(attrs, "par sel p"), dot: "*-" },
			    [p.lx + 2*km, p.sel.Y], [null, sel_g.xy], [sel_g.xx, null]);
   // q.sel -> sel
   const qSel_w = gate.wire({ stroke, class: getClass(attrs, "par sel q"), dot: "*-" },
			    [q.lx + 3*km, q.sel.Y], [null, sel_g.yy], [sel_g.yx, null]);

   // xem
   const { pem_g, qem_g, selPem_w, selQem_w, pem_w, qem_w, qPem_w, pQem_w, emdot } = xem();

   // synchronizer
   const pSyncK0_g = gate.or({ stroke, class: getClass(attrs, "par sync psynck0") }, pem_g.lx + 11*km, pem_g.ly + 3*km);
   const pXemSyncK0_w = gate.wire({ stroke, class: getClass(attrs, "par xem synck0 p"), dot: emdot },
				  [pem_g.lx, pem_g.outy],
				  [pem_g.lx + 3*km, null],
				  [null, pSyncK0_g.xy],
				  [pem_g.lx + 4*km, null]);
   const pXemLSyncK0_w = gate.wire({ stroke, class: getClass(attrs, "par sync xem synck0 p"), "label": "p.em" },
				  [pXemSyncK0_w.lx + lm, pXemSyncK0_w.ly],
				  [pSyncK0_g.xx, null]);
   const pK0SyncK0_w = gate.wire({ stroke, class: getClass(attrs, "par k0 synck0 p") },
				 [p.lx, p.k0.Y],
				 [pem_g.lx + 2*km, null],
				 [null, pSyncK0_g.yy],
				 [pXemSyncK0_w.lx, null]);
   const pK0LSyncK0_w = gate.wire({ stroke, class: getClass(attrs, "par sync k0 synck0 p"), "label": "p.K0" },
				  [pXemLSyncK0_w.x, pK0SyncK0_w.ly],
				  [pSyncK0_g.xx, null]);
   const uSyncK0_g = gate.or({ stroke, class: getClass(attrs, "par sync usynck0") }, pSyncK0_g.x, pSyncK0_g.ly + km);
   const pK0uSynck0_w = gate.wire({ stroke, class: getClass(attrs, "par sync k0 synck0 p"), dot: "*-" },
				  [pSyncK0_g.x - km, pSyncK0_g.yy],
				  [null, uSyncK0_g.xy],
				  [uSyncK0_g.xx, null]);

   const qSyncK0_g = gate.or({ stroke, class: getClass(attrs, "par sync qsynck0") }, uSyncK0_g.x, uSyncK0_g.ly + km);
   const qXemSyncK0_w = gate.wire({ stroke, class: getClass(attrs, "par xem qsynck0 q"), dot: emdot },
				  [qem_g.lx, qem_g.outy],
				  [pem_g.lx + 3*km, null],
				  [null, qSyncK0_g.ly - connectm],
				  [pXemSyncK0_w.lx, null]);
   const qXemLSyncK0_w = gate.wire({ stroke, class: getClass(attrs, "par sync xem qsynck0 q"), "label": "q.em" },
				  [pXemSyncK0_w.lx + lm, qXemSyncK0_w.ly],
				  [pSyncK0_g.xx, null]);
   const qK0SyncK0_w = gate.wire({ stroke, class: getClass(attrs, "par k0 synck0 q") },
				 [q.lx, q.k0.Y],
				 [pem_g.lx + 2*km, null],
				 [null, qSyncK0_g.xy],
				 [pK0SyncK0_w.lx, null]);
   const qK0LSyncK0_w = gate.wire({ stroke, class: getClass(attrs, "par sync k0 synck0 q"), "label": "q.K0" },
				  [pK0LSyncK0_w.x, qK0SyncK0_w.ly],
				  [pSyncK0_g.xx, null]);
   const qK0uSynck0_w = gate.wire({ stroke, class: getClass(attrs, "par sync k0 synck0 q"), dot: "*-" },
				  [qSyncK0_g.x - km, qSyncK0_g.xy],
				  [null, uSyncK0_g.yy],
				  [uSyncK0_g.xx, null]);
   
   // k0
   const k0x = x + width;
   const k0y = sel_g.outy + 2*km;
   const k0_g = gate.and({ stroke, class: getClass(attrs, "par sync andk0") }, pSyncK0_g.x + 7*km, pSyncK0_g.ly + km);
   const k0_w = gate.wire({ stroke, class: getClass(attrs, "par andk0 k0"), label: "K0", anchor: "r" },
			  [k0_g.lx, k0_g.outy],
			  [k0_g.lx + 2*km, null],
			  [null, k0y],
			  [k0x - lm, null]);
   const pk0_w = gate.wire({ stroke, class: getClass(attrs, "par sync psynck0 andk0") },
			   [pSyncK0_g.lx, pSyncK0_g.outy],
			   [pSyncK0_g.lx + 3*km, null],
			   [null, k0_g.xy],
			   [k0_g.xx, null]);
   const uk0_w = gate.wire({ stroke, class: getClass(attrs, "par sync usynck0 andk0") },
			   [uSyncK0_g.lx, uSyncK0_g.outy],
			   [k0_g.xx, k0_g.y + k0_g.height/2]);
   const qk0_w = gate.wire({ stroke, class: getClass(attrs, "par sync qsynck0 andk0") },
			   [qSyncK0_g.lx, qSyncK0_g.outy],
			   [qSyncK0_g.lx + 3*km, null],
			   [null, k0_g.yy],
			   [k0_g.xx, null]);
			   
   
   // k1
   const pSyncK1_g = gate.or({ stroke, class: getClass(attrs, "par sync psynck1") }, pSyncK0_g.x, pSyncK0_g.y + 10*km);

   const uSyncK1_g = gate.or({ stroke, class: getClass(attrs, "par sync usynck1") }, pSyncK0_g.x, pSyncK1_g.ly + km);

   const qSyncK1_g = gate.or({ stroke, class: getClass(attrs, "par sync qsynck1") }, pSyncK0_g.x, uSyncK1_g.ly + km);
   
   const k1x = k0x;
   const k1y = k0y + 2*km;
   const k1_g = gate.and({ stroke, class: getClass(attrs, "par sync andk1") }, k0_g.x, pSyncK1_g.ly + km);
   const k1_w = gate.wire({ stroke, class: getClass(attrs, "par andk1 k1"), label: "K1", anchor: "r" },
			  [k1_g.lx, k1_g.outy],
			  [k1_g.lx + 3*km, null],
			  [null, k1y],
			  [k1x - lm, null]);
   const pk1_w = gate.wire({ stroke, class: getClass(attrs, "par sync psynck1 andk1") },
			   [pSyncK1_g.lx, pSyncK1_g.outy],
			   [pSyncK1_g.lx + 3*km, null],
			   [null, k1_g.xy],
			   [k1_g.xx, null]);
   const uk1_w = gate.wire({ stroke, class: getClass(attrs, "par sync usynck1 andk1")  },
			   [uSyncK1_g.lx, uSyncK1_g.outy],
			   [k1_g.xx, k1_g.y + k1_g.height/2]);
   const qk1_w = gate.wire({ stroke, class: getClass(attrs, "par sync qsynck1 andk1") },
			   [qSyncK1_g.lx, qSyncK1_g.outy],
			   [qSyncK1_g.lx + 3*km, null],
			   [null, k1_g.yy],
			   [k1_g.xx, null]);

   const pK1SyncK1_w = gate.wire({ stroke, class: getClass(attrs, "par k1 synck1 p") },
				 [p.lx, p.k1.Y],
				 [pem_g.lx + km, null],
				 [null, pSyncK1_g.yy],
				 [pXemSyncK0_w.lx, null]);
   const pK1LSyncK1_w = gate.wire({ stroke, class: getClass(attrs, "par sync k1 synck1 p"), label: "p.K1" },
				  [pXemSyncK0_w.lx + lm, pSyncK1_g.yy],
				  [pSyncK1_g.xx, null]);
   
   const pSyncK0SyncK1_w = gate.wire({ stroke, class: getClass(attrs, "par sync synck0 p synck1") , dot: "*-" },
				     [pSyncK0_g.lx + 2*km, pSyncK0_g.outy],
				     [null, pSyncK1_g.y - km],
				     [pSyncK1_g.x - 2*km, null],
				     [null, pSyncK1_g.xy],
				     [pSyncK1_g.xx, null]);
   const qSyncK0SyncK1_w = gate.wire({ stroke, class: getClass(attrs, "par sync qsynck0 q qsynck1"), classSYNC, dot: "*-" },
				     [qSyncK0_g.lx + km, qSyncK0_g.outy],
				     [null, pSyncK1_g.y - 2*km],
				     [pSyncK1_g.x - 3*km, null],
				     [null, qSyncK1_g.xy],
				     [pSyncK1_g.xx, null]);
   const qK1SyncK1_w = gate.wire({ stroke, class: getClass(attrs, "par k1 synck1 q") },
				 [q.lx, q.k1.Y],
				 [pem_g.lx + km, null],
				 [null, qSyncK1_g.yy],
				 [pXemSyncK0_w.lx, null]);
   const qK1LSyncK1_w = gate.wire({ stroke, class: getClass(attrs, "par sync k1 qsynck1 q"), label: "q.K1" },
				  [pXemSyncK0_w.lx + lm, qSyncK1_g.yy],
				  [qSyncK1_g.xx, null]);
   
   const pK1uSynck1_w = gate.wire({ stroke, class: getClass(attrs, "par sync k1 usynck1 p"), dot: "*-" },
				  [pSyncK1_g.x - km, pSyncK1_g.yy],
				  [null, uSyncK1_g.xy],
				  [uSyncK1_g.xx, null]);
   const qK1uSynck1_w = gate.wire({ stroke, class: getClass(attrs, "par sync k1 qsynck1 q"), dot: "*-" },
				  [qSyncK1_g.x - km, qSyncK1_g.yy],
				  [null, uSyncK1_g.yy],
				  [uSyncK1_g.xx, null]);
				 
   // k2
   const k2x = x + width;
   const k2y = sel_g.outy + 6*km;

   const syncK2_l = gate.label({ stroke, class: getClass(attrs, "par sync etc") }, "...", pSyncK1_g.x, pSyncK1_g.y + 10*km);
   
   // synchronizer box
   const syncx = pXemSyncK0_w.lx;
   const syncy = pSyncK0_g.y - 10;
   const syncwidth = k0_g.lx - syncx;
   const syncheight = qSyncK1_g.ly - syncy + km * 4;
   const syncm = 10;
   const synchronizer = {
      svg: `${margin}<g`
	 + getId(attrs, "synchronizer")
	 + ` style="${getStyle(attrs)}"`
	 + ">\n"
	 + `${margin}   <path class="synchronizer" d="m ${syncx},${syncy - syncm} ${syncwidth + 2*syncm},0 0,${syncheight + 2*syncm} -${syncwidth + 2*syncm},0 Z"/>\n`
	 + `${margin}   <text class="synchronizer" x="${syncx + syncwidth/2}" y="${syncy - 15}" text-anchor="middle" dominant-baseline="text-bottom">SYNCHRONIZER</text>\n`
	 + `${margin}</g>\n`
   };
   
   // surrounding box
   const surrounding = attrs.box
      ? { svg: `${margin}<g`
	 + getId(attrs, "circuit box par")
	 + ` style="${getStyle(attrs)}"`
	 + ">\n"
	 + `${margin}   <path class="circuit" d="m ${x},${y} ${width},0 0,${height} -${width},0 Z"/>\n`
	 + `${margin}</g>\n` }
      : false;

   const svg = SVG(synchronizer,
		   p, q,
		   e, e2, e_g, e_w, ep_w, ep2_w, eq_w, eq2_w,
		   pGo_w, qGo_w,
		   pRes_w, qRes_w,
		   pSusp_w, qSusp_w,
		   pKill_w, qKill_w,
		   sel_g, sel_w, pSel_w, qSel_w,
		   pem_g, pem_w, selPem_w, pQem_w,
		   qem_g, qem_w, selQem_w, qPem_w,
		   pSyncK0_g, pXemSyncK0_w, pK0SyncK0_w, pXemLSyncK0_w, pK0LSyncK0_w, qK0LSyncK0_w, qXemLSyncK0_w,
		   uSyncK0_g, pK0uSynck0_w, qK0uSynck0_w,
		   qSyncK0_g, qXemSyncK0_w, qK0SyncK0_w,
		   k0_g, k0_w, pk0_w, uk0_w, qk0_w,
		   k1_g, k1_w, pk1_w, uk1_w, qk1_w,
		   pSyncK1_g, pK1SyncK1_w, pSyncK0SyncK1_w, qSyncK0SyncK1_w, qK1SyncK1_w, pK1LSyncK1_w, qK1LSyncK1_w,
		   uSyncK1_g, pK1uSynck1_w, qK1uSynck1_w,
		   qSyncK1_g,
		   syncK2_l,
		   surrounding);

   return {
      svg, x, y, width, height, lx: x + width, ly: y + height,
      e: { x: ex, y: ey },
      e2: { x: e2x, y: ey },
      go: { X: gox, Y: goy },
      res: { X: resx, Y: resy },
      susp: { X: suspx, Y: suspy },
      kill: { X: killx, Y: killy },
      sel: { X: selx, Y: sel_w.y },
      k0: { X: k0x, Y: k0y },
      k1: { X: k1x, Y: k1y },
      k2: { X: k1x, Y: k1y + lm }
   };
}

/*---------------------------------------------------------------------*/
/*    pause ...                                                        */
/*---------------------------------------------------------------------*/
function pause(attrs) {
   const margin = attrs?.margin ?? "   ";
   const stroke = attrs.stroke;
   
   const classE = getClass(attrs, "pause yield e");
   const classGO = getClass(attrs, "pause yield go");
   const classRES = getClass(attrs, "pause yield res");
   const classSUSP = getClass(attrs, "pause yield susp");
   const classKILL = getClass(attrs, "pause yield kill");
   const classSEL = getClass(attrs, "pause yield sel");
   const classK0 = getClass(attrs, "pause yield k0");
   const classK1 = getClass(attrs, "pause yield k1");
   const classK2 = getClass(attrs, "pause yield k2");
   const classREG = getClass(attrs, "pause yield reg");
   
   const lm = 45;
   const km = 20;
   const marginLeft = 100;
   const x = attrs?.x ?? 0;
   const y = attrs?.y ?? 0;
   const width = 650;
   const height = 300;
   const regSize = 30;
   const assigSize = 30;
   const connectm = 8;

   // E
   const ex = x + lm*3;
   const ey = y + 15;

   const e2x = (x + width - lm*3);
   const e2y = ey;

   const esl = 1*width/3 - assigSize/2 - lm;
   const esr = 2*width/3 - assigSize/2 - lm;
   const e = gate.label({ stroke, class: classE, baseline: "text-bottom" }, "E", ex, ey);
   const e2 = gate.label({ stroke, class: classE, baseline: "text-bottom" }, "E'", e2x, e2y);
   const e_gw = 30;
   const e_g = gate.assig({ stroke, class: classE, width: e_gw }, ex + esl, ey + e_gw/2);
   
   const e_w = gate.wire({ stroke, class: classE }, [e.x, e.y + 2], [null, e_g.outy], [e_g.x, null]);
   const e2_w = gate.wire({ stroke, class: classE }, [e_g.lx, e_g.outy], [e2.x, null], [null, e2.y + 2]);
   
   // go
   const gox = x + lm;
   const goy = y + km*5;
   
   // res
   const resx = gox;
   const resy = goy + km*2;
   
   // susp
   const suspx = gox;
   const suspy =goy + km*4;
   
   // kill
   const killx = gox;
   const killy = goy + km*6;

   // go_and_not_kill
   const go_and_not_kill = gate.and({ stroke, class: getClass(attrs, "pause yield go_and_not_kill") }, x + 5*km, killy + 20);
   
   // susp_and_not_kill
   const susp_and_not_kill = gate.and({ stroke, class: getClass(attrs, "pause yield susp_and_not_kill") }, go_and_not_kill.x, suspy - connectm);
   const go_w = gate.wire({ stroke, class: classGO, dot: "*-" },
			   [gox + km, goy],
			   [null, go_and_not_kill.ly - connectm],
			   [go_and_not_kill.x, null]);

   const susp_w = gate.wire({ stroke, class: classSUSP, label: "SUSP", anchor: "l" }, [suspx, suspy], [susp_and_not_kill.x, null]);
   const kill1_w = gate.wire({ stroke, class: classKILL, label: "KILL", anchor: "l", dot: "-o" }, [killx, killy], [susp_and_not_kill.x - km, null], [null, susp_and_not_kill.ly - connectm], [susp_and_not_kill.x, null]);
   const kill2_w = gate.wire({ stroke, class: classKILL, dot: "*-" }, [susp_and_not_kill.x - km, killy], [null, killy + km + connectm]);
   const kill3_w = gate.wire({ stroke, class: classKILL, dot: "-o" }, [kill2_w.x, kill2_w.ly], [go_and_not_kill.x, null]);
			    
   // susp_and_not_kill_and_reg
   const andX = go_and_not_kill.lx + 2*km;
   const susp_and_not_kill_and_reg = gate.and({ stroke, class: getClass(attrs, "pause yield susp_and_not_kill_and_reg") }, andX, susp_and_not_kill.outy - connectm);
   const susp_and_not_kill_w = gate.wire({ stroke, class: classSUSP },
					  [susp_and_not_kill.lx, susp_and_not_kill.outy],
					  [susp_and_not_kill_and_reg.x, null]);
      
   // OR
   const orX = susp_and_not_kill_and_reg.lx + 2*km;
   const orY = go_and_not_kill.y + (susp_and_not_kill.ly  - go_and_not_kill.y - (regSize/2)) / 2;
   const OR = gate.or({ stroke, class: getClass(attrs, "pause yield go_and_not_kill") }, orX, orY);
   const OR_w = gate.wire({ stroke, class: getClass(attrs, "pause yield toreg") }, [OR.lx, OR.outy], [OR.lx + km, null]);

   const go_and_not_kill_w = gate.wire({ stroke, class: getClass(attrs, "pause yield go_and_not_kill") },
					[go_and_not_kill.lx, go_and_not_kill.outy],
					[OR.x - km, null],
					[null, OR.ly - connectm],
					[OR.x + 8, null]);
   const susp_and_not_kill_and_reg_w = gate.wire({ stroke, class: getClass(attrs, "pause yield susp_and_not_kill_and_reg") },
						  [susp_and_not_kill_and_reg.lx, susp_and_not_kill_and_reg.outy],
						  [susp_and_not_kill_and_reg.lx + km, null],
						  [null, OR.y + connectm],
						  [OR.x + 8, null]);
   // reg
   const reg = gate.reg({ stroke, class: classREG, width: regSize, id: attrs.id ? attrs.id + "-reg" : false }, OR_w.lx, OR.y);

   const k0_gx = (reg.lx) + km*6;
   const k0_gy = resy - connectm;
   const k0_g = gate.and({ stroke, class: classK0 }, k0_gx, k0_gy);
   const k0x = x + (width - lm);
   const k0y = k0_g.outy;
   
   const reg_w = gate.wire({ stroke, class: classREG }, [reg.lx, reg.outy], [reg.lx + km*3, null], [null, k0_g.ly - connectm], [k0_gx, null]);
   const reg2_wh = (reg.outy) - (susp_and_not_kill.ly) + km;
   const reg2_wx = reg.lx + km;
   const reg2_wy = reg.outy
   const reg2_w = gate.wire({ stroke, class: classSUSP, dot: "*-" },
			     [reg2_wx, reg2_wy],
			     [null, reg2_wy + reg2_wh],
			     [susp_and_not_kill_and_reg.x - km, null],
			     [null, susp_and_not_kill_and_reg.ly - connectm],
			     [susp_and_not_kill_and_reg.x, null]);

   // selw
   const selx = x + (width - lm);
   const sely = goy;
   const sel_w = gate.wire({ stroke, class: classSEL, label: "SEL", anchor: "r", dot: "*-" }, [reg.lx + km*2, reg.outy], [null, sely], [selx, null]);
   
   // k0
   const k0_w = gate.wire({ stroke, class: classK0, label: "K0", anchor: "r" }, [k0_g.lx, k0_g.outy], [k0x, null]);
   const res_w = gate.wire({ stroke, class: classRES, label: "RES", anchor: "l" }, [resx, resy], [k0_g.x, null]);

   // k1
   const k1x = selx;
   const k1y = k0_g.outy + lm;
   const assig_g = gate.assig({ stroke, class: classGO, height: assigSize }, ex + esl, goy - assigSize/2);
   const go2_w = gate.wire({ stroke, class: classGO, label: "GO", anchor: "l" }, [gox, goy], [assig_g.x, null]);
   const k1_w = gate.wire({ stroke, class: classK1, label: "K1", anchor: "r" }, [assig_g.lx, assig_g.outy], [assig_g.lx + lm, null], [null, k0_g.outy + lm], [k1x, null]);
   
   // k2
   const k2x = selx;
   const k2y = k0_g.outy + 2*lm;
   const k2_g = gate.assig({ stroke, class: classK2, height: assigSize }, x + width - assigSize - km*3, k2y - assigSize/2);
   const k2_w = gate.wire({ stroke, class: classK2, label: "K2", anchor: "r" }, [k2_g.lx, k2_g.outy], [k2x, null]);
   const k20_w = gate.wire({ stroke, class: classK2, label: "0", anchor: "l" }, [k2_g.x - km, k2_g.outy], [k2_g.x, null]);
   
   // dot
   const dotx = selx;
   const doty = k0_g.outy + 3*lm;
   const dot = gate.label({ stroke, class: getClass(attrs, "pause yield etc"), label: "...", anchor: "r" }, "...", dotx, doty);
   
   // surrounding box
   const surrounding = attrs.box
      ? { svg: `${margin}<g`
	 + getId(attrs, "circuit box seq")
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
		   k2_g, k2_w, k20_w,
		   dot,
		   surrounding);

   return {
      svg, x, y, width, height, lx: x + width, ly: y + height,
      e: { x: ex, y: ey },
      e2: { x: e2x, y: e2y },
      go: { X: gox, Y: goy },
      res: { X: resx, Y: resy },
      susp: { X: suspx, Y: suspy },
      kill: { X: killx, Y: killy },
      sel: { X: selx, Y: sely },
      k0: { X: k0x, Y: k0y },
      k1: { X: k1x, Y: k1y },
      k2: { X: k2x, Y: k2y }
   };
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
   const ex = x + lm*2;
   const ey = y + 15;
   const e2x = x + (width - lm*2);
   const e2y = ey;

   const esl = 1*width/2 - assigSize/2 - ex;
   const esr = 1*width/2 - assigSize/2;
   const e = gate.label({ stroke, class: getClass(attrs, "emit E"), baseline: "text-bottom" }, "E", ex, ey);
   const e2 = gate.label({ stroke, class: getClass(attrs, "emit E2"), baseline: "text-bottom" }, "E'", e2x, ey);
   const e_gw = 30;
   const e_g = gate.assig({ stroke, class: getClass(attrs, "emit E"), width: e_gw }, assigx, ey + e_gw/2);
   
   const e_w = gate.wire({ stroke, class: getClass(attrs, "emit E") }, [e.x, e.y + 2], [null, e_g.outy], [e_g.x, null]);
   const e2_w = gate.wire({ stroke, class: getClass(attrs, "emit E") }, [e_g.lx, e_g.outy], [e2.x, null], [null, e2.y + 2]);
   
   const s = gate.label({ stroke, class: getClass(attrs, "emit s"), baseline: "text-bottom" }, "s", e2x + lm/3, ey);

   // go
   const gox = x + lm;
   const goy = y + km*5;
   const go_g = gate.assig({ stroke, class: getClass(attrs, "emit k0") }, assigx, goy - assigSize/2);
   const go_w = gate.wire({ stroke, class: getClass(attrs, "emit go"), label: "GO", anchor: "l" }, [gox, goy], [go_g.x, null]);
   const s_w = gate.wire({ stroke, class: getClass(attrs, "emit s"), "dot": "*-" },
			  [go_g.lx + km, go_g.outy],
			  [null, go_g.outy - 2*km],
			  [s.x, null],
			  [null, s.y + 2]);
   
   // res
   const resx = gox;
   const resy = goy + (km*2);
   const res_w = gate.wire({ stroke, class: getClass(attrs, "emit res"), label: "RES", anchor: "l" }, [resx, resy]);

   // susp
   const suspx = gox;
   const suspy = goy + (km*4);
   const susp_w = gate.wire({ stroke, class: getClass(attrs, "emit susp"), label: "SUSP", anchor: "l" }, [suspx, suspy]);
   
   // kill
   const killx = gox;
   const killy = goy + (km*6);
   const kill_w = gate.wire({ stroke, class: getClass(attrs, "emit kill"), label: "KILL", anchor: "l" }, [killx, killy]);

   // sel
   const selx = x + width - lm;
   const sely = y + km*5;

   const sel_g = gate.assig({ stroke, class: getClass(attrs, "emit sel") }, selx - km*2 - assigSize/2, sely - assigSize/2);
   const sel_w = gate.wire({ stroke, class: getClass(attrs, "emit sel"), label: "SEL", anchor: "r" }, [sel_g.lx, sel_g.outy], [selx, null]);
   const sel0_w = gate.wire({ stroke, class: getClass(attrs, "emit sel"), label: "0", anchor: "l" }, [sel_g.x - km, sel_g.outy], [sel_g.x, null]);

   // k0
   const k0x = selx;
   const k0y = sely + km*2;
   const k0_w = gate.wire({ stroke, class: getClass(attrs, "emit k0"), label: "K0", anchor: "r" }, [go_g.lx, go_g.outy], [go_g.lx + km, null], [null, k0y], [k0x, null]);

   // k1
   const k1x = selx;
   const k1y = sely + km*4;

   const k1_g = gate.assig({ stroke, class: getClass(attrs, "emit k1") }, k1x - km*2 - assigSize/2, k1y - assigSize/2);
   const k1_w = gate.wire({ stroke, class: getClass(attrs, "emit k1"), label: "K1", anchor: "r" }, [k1_g.lx, k1_g.outy], [k1x, null]);
   const k10_w = gate.wire({ stroke, class: getClass(attrs, "emit k1"), label: "0", anchor: "l" }, [k1_g.x - km, k1_g.outy], [k1_g.x, null]);

   // k2
   const k2x = selx;
   const k2y = sely + km*6;

   const k2_g = gate.assig({ stroke, class: getClass(attrs, "emit k2") }, k2x - km*2 - assigSize/2, k2y - assigSize/2);
   const k2_w = gate.wire({ stroke, class: getClass(attrs, "emit k2"), label: "K2", anchor: "r" }, [k2_g.lx, k2_g.outy], [k2x, null]);
   const k20_w = gate.wire({ stroke, class: getClass(attrs, "emit k2"), label: "0", anchor: "l" }, [k2_g.x - km, k2_g.outy], [k2_g.x, null]);

   // dot
   const dotx = selx;
   const doty = sely + km*8;

   const dot_g = gate.assig({ stroke, class: getClass(attrs, "emit etc") }, dotx - km*2 - assigSize/2, doty - assigSize/2);
   const dot_w = gate.wire({ stroke, class: getClass(attrs, "emit etc"), label: "...", anchor: "r" }, [dot_g.lx, dot_g.outy], [dotx, null]);
   const dot0_w = gate.wire({ stroke, class: getClass(attrs, "emit etc"), label: "0", anchor: "l" }, [dot_g.x - km, dot_g.outy], [dot_g.x, null]);

   // surrounding box
   const surrounding = attrs.box
      ? { svg: `${margin}<g`
	 + getId(attrs, "circuit box emit")
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

   return {
      svg, x, y, width, height, lx: x + width, ly: y + height,
      e: { x: ex, y: ey },
      e2: { x: e2x, y: e2y },
      go: { X: gox, Y: goy },
      res: { X: resx, Y: resy },
      susp: { X: suspx, Y: suspy },
      kill: { X: killx, Y: killy },
      sel: { X: selx, Y: sel_w.y },
      k0: { X: k0x, Y: k0y },
      k1: { X: k1x, Y: k1y },
      k2: { X: k2x, Y: k2y }
   };
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
   const p = (typeof P === "string") ? named({ stroke, name: P, margin }, cm, y + km*4) : P;
   const selww = 50;
   const width = p.width + km*24;
   const height = p.ly - y + km;
   const connectm = 8;
   const assigSize = 30;

   const classE = getClass(attrs, "loop e");
   const classGO = getClass(attrs, "loop go");
   const classRES = getClass(attrs, "loop res");
   const classSUSP = getClass(attrs, "loop susp");
   const classKILL = getClass(attrs, "loop kill");
   const classSEL = getClass(attrs, "loop sel");
   const classK0 = getClass(attrs, "loop k0");
   const classK1 = getClass(attrs, "loop k1");
   const classK2 = getClass(attrs, "loop k2");
   
   // E
   const ex = x + lm*2;
   const ey = y + 15;
   
   const e2x = x + (width - lm*2);
   const e2y = ey;
   
   const e = gate.label({ stroke, class: classE, baseline: "text-bottom" }, "E", ex, ey);
   const ep_w = gate.wire({ stroke, class: classE}, [e.x, e.y + 2], [null, p.y - 2*km], [p.e.x, null], [null, p.y]);
   
   const e2 = gate.label({ stroke, class: classE, baseline: "text-bottom" }, "E'", e2x, e2y);
   const ep2_w = gate.wire({ stroke, class: classE }, [p.e2.x, p.y], [null, p.y - 2*km], [e2.x, null], [null, e2.y + 2]);

   // go
   const gox = x + lm;
   const goy = p.go.Y;
   const dummy_g = gate.or({ stroke, class: classGO }, 0, 0);
   const or_g = gate.or({ stroke, class: classGO }, x + lm + 2*km, p.go.Y - dummy_g.height + connectm);
   const go_w = gate.wire({ stroke, class: getClass(attrs, "loop go boot") }, [gox, goy], [or_g.x + 8, or_g.ly - connectm]);
   const or_w = gate.wire({ stroke, class: getClass(attrs, "loop go") }, [or_g.lx, or_g.outy], [or_g.lx + lm/2, null], [null, p.go.Y], [p.go.X, null]);

   // res
   const resx = gox;
   const resy = p.res.Y;
   const pRes_w = gate.wire({ stroke, class: classRES, label: "RES" }, [resx, resy], [p.x, null]);

   // susp
   const suspx = gox;
   const suspy = p.susp.Y;
   const pSusp_w = gate.wire({ stroke, class: classSUSP, label: "SUSP" }, [suspx, suspy], [p.x, null]);

   // kill
   const killx = gox;
   const killy = p.kill.Y;
   const pKill_w = gate.wire({ stroke, class: classKILL, label: "KILL" }, [killx, killy], [p.x, null]);

   // sel
   const selx = x + width - lm;
   const sel_w = gate.wire({ stroke, class: classSEL, label: "SEL", anchor: "r" }, [p.sel.X, p.sel.Y], [selx, null]);

   // k0
   const k0x = x + width - lm;
   const k0y = p.k0.Y;
   const k0_g = gate.assig({ stroke, class: classK0 }, k0x - km*2 - assigSize/2, k0y - assigSize/2);
   const k0_w = gate.wire({ stroke, class: classK0, label: "K0", anchor: "r" }, [k0_g.lx, k0_g.outy], [k0x, null]);
   const k00_w = gate.wire({ stroke, class: classK0, label: "0", anchor: "l" }, [k0_g.x - km, k0_g.outy], [k0_g.x, null]);

   const k0loop_w = gate.wire({ stroke, class: getClass(attrs, "loop go k0") },
			       [p.k0.X, p.k0.Y],
			       [p.k0.X + km, null],
			       [null, p.y - km],
			       [or_g.x - km, null],
			       [null, or_g.y + connectm],
			       [or_g.x + 8, null]);

   // k1
   const k1x = k0x;
   const k1y = p.k1.Y;
   const k1_w = gate.wire({ stroke, class: classK1, label: "K1", anchor: "r" }, [p.k1.X, k1y], [k1x, null]);
   
   // k2
   const k2x = k0x;
   const k2y = p.k2.Y;
   const k2_w = gate.wire({ stroke, class: classK2, label: "K2", anchor: "r" }, [p.k2.X, k2y], [k2x, null]);

   // surrounding box
   const surrounding = attrs.box
      ? { svg: `${margin}<g`
	 + getId(attrs, "circuit box seq")
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

   return {
      svg, x, y, width, height, lx: x + width, ly: y + height,
      go: { X: gox, Y: goy },
      res: { X: resx, Y: resy },
      susp: { X: suspx, Y: suspy },
      kill: { X: killx, Y: killy },
      sel: { X: sel_w.lx, Y: sel_w.y },
      k0: { X: k0x, Y: k0y },
      k1: { X: k1x, Y: k1y }
   };
}
