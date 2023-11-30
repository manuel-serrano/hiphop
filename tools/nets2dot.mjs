#!/usr/bin/env nodejs
/*=====================================================================*/
/*    serrano/prgm/project/hiphop/1.3.x/tools/nets2dot.mjs             */
/*    -------------------------------------------------------------    */
/*    Author      :  manuel serrano                                    */
/*    Creation    :  Thu Nov 30 07:21:01 2023                          */
/*    Last change :  Thu Nov 30 14:42:32 2023 (serrano)                */
/*    Copyright   :  2023 manuel serrano                               */
/*    -------------------------------------------------------------    */
/*    Generate a DOT file from a netlist.                              */
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
	 return `<table border="0" cellborder="${cellborder ?? "0"}" cellspacing="${cellspacing ?? "0"}" cellpadding="${cellpadding ?? "0"}" bgcolor="${bgcolor ?? "#cccccc"}" color="${color ?? "black"}"> ${rows.join("")}</table>`;
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
	 case "OR": return "red";
	 case "AND": return "green";
	 case "REG": return "yellow";
	 default: return "gray85";
      }
   }

   function fanoutPort(fanin, fanout) {
      const fanins = fanout.fanin;
      let i;

      for (i = 0; i < fanins.length; i++) {
	 if (fanins[i].id === fanin.id) break;
      }

      if (i === fanins.length) {
	 console.error("FANIN=", fanin);
	 console.error("FANOUT=", fanout);
	 console.error("-- ", fanins[0].id === fanin.id);
	 throw "Cannot find fanin:" + fanin.id + " fanout:" + fanout.id;
      }
      
      return fanout.fanout.length + i;
   }
   
   const info = JSON.parse(readFileSync(argv[2]));
   console.log(`digraph "${argv[2]}" { graph [splines = true overlap = false rankdir = "TD"];`);
   info.nets.forEach(net => {
      const id = td({content: `${net.id} [${net.type}]`});
      const name = td({content: net.name});
      const fanouts = net.fanout.map((n, i, arr) => tr([port(n, i, "&bull;")]))
      const fanins = net.fanin.map((n, i, arr) => tr([port(n, i + net.fanout.length, n.polarity ? "+" : "-", "left")]))
      const fans = table({rows: [tr([td({content: table({rows: fanins})}), td({content: table({rows: fanouts})})])]});
      const header = table({bgcolor: netColor(net), rows: [tr([id]), tr([name])]});
      const debug = table({bgcolor: netColor(net), rows: [tr([name])]});
      const file = table({cellpadding: 4, rows: [tr([td({content: font({content: `${basename(net.loc.filename)}:${net.loc.pos}`})})])]});
      const node = table({rows: [tr([td({content: header})]), tr([td({content: file})]), tr([td({align: "center", content: fans})])]});
      
      console.log(`${net.id} [fontname = "Courier New" shape = "none" label = <${node}>];`);
   });
      

   info.nets.forEach(net => {
      for (let i = 0; i < net.fanout.length > 0; i++) {
	 console.log(`${net.id}:${i} :e -> ${net.fanout[i].id}:${fanoutPort(net, info.nets.find(n => n.id === net.fanout[i].id))} :w;`);
      }
   });
	 
   console.log("}");
}

/*---------------------------------------------------------------------*/
/*    top level                                                        */
/*---------------------------------------------------------------------*/
main(process.argv);
