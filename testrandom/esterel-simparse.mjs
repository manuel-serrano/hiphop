#!/bin/env node
/*=====================================================================*/
/*    .../project/hiphop/hiphop/testrandom/esterel-simparse.mjs        */
/*    -------------------------------------------------------------    */
/*    Author      :  Manuel Serrano                                    */
/*    Creation    :  Fri Nov 21 17:27:45 2025                          */
/*    Last change :  Wed Dec  3 13:43:05 2025 (serrano)                */
/*    Copyright   :  2025 Manuel Serrano                               */
/*    -------------------------------------------------------------    */
/*    Parses the output of an esterel simulation.                      */
/*=====================================================================*/

import { readSync } from "node:fs";

function parseEmissions(signals, emit) {
   let m;
   if (m = emit.match(/([a-zA-Z][a-zA-Z0-9]*)\(([0-9]+)\)[ ]*/)) {
      signals[m[1]] = m[2];
      parseEmissions(signals, emit.substring(m[0].length))
   } else if (m = emit.match(/([a-zA-Z][a-zA-Z0-9]*)[ ]*/)) {
      if (m[1] !== "TRUE") {
	 signals[m[1]] = null;
      }
      parseEmissions(signals, emit.substring(m[0].length));
   } else {
      return;
   }
}
   
function parseSignals(lines, i) {
   const signals = {};
   while (true) {
      let m;

      if (lines[i].match(/[_A-Z][_A-Z0-9]*> /)) {
	 return { signals, i };
      } else if (m = lines[i].match(/--- (?:Local|Output): (.+)/)) {
	 parseEmissions(signals, m[1]);
      } else if (m = lines[i].match(/^[*][*][*] Error: (.+)/)) {
	 throw m[1];
      }
      i++;
   }
}

function parseReaction(lines, i) {
   if (lines[i].match(/[_A-Z][_A-Z0-9]*> !trace signals;/ )) {
      const { i: ni } = parseSignals(lines, i + 1);
      return parseReaction(lines, ni);
   } else if (lines[i].match(/[_A-Z][_A-Z0-9]*> [.]/ )) {
      return { signals: false, i: i + 2 };
   } else if (lines[i].match(/[_A-Z][_A-Z0-9]*> /)) {
      return parseSignals(lines, i + 1);
   } else {
      console.error("Illegal line:", lines[i]);
      console.error(lines);
   }
}

function parse(fd) {
   const buffer = Buffer.alloc(10000);
   const n = readSync(fd, buffer);
   const lines = buffer.toString("utf8", 0, n).split("\n");
   const events = [];
   let i = 0;

   try {
      while (i < lines.length) {
	 const { signals, i: ni } = parseReaction(lines, i);
	 if (signals) {
	    events.push({status: "success", signals});
	 }
	 i = ni;
      }
   } catch(e) {
      events.push({status: "trouble", signals: {}, msg: e});
   }
   
   console.log(JSON.stringify(events));
}

parse(0);
