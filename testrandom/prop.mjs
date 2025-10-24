/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/testrandom/prop.mjs           */
/*    -------------------------------------------------------------    */
/*    Author      :  robby findler & manuel serrano                    */
/*    Creation    :  Tue May 27 16:44:27 2025                          */
/*    Last change :  Fri Oct 24 17:17:59 2025 (serrano)                */
/*    Copyright   :  2025 robby findler & manuel serrano               */
/*    -------------------------------------------------------------    */
/*    Testing execution engines and compilers                          */
/*=====================================================================*/
import * as hh from "../lib/hiphop.js";
import * as hhapi from "../lib/ast.js";
import { jsonToHiphop } from "./dump.mjs";

export { makeProp };

/*---------------------------------------------------------------------*/
/*    runMach ...                                                      */
/*---------------------------------------------------------------------*/
function runMach(mach, events) {
   let res = [];
   for (let i = 0; i < events.length; i++) {
      try {
	 res.push({ status: "success", signals: mach.react(events[i]) });
      } catch(e) {
	 res.push({ status: "failure" });
	 return res;
      }
   }
   if ("end" in mach) {
      res = mach.end();
   }

   return res;
}

/*---------------------------------------------------------------------*/
/*    failure ...                                                      */
/*---------------------------------------------------------------------*/
function failure(prog, mach0, machN, msg) {
   const jsonprog = prog.tojson();
   const jsonstr = JSON.stringify(jsonprog);
   const machines = [mach0, machN];
      
   return { status: "failure", prog, msg, machines };
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
/*    makeProp ...                                                     */
/*---------------------------------------------------------------------*/
function makeProp(...machCtor) {
   return (prog, events) => {
      try {
	 const machs = machCtor.map(ctor => ctor(prog));
	 const r0 = runMach(machs[0], events);

	 for (let i = 1; i < machCtor.length; i++) {
	    const ri = runMach(machs[i], events);

	    if (r0[r0.length - 1].status !== "failure" || ri[ri.length - 1].status !== "failure") {
	       for (let j = 0; j < Math.max(r0.length, ri.length); j++) {
		  if (j >= r0.length || j >= ri.length) {
		     return failure(prog, machs[0], machs[i], `reaction numbers ${r0.length} / ${ri.length}`);
		  }
		  if (r0[j].status !== ri[j].status) {
		     return failure(prog, machs[0], machs[i], `status @ #${j}: ${r0[j].status} / ${ri[j].status}`);
		  }
		  if (!equal(r0[j].signals, ri[j].signals)) {
		     return failure(prog, machs[0], machs[i], `results @ #${j}: ${JSON.stringify(r0[j].signals)} / ${JSON.stringify(ri[j].signals)}`);
		  }
	       }
	    }
	 }
	 return { status: "success" };
      } catch(e) {
	 console.error("*** Execution error...");
	 console.error(jsonToHiphop(prog.tojson()));
	 console.error(JSON.stringify(prog.tojson()));
	 throw e;
      }
   }
}
