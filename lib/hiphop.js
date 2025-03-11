/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/lib/hiphop.js                 */
/*    -------------------------------------------------------------    */
/*    Author      :  Colin Vidal                                       */
/*    Creation    :  Mon Jul 16 11:23:59 2018                          */
/*    Last change :  Mon Feb 10 09:45:43 2025 (serrano)                */
/*    Copyright   :  2018-25 Manuel Serrano                            */
/*    -------------------------------------------------------------    */
/*    HipHop language definition                                       */
/*=====================================================================*/
"use strict"
"use hopscript"

/*---------------------------------------------------------------------*/
/*    es6 module                                                       */
/*---------------------------------------------------------------------*/
import { ReactiveMachine } from "./machine.js";
import { parseString } from "../preprocessor/parser.js";
import { reportCausalityError } from "./causality-report.mjs";
import { writeFileSync } from "node:fs";

export * from "./machine.js";
export * from "./lang.js";
export { IN, OUT, INOUT } from "./ast.js";

/*---------------------------------------------------------------------*/
/*    compileString ...                                                */
/*---------------------------------------------------------------------*/
export function compileString(str) {
   return parseString(`(() => {return ${str}})()\n`).generate({}).toString();
}

/*---------------------------------------------------------------------*/
/*    machineDumpNets ...                                              */
/*    -------------------------------------------------------------    */
/*    Executed when the machine.dumpNets options is true or when       */
/*    the shell environment variable HIPHOP_DUMPNET is true            */
/*    (see machine.js).                                                */
/*---------------------------------------------------------------------*/
function machineDumpNets(machine, sweep, suffix) {
   const filename = machine.nets[0].astNode.loc.filename ?? "nets";
   const dump = {
      filename: filename,
      sweep: sweep,
      nets: machine.nets.map(net => net.dump())
   };

   writeFileSync(filename + suffix, JSON.stringify(dump));
}

/*---------------------------------------------------------------------*/
/*    server side initialization                                       */
/*---------------------------------------------------------------------*/
ReactiveMachine.setCausalityHandler(reportCausalityError);
ReactiveMachine.setDumpNets(machineDumpNets);
