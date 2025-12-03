#!/bin/env node
/*=====================================================================*/
/*    .../project/hiphop/hiphop/testrandom/esterel-outparse.mjs        */
/*    -------------------------------------------------------------    */
/*    Author      :  Manuel Serrano                                    */
/*    Creation    :  Sat Nov 22 08:43:56 2025                          */
/*    Last change :  Wed Dec  3 13:47:53 2025 (serrano)                */
/*    Copyright   :  2025 Manuel Serrano                               */
/*    -------------------------------------------------------------    */
/*    Parsing the JSON output of an esterel execution.                 */
/*=====================================================================*/

import { readSync } from "node:fs";

const buffer = Buffer.alloc(10000);
const n = readSync(0, buffer);
const j = JSON.parse(buffer.toString("utf8", 0, n));

for (let i = 0; i < j.length; i++) {
   if (j[i].status === "trouble") {
      console.log("esterel[" + i + "]:", j[i].msg);
      break;
   } else {
      console.log("esterel[" + i + "]:", j[i].signals);
   }
}


