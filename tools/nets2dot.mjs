#!/usr/bin/env nodejs
/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/tools/nets2dot.mjs            */
/*    -------------------------------------------------------------    */
/*    Author      :  manuel serrano                                    */
/*    Creation    :  Thu Nov 30 07:21:01 2023                          */
/*    Last change :  Thu Feb 27 08:45:09 2025 (serrano)                */
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
   "#B79762", "#004D43", "#8FB0FF", "#997D87", "#5A0007", "#809693",
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
/*    main ...                                                         */
/*---------------------------------------------------------------------*/
function main(argv) {

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
	 return `<table border="0" cellborder="${cellborder ?? "0"}" cellspacing="${cellspacing ?? "0"}" cellpadding="${cellpadding ?? "2"}" bgcolor="${bgcolor ?? "#cccccc"}" color="${color ?? "black"}"> ${rows.join("")}</table>`;
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
      const i = net.$loc.pos + 1000 * net.$ast.charCodeAt(0);
      
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
	 console.error("SRC=", src);
	 console.error("TGT=", tgt);
	 throw "Cannot find src:" + src.id + " tgt:" + src.id;
      }
      
      return tgt.fanout.length + i;
   }
   
   function small(txt) {
      return `<font point-size="12">${txt}</font>`
   }
   
   const info = JSON.parse(readFileSync(argv[2]));
   console.log(`digraph "${argv[2]}" { graph [splines = true overlap = false rankdir = "LR"];`);
   info.nets.forEach(net => {
      const typ = netType(net);
      const id = td({content: `${net.id} [${typ}:${net.lvl}]${(net.$sweepable ? "" : "*")}`});
      const name = net.$name ? tr([td({content: escape(net.$name)})]) : "";
      const sigs = net.signals ? tr([td({content: "[" + net.signals + "]"})]) : (net.signame ? tr([td({content: net.signame})]) : "");
      const action = net.$action ? tr([td({content: font({content: escape(net.$action)})})]) : (net.value !== undefined? tr([td({content: font({content: net.value})})]) : "");
      const fanouts = net.fanout.map((n, i, arr) => tr([port(n, i, `${small(n.id)} &bull;`)]))
      const fanins = net.fanin.map((n, i, arr) => tr([port(n, i + net.fanout.length, `&bull; ${small(n.id)}`, "left")]))
      const fans = table({rows: [tr([td({content: table({rows: fanins})}), td({content: table({rows: fanouts})})])]});
      const header = table({bgcolor: netColor(net), rows: [tr([id]), name]});
      const file = table({cellpadding: 4, rows: [tr([td({content: `${basename(net.$loc.filename)}:${net.$loc.pos}`})]), sigs, action]});;
      const node = table({rows: [tr([td({content: header})]), tr([td({content: file})]), tr([td({align: "center", content: fans})])]});
      const colorNode = table({cellpadding: 6, bgcolor: netLocColor(net), rows: [tr([td({content: node})])]});
      
      console.log(`${net.id} [fontname = "Courier New" shape = "none" label = <${colorNode}>];`);
   });
      

   info.nets.forEach(s => {
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
	 }
	 
	 console.log(`${s.id}:${i} :e -> ${s.fanout[i].id}:${index} :w ${!style.length ? "" : ("[" + style.join() + "]")};`);
      }
   });
	 
   console.log("}");
}

/*---------------------------------------------------------------------*/
/*    top level                                                        */
/*---------------------------------------------------------------------*/
main(process.argv);
