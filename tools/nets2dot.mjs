#!/usr/bin/env nodejs
/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/tools/nets2dot.mjs            */
/*    -------------------------------------------------------------    */
/*    Author      :  manuel serrano                                    */
/*    Creation    :  Thu Nov 30 07:21:01 2023                          */
/*    Last change :  Tue Feb 11 08:41:59 2025 (serrano)                */
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
	 console.error("SRC=", SRC);
	 console.error("TGT=", tgt);
	 console.error("-- ", fanins[0].id === fanin.id);
	 throw "Cannot find fanin:" + fanin.id + " tgt:" + tgt.id;
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
      const name = net.$name ? tr([td({content: net.$name})]) : "";
      const sigs = net.signals ? tr([td({content: "[" + net.signals + "]"})]) : (net.signame ? tr([td({content: net.signame})]) : "");
      const action = net.$action ? tr([td({content: escape(net.$action)})]) : (net.value !== undefined? tr([td({content: net.value})]) : "");
      const fanouts = net.fanout.map((n, i, arr) => tr([port(n, i, `${small(n.id)} &bull;`)]))
      const fanins = net.fanin.map((n, i, arr) => tr([port(n, i + net.fanout.length, `&bull; ${small(n.id)}`, "left")]))
      const fans = table({rows: [tr([td({content: table({rows: fanins})}), td({content: table({rows: fanouts})})])]});
      const header = table({bgcolor: netColor(net), rows: [tr([id]), name]});
      const file = table({cellpadding: 4, rows: [tr([td({content: font({content: `${basename(net.$loc.filename)}:${net.$loc.pos}`})})]), sigs, action]});;
      const node = table({rows: [tr([td({content: header})]), tr([td({content: file})]), tr([td({align: "center", content: fans})])]});
      
      console.log(`${net.id} [fontname = "Courier New" shape = "none" label = <${node}>];`);
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
