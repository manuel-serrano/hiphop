/*=====================================================================*/
/*    serrano/prgm/project/hiphop/1.3.x/lib/hiphop.js                  */
/*    -------------------------------------------------------------    */
/*    Author      :  Colin Vidal                                       */
/*    Creation    :  Mon Jul 16 11:23:59 2018                          */
/*    Last change :  Fri Feb  2 08:45:29 2024 (serrano)                */
/*    Copyright   :  2018-24 Manuel Serrano                            */
/*    -------------------------------------------------------------    */
/*    HipHop language definition                                       */
/*=====================================================================*/
"use strict"
"use hopscript"

/*---------------------------------------------------------------------*/
/*    es6 module                                                       */
/*---------------------------------------------------------------------*/
export * from "./hiphop-client.mjs";
import { ReactiveMachine } from "./machine.js";
import { parseString } from "../preprocessor/parser.js";
import { reportCausalityError } from "./causality-report.mjs";
import { writeFileSync } from "node:fs";

/*---------------------------------------------------------------------*/
/*    compileString ...                                                */
/*---------------------------------------------------------------------*/
export function compileString(str) {
   return parseString(`(() => {return ${str}})()\n`).generate().toString();
}

/*---------------------------------------------------------------------*/
/*    machineDumpNets ...                                              */
/*    -------------------------------------------------------------    */
/*    Executed when the machine.dumpNets options is true or when       */
/*    the shell environment variable HIPHOP_DUMPNET is true            */
/*    (see machine.js).                                                */
/*---------------------------------------------------------------------*/
function machineDumpNets(machine, sweep, suffix) {
   const filename = machine.nets[0].ast_node.loc.filename ?? "nets";
   const dump = {
      sweep: sweep,
      nets: machine.nets.map(net => net.dump())
   };

   fs.writeFileSync(filename + suffix, JSON.stringify(dump));
}
/*---------------------------------------------------------------------*/
/*    server side initialization                                       */
/*---------------------------------------------------------------------*/
ReactiveMachine.setCausalityHandler(reportCausalityError);
ReactiveMachine.setDumpNets(machineDumpNets);
