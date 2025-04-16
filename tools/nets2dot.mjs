#!/usr/bin/env nodejs
/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/tools/nets2dot.mjs            */
/*    -------------------------------------------------------------    */
/*    Author      :  manuel serrano                                    */
/*    Creation    :  Thu Nov 30 07:21:01 2023                          */
/*    Last change :  Wed Apr 16 07:45:23 2025 (serrano)                */
/*    Copyright   :  2023-25 manuel serrano                            */
/*    -------------------------------------------------------------    */
/*    Generate a DOT file from a netlist.                              */
/*    -------------------------------------------------------------    */
/*    To use this tool, considering a source file foo.hh.js:           */
/*      - add the option { dumpNets: true } to the machine.            */
/*      - run the program                                              */
/*      - node tools/nets2dot.js foo.hh.js.nets+.json > nets+.dot      */
/*      - node tools/nets2dot.js foo.hh.js.nets-.json > nets-.dot      */
/*      - dot -T pdf nets+.dot > nets+.pdf                             */
/*      - dot -T pdf nets-.dot > nets-.pdf                             */
/*=====================================================================*/
"use strict";
"use hopscript";

/*---------------------------------------------------------------------*/
/*    The module                                                       */
/*---------------------------------------------------------------------*/
import { readFileSync } from "fs";
import { basename } from "path";

/*---------------------------------------------------------------------*/
/*    signal accessibility                                             */
/*---------------------------------------------------------------------*/
const IN = 1;    //  001, is in ? === accessibility & 1
const INOUT = 3; //  011
const OUT = 2;   //  010, is out ? === accessibility & 2
const LOCAL = 4; //  100


/*---------------------------------------------------------------------*/
/*    locPredefinedColors ...                                          */
/*---------------------------------------------------------------------*/
const locPredefinedColors = [
   "#dddddd", "#d24c4c", "#d2ce4c", "#4c5ad2", "#a94cd2", "#52d24c",
   "#004D43", "#8FB0FF", "#997D87", "#5A0007", "#809693", "#B79762", 
   "#FEFFE6", "#1B4400", "#4FC601", "#3B5DFF", "#4A3B53", "#FF2F80",
   "#61615A", "#BA0900", "#6B7900", "#00C2A0", "#FFAA92", "#FF90C9",
   "#B903AA", "#D16100", "#DDEFFF", "#000035", "#7B4F4B", "#A1C299",
   "#300018", "#0AA6D8", "#013349", "#00846F", "#372101", "#FFB500",
   "#C2FFED", "#A079BF", "#CC0744", "#C0B9B2", "#C2FF99", "#001E09",
   "#00489C", "#6F0062", "#0CBD66", "#EEC3FF", "#456D75", "#B77B68",
   "#7A87A1", "#788D66", "#885578", "#FAD09F", "#FF8A9A", "#D157A0",
   "#BEC459", "#456648", "#0086ED", "#886F4C", "#34362D", "#B4A8BD",
   "#006FA6", "#A30059", "#FFDBE5", "#7A4900", "#0000A6", "#63FFAC",
   "#00A6AA", "#452C2C", "#636375", "#A3C8C9", "#FF913F", "#938A81",
   "#575329", "#00FECF", "#B05B6F", "#8CD0FF", "#3B9700", "#04F757",
   "#C8A1A1", "#1E6E00", "#7900D7", "#A77500", "#6367A9", "#A05837",
   "#6B002C", "#772600", "#D790FF", "#9B9700", "#549E79", "#FFF69F",
   "#201625", "#72418F", "#BC23FF", "#99ADC0", "#3A2465", "#922329",
   "#5B4534", "#FDE8DC", "#404E55", "#0089A3", "#CB7E98", "#A4E804",
   "#324E72", "#6A3A4C", "#83AB58", "#001C1E", "#D1F7CE", "#004B28",
   "#C8D0F6", "#A3A489", "#806C66", "#222800", "#BF5650", "#E83000",
   "#66796D", "#DA007C", "#FF1A59", "#8ADBB4", "#1E0200", "#5B4E51",
   "#C895C5", "#320033", "#FF6832", "#66E1D3", "#CFCDAC", "#D0AC94",
   "#000000", "#FFFF00", "#1CE6FF", "#FF34FF", "#FF4A46", "#008941",
   "#7ED379", "#012C58"
];
let locColorIndex = 0;

/*---------------------------------------------------------------------*/
/*    isBright ...                                                     */
/*---------------------------------------------------------------------*/
function isBright(color) {
   let c = parseInt(color.substring(2, 4), 16)
      + parseInt(color.substring(4, 6), 16)
      + parseInt(color.substring(6, 8), 16);

   return c > (3 * 130);
}


/*---------------------------------------------------------------------*/
/*    hex ...                                                          */
/*---------------------------------------------------------------------*/
const hex = "0123456789abcdef";

/*---------------------------------------------------------------------*/
/*    hex2 ...                                                         */
/*---------------------------------------------------------------------*/
function hex2(n) {
   if (n < 16) {
      return `0${hex[n]}`;
   } else {
      return `${hex[n >> 4]}${hex[n & 15]}`;
   }
}

/*---------------------------------------------------------------------*/
/*    lighter ...                                                      */
/*---------------------------------------------------------------------*/
function lighter(color) {
   const f = 1.6;
   const shift = 50;
   const r = parseInt(color.substring(1, 3), 16);
   const g = parseInt(color.substring(3, 5), 16);
   const b = parseInt(color.substring(5, 7), 16);

   const nr = hex2(Math.round(Math.min(255, (r * f) + shift)));
   const ng = hex2(Math.round(Math.min(255, (g * f) + shift)));
   const nb = hex2(Math.round(Math.min(255, (b * f) + shift)));

   return `#${nr}${ng}${nb}`;
}

/*---------------------------------------------------------------------*/
/*    locColors ...                                                    */
/*---------------------------------------------------------------------*/
const locColors = {};

/*---------------------------------------------------------------------*/
/*    nextLocColor ...                                                 */
/*---------------------------------------------------------------------*/
function nextLocColor() {
   locColorIndex++;
   if (locColorIndex >= locPredefinedColors.length) {
      locColorIndex = 0;
   }
   return locPredefinedColors[locColorIndex];
}

/*---------------------------------------------------------------------*/
/*    astKey ...                                                       */
/*---------------------------------------------------------------------*/
function astKey(ast) {
   return `${ast.ctor}@${ast.loc.pos}`;
}

/*---------------------------------------------------------------------*/
/*    netKey ...                                                       */
/*---------------------------------------------------------------------*/
function netKey(n) {
   return astKey(n.$ast);
}

/*---------------------------------------------------------------------*/
/*    Circuit ...                                                      */
/*---------------------------------------------------------------------*/
class Circuit {
   key;
   parent = undefined;
   children = [];
   nets = [];
   
   constructor(key, nets) {
      this.key = key;
      this.nets = nets;
   }

   visit(proc) {
      proc(this);
      this.children.forEach(c => c.visit(proc));
   }
}

/*---------------------------------------------------------------------*/
/*    collectCircuits ...                                              */
/*    -------------------------------------------------------------    */
/*    This function returns the "main" circuit, i.e., the one which    */
/*    has no parent. Its children form a tree.                         */
/*    -------------------------------------------------------------    */
/*    Circuits are designated by source location, i.e., each           */
/*    source location is associated to exactly one circuit.            */
/*---------------------------------------------------------------------*/
function collectCircuits(nets) {
   let circuits = {};
   let main = undefined;
   
   nets.forEach(n => {
      const key = netKey(n);

      if (circuits[key]) {
	 circuits[key].nets.push(n);
      } else {
	 circuits[key] = new Circuit(netKey(n), [n]);
      }
   });

   // sort all the net of each circuits
   for (let k in circuits) {
      const c = circuits[k];
      const n0 = c.nets[0];
      const p = n0.$parent;

      // sort the net inside the circuit
      c.nets.sort((n, m) => n.id <= m.id ? -1 : 1);

      // establish the parent relationship
      if (!p) {
	 if (main) {
	    c.parent = main;
	 } else {
	    main = c;
	 }
      } else {
	 c.parent = circuits[astKey(p)];

	 if (!c.parent) {
	    throw new Error('Cannot find parent circuit of "'
	       + (n0.$ast.loc.filename + ":" + n0.$ast.loc.pos) + `[${astKey(p)}]'"`);
	 }
      }
   }

   // establish the children relationship
   for (let k in circuits) {
      const c = circuits[k];
      if (c.parent) {
	 c.parent.children.push(c);
      }
   }
			    
   if (!main) {
      throw new Error("Cannot find main circuit");
   } else {
      return main;
   }
}

/*---------------------------------------------------------------------*/
/*    sameCircuit ...                                                  */
/*---------------------------------------------------------------------*/
function sameCircuit(s, t) {
   return netKey(s) === netKey(t);
}

/*---------------------------------------------------------------------*/
/*    main ...                                                         */
/*---------------------------------------------------------------------*/
function main(argv) {

   let clusterNum = 0;
   
   function td({align, port, content}) {
      if (port !== undefined) {
	 return `<td align="${align ?? "left"}" port="${port}">${content}</td>`;
      } else {
	 return `<td align="${align ?? "left"}">${content}</td>`;
      }
   }
      
   function tr(cells) {
      return `<tr>${cells.join("")}</tr>`;
   }
   
   function table({rows, bgcolor, color, cellborder, cellspacing, cellpadding}) {
      if (rows.length === 0) {
	 return "";
      } else {
	 return `<table border="0" cellborder="${cellborder ?? "0"}" cellspacing="${cellspacing ?? "0"}" cellpadding="${cellpadding ?? "2"}" ${bgcolor ? `bgcolor="${bgcolor}"` : ''} color="${color ?? "black"}"> ${rows.join("")}</table>`;
      }
   }

   function font({color, content}) {
      return `<font color="${color ?? "blue"}">${content}</font>`;
   }
   
   function port(net, i, content="&bull;", align="right") {
      return td({port: i, align: align, content: content});
   }

   function netColor(net) {
      switch (net.type) {
	 case "OR": return "yellow";
	 case "AND": return "green";
	 case "REG": return "#d4aaff";
	 case "WIRE": return "#777777";
	 case "ACTION": return "orange";
	 case "ACTION-": return "orange";
	 case "SIGACTION": return "#98bb39";
	 case "SIGACTION-": return "#98bb39";
	 case "TEST": return "#f37061";
	 case "TEST-": return "#f37061";
	 case "TRUE":
	 case "FALSE": return "#3691bc";
	 case "SIG": return net.accessibility === LOCAL ? "#32eee2" : "#ff002c";
	 default: return "gray85";
      }
   }
   
   function netLocColor(net) {
      const i = net.$ast.loc.pos + 10 * net.$ast.ctor.charCodeAt(0);
      
      if (i in locColors) {
	 return locColors[i];
      } else {
	 locColors[i] = nextLocColor();
	 return locColors[i];
      }
   }
   
   function escape(str) {
      return str.replace(/&/g, "&amp;").replace(/>/g, "&gt;").replace(/</g, "&lt;");
   }
   
   function netType(net) {
      if (net.type === "SIG") {
	 switch (net.accessibility) {
	    case IN: return "SIGi";
	    case OUT: return "SIGo";
	    case INOUT: return "SIGio";
	    default: return "SIG";
	 }
      } else {
	 return net.type;
      }
   }

   function fanoutPort(src, tgt, polarity) {
      const fanins = tgt.fanin;
      let i;

      for (i = 0; i < fanins.length; i++) {
	 if (fanins[i].id === src.id && fanins[i].polarity === polarity) break;
      }

      if (i === fanins.length) {
	 throw "Cannot find src:" + src.id + " tgt:" + src.id;
      }
      
      return tgt.fanout.length + i;
   }
   
   function small(txt) {
      return `<font point-size="12">${txt}</font>`
   }

   function emitCircuit(c, margin) {
      const n0 = c.nets[0];
      const bgcolor = netLocColor(n0);
      const fgcolor = isBright(bgcolor) ? "black" : "white";
      const sourceLoc = `[${n0.$ast.loc.filename}:${n0.$ast.loc.pos}]`;
      const ctor = table({bgcolor: "#cccccc", rows: [tr([td({content: font({color: "black", content: `${n0.$ast.ctor} ${font({color: "blue", content: sourceLoc})}`})})])]});
      const ctort = table({bgcolor, cellpadding: 6, rows: [tr([td({content: ctor})])]});
      
      console.log(`${margin}subgraph cluster${clusterNum++} {`);
      console.log(`${margin}  color="${lighter(bgcolor)}";`);
      console.log(`${margin}  style="filled";`);
      console.log(`${margin}  fontname="Courier New";`);
      console.log(`${margin}  label=<${table({cellspacing: 0, cellpadding: 0, bgcolor: bgcolor, rows: [tr([td({content: ctort})])]})}>;`);
      c.nets.forEach(net => {
	 const typ = netType(net);
	 const id = td({content: `${net.id} [${typ}:${net.lvl}]${(net.$sweepable ? "" : "*")}`});
	 const name = net.$name ? tr([td({content: escape(net.$name)})]) : "";
	 const sigs = net.signals ? tr([td({content: "[" + net.signals + "]"})]) : (net.signame ? tr([td({content: net.signame})]) : "");
	 const action = net.$action ? tr([td({content: font({content: escape(net.$action)})})]) : (net.value !== undefined? tr([td({content: font({content: net.value})})]) : "");
	 const fanouts = net.fanout.map((n, i, arr) => tr([port(n, i, `${small(n.id)} &bull;`)]))
	 const fanins = net.fanin.map((n, i, arr) => tr([port(n, i + net.fanout.length, `&bull; ${small(n.id)}`, "left")]))
	 const fans = table({rows: [tr([td({content: table({rows: fanins})}), td({content: table({rows: fanouts})})])]});
	 const header = table({bgcolor: netColor(net), rows: [tr([id]), name]});
	 const node = table({bgcolor: "#cccccc", cellpadding: 0, rows: [tr([td({content: header})]), tr([td({align: "center", content: fans})])]});
	 const shape = net.type === "WIRE" ? "box" : "cds";
	 const padding = net.type === "WIRE" ? "1" : "8";
	 const colorNode = table({cellpadding: padding, cellspacing: 0, rows: [tr([td({content: node})])]});
	 
	 console.log(`${margin}${net.id} [fontname="Courier New" shape="${shape}" color="${bgcolor}" style="filled" label=<${colorNode}>];`);
      });
      c.children.forEach(c => emitCircuit(c, margin + "  "));
      console.log("  }");
   }
   
   function emitNet(s) {
      for (let i = 0; i < s.fanout.length > 0; i++) {
	 const t = info.nets.find(n => n.id === s.fanout[i].id);
	 if (!t) {
	    console.error(`*** ERROR: Cannot find ${s.id}'s target ${s.fanout[i].id}`);
	    process.exit(1);
	 }
	 const polarity = s.fanout[i].polarity;
	 const index = fanoutPort(s, t, polarity);
	 const style = s.fanout[i].dep ? ["style=dashed", 'color="red"'] : [];

	 if (!polarity) {
	    style.push("arrowhead=odot");
	 } else if (t.type === "WIRE") {
	    style.push("arrowhead=none");
	 }

	 if (false && sameCircuit(s, t)) {
	    style.push(" constraint=false");
	 }
	 
	 console.log(`${s.id}:${i} :e -> ${s.fanout[i].id}:${index} :w${!style.length ? "" : (" [" + style.join() + "]")};`);
      }
   }
   
   const info = JSON.parse(readFileSync(argv[2]));
   
   const main = collectCircuits(info.nets);
   
   console.log(`digraph "${argv[2]}" {`);
   // console.log("  newrank = true;");
   console.log('  rankdir = "LR";');

   emitCircuit(main, "  ");
   info.nets.forEach(emitNet);

   console.log("}");
}

/*---------------------------------------------------------------------*/
/*    top level                                                        */
/*---------------------------------------------------------------------*/
main(process.argv);
