/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/testrandom/prop.mjs           */
/*    -------------------------------------------------------------    */
/*    Author      :  robby findler & manuel serrano                    */
/*    Creation    :  Tue May 27 16:44:27 2025                          */
/*    Last change :  Mon Nov 17 09:25:38 2025 (serrano)                */
/*    Copyright   :  2025 robby findler & manuel serrano               */
/*    -------------------------------------------------------------    */
/*    Testing execution engines and compilers                          */
/*=====================================================================*/
import * as hh from "../lib/hiphop.js";
import * as hhapi from "../lib/ast.js";
import { jsonToHiphop } from "./json.mjs";
// debug
import { jsonToAst } from "./json.mjs";
import * as fs from "node:fs";

export { makeProp };

/*---------------------------------------------------------------------*/
/*    failure ...                                                      */
/*---------------------------------------------------------------------*/
function failure(prog, mach0, machN, msg, reason) {
   const jsonprog = prog.tojson();
   const jsonstr = JSON.stringify(jsonprog);
   const machines = [mach0, machN];
      
   return { status: "failure", msg, prog, machines, reason };
}

/*---------------------------------------------------------------------*/
/*    equal ...                                                        */
/*---------------------------------------------------------------------*/
function equal(x, y) {
   if ((x instanceof Array) && (y instanceof Array)) {
      if (x.length === y.length) {
	 for (let j = 0; j < x.length; j++) {
	    if (!equal(x[j], y[j])) {
	       return false;
	    }
	 }
	 return true;
      } else {
	 return false;
      }
   } else if ((x instanceof Object) && (y instanceof Object)) {
      for (let k in x) {
	 if (!equal(x[k], y[k])) {
	    return false;
	 }
      }
      for (let k in y) {
	 if (!equal(x[k], y[k])) {
	    return false;
	 }
      }
      return x.constructor === y.constructor;
   } else {
      return x === y;
   }
}

/*---------------------------------------------------------------------*/
/*    signalsEqual ...                                                 */
/*---------------------------------------------------------------------*/
function signalsEqual(x, y) {
   const kx = Object.keys(x);
   const ky = Object.keys(y);

   if (kx.length !== ky.length) {
      return false;
   } else {
      return equal(kx.sort(), ky.sort());
   }
}

/*---------------------------------------------------------------------*/
/*    runMach ...                                                      */
/*---------------------------------------------------------------------*/
function runMach(mach, events) {
   let res = [];
   for (let i = 0; i < events.length; i++) {
      try {
	 const signals = mach.reactDebug(events[i]);
	 res.push({ status: "success", signals });
      } catch (e) {
	 if (e.message !== "Causality error.") {
	    console.error("runMach", e.toString());
	    throw e;
	 }
	 res.push({ status: "error", msg: e.toString() });
	 return res;
      }
   }
   if ("end" in mach) {
      res = mach.end();
   }

   return res;
}

/*---------------------------------------------------------------------*/
/*    makeProp ...                                                     */
/*---------------------------------------------------------------------*/
function makeProp(filter, machCtor) {
   
   function resStatus(res) {
      if (res.status === "failure") {
	 return `failure (${res.msg})`;
      } else {
	 return res.status;
      }
   }


   if (machCtor.length === 0) {
      throw new TypeError("makeProp: no machines defined");
   }
   
   return ({prog, events}, verbose = 0) => {
      if (filter(prog)) {
	 try {
	    const machs = machCtor.map(ctor => ctor(prog));

	    const r0 = runMach(machs[0], events);

	    if (verbose >= 1) {
	       console.error(`   ${machs[0].name()}: ${r0[r0.length-1].status} (${r0.length})`);
	    }
	    
	    for (let i = 1; i < machs.length; i++) {
	       const ri = runMach(machs[i], events);

	       if (verbose >= 1) {
		  console.error(`   ${machs[i].name()}: ${ri[ri.length-1].status} (${ri.length})`);
	       }
	       
	       if (r0.length !== ri.length) {
		  return failure(prog, machs[0], machs[i], `reaction numbers ${r0.length}/${ri.length}`, `reactions (${r0.length}/${ri.length})`);
	       }
	       
	       if (r0[r0.length - 1].status !== "error" || ri[ri.length - 1].status !== "error") {
		  for (let j = 0; j < r0.length; j++) {
		     if (r0[j].status !== ri[j].status) {
			return failure(prog, machs[0], machs[i], `status @ #${j}: ${resStatus(r0[j])} vs ${resStatus(ri[j])}`, "status");
		     }
		     if (!signalsEqual(r0[j].signals, ri[j].signals)) {
			return failure(prog, machs[0], machs[i], `results @ #${j}: ${JSON.stringify(r0[j].signals)} vs ${JSON.stringify(ri[j].signals)}`,
				       JSON.stringify(r0[j].signals) + JSON.stringify(ri[j].signals));
		     }
		  }
	       }
	    }
	    return { status: "success", reason: `(${events.length})` };
	 } catch(e) {
	    console.error("*** Execution error...");
	    console.error(jsonToHiphop(prog.tojson()));
	    console.error(JSON.stringify(prog.tojson()));
	    throw e;
	 }
      } else {
	 return { status: "reject", reason: "filter" };
      }
   }
}
