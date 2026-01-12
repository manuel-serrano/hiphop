/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/doc/circuit/circuit.mjs       */
/*    -------------------------------------------------------------    */
/*    Author      :  Manuel Serrano                                    */
/*    Creation    :  Fri Jan  9 18:26:39 2026                          */
/*    Last change :  Mon Jan 12 13:34:15 2026 (serrano)                */
/*    Copyright   :  2026 Manuel Serrano                               */
/*    -------------------------------------------------------------    */
/*    Svg circuits                                                     */
/*=====================================================================*/

/*---------------------------------------------------------------------*/
/*    The module                                                       */
/*---------------------------------------------------------------------*/
export { css, seq, pause };

import * as gate from "./gate.mjs";
import * as path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

/*---------------------------------------------------------------------*/
/*    css ...                                                          */
/*---------------------------------------------------------------------*/
const css = path.join(dirname(fileURLToPath(import.meta.url), "circuit.css"));

/*---------------------------------------------------------------------*/
/*    getStyle ...                                                     */
/*---------------------------------------------------------------------*/
function getStyle(attrs) {
   let style = "stroke-width:2px;stroke-linecap:butt;stroke-linejoin:miter;stroke-opacity:1";

   style += (attrs.fill ? `;fill:${attrs.fill}` : ";fill:transparent");
   style += (attrs.stroke ? `;stroke:${attrs.stroke}` : ";stroke:red");

   return style;
}

/*---------------------------------------------------------------------*/
/*    getId ...                                                        */
/*---------------------------------------------------------------------*/
function getId(attrs, defClass = "") {
   return (attrs?.id ? ` id="${attrs.id}"` : "") + (attrs?.class ? ` class="${attrs.class} ${defClass}"` : ` class="${defClass}"`);
}

/*---------------------------------------------------------------------*/
/*    SVG ...                                                          */
/*---------------------------------------------------------------------*/
function SVG(...nodes) {
   return nodes.filter(n => n.svg).map(n => n.svg).join("");
}

/*---------------------------------------------------------------------*/
/*    namedCircuit ...                                                 */
/*---------------------------------------------------------------------*/
function namedCircuit(attrs, x, y) {
   if (typeof attrs !== "object") {
      throw new TypeError("namedCircuit: bad attributes " + attrs);
   }

   const margin = attrs?.margin ?? "   ";
   const name = attrs?.name ?? "P";
   const width = attrs?.width ?? 150;
   const height = attrs?.height ?? 200;
   const padding = width / 15;

   const ins = ["GO", "RES", "SUSP", "KILL", ""];
   const outs = ["SEL", "K0", "K1", "K2", "..."];
   const svg = `${margin}<g`
      + getId(attrs)
      + ` style="${getStyle(attrs)}"`
      + ">\n"
      + `${margin}   <path d="m ${x},${y} ${width},0 0,${height} -${width},0 Z"/>\n`
      + `${margin}</g>\n`
      + `${margin}<text class="circuit-name" x="${x + width/2}" y="${y + height/2}" text-anchor="middle" dominant-baseline="middle">${name}</text>\n`
      + ins.map((t, i) => `${margin}<text class="${t}" x="${x + padding}" y="${y + (height/(ins.length + 1))*(i+1)}" text-anchor="start" dominant-baseline="middle">${t}</text>\n`).join("")
      + outs.map((t, i) => `${margin}<text class="${t}" x="${x + width - padding}" y="${y + (height/(outs.length + 1))*(i+1)}" text-anchor="end" dominant-baseline="middle">${t}</text>\n`).join("")
      + ["E", "E'"].map((t, i) => `${margin}<text class="E" x="${x + (width * (i + 1) * (1/3))}" y="${y + 15}" text-anchor="middle" dominant-baseline="middle">${t}</text>\n`).join("");

   const circuit = { svg, width, height, x, y };

   ins.forEach((t, i) => circuit[t.toLowerCase()] =
      { x: 0, y: (height/(ins.length + 1))*(i+1),
	X: x, Y: y + (height/(ins.length + 1))*(i+1) });
   outs.forEach((t, i) => circuit[t.toLowerCase()] =
      { x: width, y: (height/(outs.length + 1))*(i+1),
	X: x + width, Y: y + (height/(outs.length + 1))*(i+1) });

   ["E", "E2"].forEach((t, i) => circuit[t.toLowerCase()] = {
      x: (width * (i + 1) * (1/3)), y: 15,
      X: x + (width * (i + 1) * (1/3)), Y: y + 15 });

   return circuit;
}

/*---------------------------------------------------------------------*/
/*    seq ...                                                          */
/*---------------------------------------------------------------------*/
function seq(attrs, P, Q) {
   const margin = attrs?.margin ?? "   ";
   const lm = 40;
   const x = attrs?.x ?? 0;
   const y = attrs?.y ?? 0;
   const cm = 180 + x;
   const p = namedCircuit({ name: P, margin }, cm, y + 50);
   const q = namedCircuit({ name: Q, margin }, cm, y + 320);
   const km = 20;
   const selww = 50;
   const outgx = p.width * 1.3;
   const width = (p.width * 3) + outgx + selww - 20;
   const height = p.height * 2 + (km*7);
   const ey = 30;

   // go
   const go_w = gate.wire({ class: "GO", label: "GO" }, [x + lm, p.go.Y], [p.go.X - (x + lm), 0]);

   // res
   const pRes_w = gate.wire({ class: "RES", label: "RES" }, [x + lm, p.res.Y], [p.res.X - (x + lm), 0]);
   const qRes_w = gate.wire({ class: "RES", dot: "branch" }, [p.res.X - 3*km, p.res.Y], [0, q.res.Y - p.res.Y], [q.res.X - (p.x - 3*km), 0]);

   // susp
   const pSusp_w = gate.wire({ class: "SUSP", label: "SUSP" }, [x + lm, p.susp.Y], [p.susp.X - (x + lm), 0]);
   const qSusp_w = gate.wire({ class: "SUSP", dot: "branch" }, [p.susp.X - 4*km, p.susp.Y], [0, q.susp.Y - p.susp.Y], [q.susp.X - (p.x - 4*km), 0]);

   // kill
   const pKill_w = gate.wire({ class: "KILL", label: "KILL" }, [x + lm, p.kill.Y], [p.susp.X - (x + lm), 0]);
   const qKill_w = gate.wire({ class: "KILL", dot: "branch" }, [p.kill.X - 5*km, p.kill.Y], [0, q.kill.Y - p.kill.Y], [q.kill.X - (p.x - 5*km), 0]);

   // sel
   const sel_g = gate.or({ class: "seq-sel" }, p.sel.X + outgx, p.sel.Y - 8);
   const sel_w= gate.wire({ class: "sel-wire", label: "SEL", anchor: "r" }, [sel_g.x + sel_g.width, sel_g.y + sel_g.height/2], [selww, 0]);
   
   // p.sel -> sel
   const pSel_w = gate.wire({ class: "p-to-sel" }, [p.sel.X, p.sel.Y], [outgx + 8, 0]);
   // q.sel -> sel
   const qSel_w = gate.wire({ class: "q-to-sel" }, [q.sel.X, q.sel.Y], [km*3, 0], [0, -(q.sel.Y - p.sel.Y - (sel_g.height - 8 * 2))], [outgx - (km*3) + 8, 0]);

   // p.k0 -> q.go
   const k0a = [p.k0.X, p.k0.Y];
   const k0b = [km, 0];
   const k0c = [0, p.height - p.k0.y + km];
   const k0d = [-(p.width + 2 * km), 0];
   const k0e = [0, q.go.Y - (k0a[1] + k0c[1])];
   const k0f = [km, 0];

   const pk0_w = gate.wire({ class: "k0-to-go" }, k0a, k0b, k0c, k0d, k0e, k0f);
   
   // E
   const e_g = gate.or({ class: "seq-e" }, p.sel.X + outgx, y + ey - 8);
   const e_w = gate.wire({ class: "E", label: "E'", anchor: "r" }, [e_g.x + e_g.width, e_g.y + e_g.height/2], [selww, 0]);
   
   const ep_w = gate.wire({ class: "E", label: "E" }, [x + lm, y + ey], [p.e.X - (x + lm), 0], [0, p.y - y - ey]);
   const ep2_w = gate.wire({ class: "E" }, [p.e2.X, p.y], [0, -(p.y - y - ey)], [(p.width - p.e2.x) + outgx + 8, 0]);

   const eq_w = gate.wire({ class: "E", dot: "branch" }, [p.go.X - 2*km, y + ey], [0, q.y - km - y - ey], [p.e.X - (p.go.X - 2*km), 0], [0, km]);
   const eq2_w = gate.wire({ class: "E", id: "q-to-E'" }, [q.e2.X, q.y], [0, -km], [q.e.X - (q.go.X - 2*km), 0], [0, -(q.y - km - y - ey) + (e_g.height - 8 * 2)], [8 + e_g.x - (q.x + q.width + 2*km), 0]);

   // k0
   const qk0_w = gate.wire({ class: "k0", label: "K0", anchor: "r" }, [q.k0.X, q.k0.Y], [km * 4, 0], [0, (p.y + p.height) - q.k0.Y], [outgx + selww + e_g.width - (km * 4), 0]);

   // k1
   const k1_g = gate.or({ class: "k1" }, p.k1.X + outgx, q.y - 10);
   const k1_w= gate.wire({ class: "k1", label: "K1", anchor: "r" }, [k1_g.x + k1_g.width, k1_g.y + k1_g.height/2], [selww, 0]);
   const pk1_w = gate.wire({ class: "k1" }, [p.k1.X, p.k1.Y], [7*km, 0], [0, k1_g.y - p.k1.Y + 8], [k1_g.x + 8 - (p.k1.X + 7*km), 0]);
   const qk1_w = gate.wire({ class: "k1" }, [q.k1.X, q.k1.Y], [5*km, 0], [0, (k1_g.y - (q.k1.Y + 8)) + k1_g.height], [k1_g.x + 8 - (q.k1.X + 5*km), 0]);
   
   // k2
   const k2_g = gate.or({ class: "k2" }, p.k2.X + outgx, q.k0.Y - 10);
   const k2_w= gate.wire({ class: "k2", label: "K2", anchor: "r" }, [k2_g.x + k2_g.width, k2_g.y + k2_g.height/2], [selww, 0]);
   const pk2_w = gate.wire({ class: "k2" }, [p.k2.X, p.k2.Y], [6*km, 0], [0, k2_g.y - p.k2.Y + 8], [k2_g.x + 8 - (p.k2.X + 6*km), 0]);
   const qk2_w = gate.wire({ class: "k2" }, [q.k2.X, q.k2.Y], [8*km, 0], [0, k2_g.y - (q.k2.Y + 8) + k2_g.height], [k2_g.x + 8 - (q.k2.X + 8*km), 0]);

   // surrounding box
   const surrounding = attrs.box
      ? { svg: `${margin}<g`
	 + getId(attrs, "box seq")
	 + ` style="${getStyle(attrs)}"`
	 + ">\n"
	 + `${margin}   <path d="m ${x},${y} ${width},0 0,${height} -${width},0 Z"/>\n`
	 + `${margin}</g>\n` }
      : false;

   const svg = SVG(p, q,
		   e_g, e_w, ep_w, ep2_w, eq_w, eq2_w,
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

   return { svg, x, y, width, height };
}

/*---------------------------------------------------------------------*/
/*    pause ...                                                        */
/*---------------------------------------------------------------------*/
function pause(attrs) {
   const margin = attrs?.margin ?? "   ";
   const lm = 40;
   const km = 20;
   const marginLeft = 100;
   const x = attrs?.x ?? 0;
   const y = attrs?.y ?? 0;
   const width = 600;
   const height = 300;
   const regSize = 30;
   const assigSize = 30;
   const stroke = "black";
   const connectm = 8;

   // E
   const ex = lm;
   const ey = assigSize/2 + 10;

   const esl = 1*width/3 - assigSize/2 - lm;
   const esr = 2*width/3 - assigSize/2 - lm;
   const e_w = gate.wireM({ stroke, class: "E", label: "E", anchor: "l" }, [ex, ey], [ex + esl, ey]);
   const e2_w = gate.wireM({ stroke, class: "E", label: "E'", anchor: "r" }, [ex + esl + assigSize, ey], [width - lm, ey]);
   const e_g = gate.assig({ stroke, class: "E" }, ex + esl, 10);
   
   // go
   const gox = lm;
   const goy = ey + km*2;
   
   // res
   const resx = lm;
   const resy = ey + km*4;
   
   // susp
   const suspx = lm;
   const suspy = ey + km*6;
   
   // kill
   const killx = lm;
   const killy = ey + km*8;

   // go_and_not_kill
   const go_and_not_kill = gate.and({ stroke }, marginLeft, killy + 20);

   // susp_and_not_kill
   const susp_and_not_kill = gate.and({ stroke }, marginLeft, suspy - connectm);

   
   const susp_w = gate.wireM({ stroke, class: "susp", label: "SUSP", anchor: "l" }, [suspx, suspy], [marginLeft, suspy]);
   const kill1_w = gate.wireM({ stroke, class: "kill", label: "KILL", anchor: "l", dot: "not" }, [killx, killy], [marginLeft - km, null], [null, susp_and_not_kill.ly - connectm], [susp_and_not_kill.x, null]);
   const kill2_w = gate.wireM({ stroke, class: "kill", dot: "branch" }, [killx + km, killy], [null, killy + km + connectm]);
   const kill3_w = gate.wireM({ stroke, class: "kill", dot: "not" }, [killx + km, killy + 20 + connectm], [go_and_not_kill.x, null]);
			    
   // OR
   const orX = marginLeft + (go_and_not_kill.width*2) + 2*km;
   const orY = go_and_not_kill.y + (susp_and_not_kill.ly  - go_and_not_kill.y - (regSize/2)) / 2;
   const OR = gate.or({ stroke }, orX, orY);

   // susp_and_not_kill_and_reg
   const andX = marginLeft + (susp_and_not_kill.width*1) + 2*km;
   const susp_and_not_kill_and_reg = gate.and({ stroke }, andX, susp_and_not_kill.outy - connectm);
   const susp_and_not_kill_w = gate.wireM({ stroke, class: "susp" },
					  [susp_and_not_kill.lx, susp_and_not_kill.outy],
					  [susp_and_not_kill_and_reg.x, null]);
   
   // reg
   const regx = marginLeft + (go_and_not_kill.width*3) + 3*km;
   const regy = orY;
   const reg = gate.reg({ stroke, width: regSize }, regx, regy);
   
   const k0_gx = (regx + reg.width) + (km*3) + km;
   const k0_gy = resy - connectm;
   const k0_g = gate.and({ stroke }, k0_gx, k0_gy);
   
   const reg_w = gate.wireM({ stroke, class: "k0" }, [reg.lx, reg.outy], [reg.lx + km*3, null], [null, k0_g.ly - connectm], [k0_gx, null]);
   const reg2_wh = (reg.outy) - (susp_and_not_kill.ly) + km;
   const reg2_wx = reg.lx + km;
   const reg2_wy = reg.outy
   const reg2_w = gate.wireM({ stroke, class: "susp" },
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
   const go_w = gate.wireM({ stroke, class: "go", label: "GO", anchor: "l" }, [gox, goy], [assig_g.x, null]);
   const k1_w = gate.wire({ stroke, class: "k1", label: "K1", anchor: "r" }, [assig_g.x + assig_g.length, assig_g.y + assig_g.height/2], [100, 100]);

   // selw
   const sel_x = width - (regx + reg.width + km*2) - lm;
   const sel_y = ey + km*2;
   const sel_w = gate.wireM({ stroke, class: "sel", label: "SEL", anchor: "r", dot: "branch" }, [reg.lx + km*2, reg.outy], [null, sel_y], [width - lm, null]);
   
   // surrounding box
   const surrounding = attrs.box
      ? { svg: `${margin}<g`
	 + getId(attrs, "box seq")
	 + ` style="${getStyle(attrs)}"`
	 + ">\n"
	 + `${margin}   <path d="m ${x},${y} ${width},0 0,${height} -${width},0 Z"/>\n`
	 + `${margin}</g>\n` }
      : false;

   const svg = SVG(e_w,
		   e_g,
		   e2_w,
		   go_w, assig_g, 
		   go_and_not_kill,
		   res_w, 
		   susp_and_not_kill, susp_w, susp_and_not_kill_w,
		   kill1_w, kill2_w, kill3_w,
		   OR, susp_and_not_kill_and_reg,
		   reg, reg_w, reg2_w,
		   sel_w, 
		   k0_g, k0_w,
		   surrounding);

   return { svg, x, y, width, height };
}

