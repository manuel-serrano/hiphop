#!/usr/bin/env nodejs
/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/tools/nets2dot.mjs            */
/*    -------------------------------------------------------------    */
/*    Author      :  manuel serrano                                    */
/*    Creation    :  Thu Nov 30 07:21:01 2023                          */
/*    Last change :  Tue Jan  7 07:06:00 2025 (serrano)                */
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
	 case "ACTION+":
	 case "ACTION-":
	 case "ACTION": return "orange";
	 case "SIG": return "red";
	 default: return "gray85";
      }
   }

   function fanoutPort(src, tgt) {
      const fanins = tgt.fanin;
      let i;

      for (i = 0; i < fanins.length; i++) {
	 if (fanins[i].id === src.id) break;
      }

      if (i === fanins.length) {
	 console.error("SRC=", SRC);
	 console.error("TGT=", tgt);
	 console.error("-- ", fanins[0].id === fanin.id);
	 throw "Cannot find fanin:" + fanin.id + " tgt:" + tgt.id;
      }
      
      return { polarity: fanins[i].polarity, index: tgt.fanout.length + i };
   }
   
   const info = JSON.parse(readFileSync(argv[2]));
   console.log(`digraph "${argv[2]}" { graph [splines = true overlap = false rankdir = "LR"];`);
   info.nets.forEach(net => {
      const id = td({content: `${net.id} [${net.type}:${net.lvl}]${(net.sweepable ? "" : "*")}`});
      const name = td({content: net.name ? net.name : ""});
      const sigs = td({content: net.signals ? "[" + net.signals + "]" : ""});
      const action = td({content: net.action ? net.action : ""});
      const fanouts = net.fanout.map((n, i, arr) => tr([port(n, i, "&bull;")]))
      const fanins = net.fanin.map((n, i, arr) => tr([port(n, i + net.fanout.length, "&bull;", "left")]))
      const fans = table({rows: [tr([td({content: table({rows: fanins})}), td({content: table({rows: fanouts})})])]});
      const header = table({bgcolor: netColor(net), rows: [tr([id]), tr([name])]});
      const file = table({cellpadding: 4, rows: [tr([td({content: font({content: `${basename(net.loc.filename)}:${net.loc.pos}`})})]), tr([sigs]), tr([action])]});;
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
	 const { polarity, index } = fanoutPort(s, t);
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
