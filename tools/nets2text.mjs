#!/usr/bin/env nodejs
/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/tools/nets2text.mjs           */
/*    -------------------------------------------------------------    */
/*    Author      :  manuel serrano                                    */
/*    Creation    :  Thu Nov 30 07:21:01 2023                          */
/*    Last change :  Wed Mar  5 13:10:08 2025 (serrano)                */
/*    Copyright   :  2023-25 manuel serrano                            */
/*    -------------------------------------------------------------    */
/*    Generate a TEXT file from a netlist.                             */
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
/*    global constants                                                 */
/*---------------------------------------------------------------------*/
const TYPES = {
   "REG": "REG",
   "ACTION": "ACT",
   "AND": "AND",
   "OR": " OR",
   "FALSE": "  0",
   "TRUE": "  1",
   "SIG": "SIG",
   "SIGACTION": "EMT",
   "TEST": "TST",
   "WIRE": "WIR"
}

/*---------------------------------------------------------------------*/
/*    PADDINGS ...                                                     */
/*---------------------------------------------------------------------*/
const PADDINGS = [ "", " ", "  ", "   " ];

/*---------------------------------------------------------------------*/
/*    padding ...                                                      */
/*---------------------------------------------------------------------*/
function padding(s, pad, right) {
   if ((typeof s) !== "string") {
      padding("", pad, right);
   } else if (s.length > pad) {
      return s.substring(0, pad);
   } else {
      const p = pad - s.length;

      if (p === 0) {
	 return s;
      } else {
	 if (!(p in PADDINGS)) {
	    PADDINGS[p] = Array.from({length: p}, (n, i) => " ").join("");
	 }
	 if (right) {
	    return PADDINGS[p] + s;
	 } else {
	    return s + PADDINGS[p];
	 }
      }
   }
}

/*---------------------------------------------------------------------*/
/*    num ...                                                          */
/*---------------------------------------------------------------------*/
function num(n, pad) {
   const s = n + "";

   return padding(n + "", pad, true);
}

/*---------------------------------------------------------------------*/
/*    expr ...                                                         */
/*---------------------------------------------------------------------*/
function expr(n) {
   switch (n.type) {
      case "REG":
	 return " (" + n.$name + ")";
      case "FALSE":
	 return "";
      case "TRUE":
	 return "";
      case "OR":
	 return "="
	    + n.fanin.map(f => f.polarity ? f.id : "!" + f.id).join(" v ");
      case "SIG":
      case "ACTION": 
      case "SIGACTION": 
      case "TEST":
      case "AND":
	 return "="
	    + n.fanin.map(f => f.polarity ? f.id : "!" + f.id).join(" ^ ");
      case "WIRE":
	 return "";
      default: 
 	 return "???";
   }
}

/*---------------------------------------------------------------------*/
/*    main ...                                                         */
/*---------------------------------------------------------------------*/
function main(argv) {
   const info = JSON.parse(readFileSync(argv[2]));
   info.nets.sort((x, y) => x.id < y.id).forEach(n => {
      console.log(`[${TYPES[n.type]}] ${padding(n.$ast + "@" + n.$loc.pos, 12, false)} | ${padding(n.$name, 40)} | ${num(n.id, 5)}${expr(n)} => {${n.fanout.map(f => f.id + "").join(", ")}} <= {${n.fanin.map(f => f.id + "").join(", ")}}`);
   });
}

/*---------------------------------------------------------------------*/
/*    top level                                                        */
/*---------------------------------------------------------------------*/
main(process.argv);

