/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/testrandom/prop.mjs           */
/*    -------------------------------------------------------------    */
/*    Author      :  robby findler & manuel serrano                    */
/*    Creation    :  Tue May 27 16:44:27 2025                          */
/*    Last change :  Tue May 27 20:33:21 2025 (serrano)                */
/*    Copyright   :  2025 robby findler & manuel serrano               */
/*    -------------------------------------------------------------    */
/*    Testing execution engines and compilers                          */
/*=====================================================================*/
import * as hh from "../lib/hiphop.js";
import * as hhapi from "../lib/ast.js";

/*---------------------------------------------------------------------*/
/*    run ...                                                          */
/*---------------------------------------------------------------------*/
function run(mach, count = 10) {
   const res = [];
   let sigs = [];
   mach.debug_emitted_func = emitted => {
      sigs = emitted.map(n => n);
   }
   for (let i = 0; i < count; i++) {
      try {
	 sigs = "";
	 mach.react();
	 res.push(sigs);
      } catch(e) {
	 res.push("error");
	 return res;
      }
   }
   return res;
}

/*---------------------------------------------------------------------*/
/*    failure ...                                                      */
/*---------------------------------------------------------------------*/
function failure(prog, mach0, machN, msg) {
   const jsonprog = prog.tojson();
   const jsonstr = JSON.stringify(jsonprog);
   const machines = [ mach0, machN ];
      
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
   } else {
      return x === y;
   }
}

/*---------------------------------------------------------------------*/
/*    makeProp ...                                                     */
/*---------------------------------------------------------------------*/
function makeProp(...machCtor) {
   return prog => {
      const machs = machCtor.map(ctor => ctor(prog));
      const r0 = run(machs[0]);

      for (let i = 1; i < machCtor.length; i++) {
	 const ri = run(machs[i]);

	 for (let j = 0; j < Math.max(r0.length, ri.length); j++) {
	    if (j >= r0.length || j >= ri.length) {
	       return failure(prog, machs[0], machs[i], `reaction numbers ${r0.length} / ${ri.length}`);
	    }
	    if (r0[j].status !== ri[j].status) {
	       return failure(prog, machs[0], machs[i], `status @ #${j}: ${r0[j].status} / ${ri[j].status}`);
	    }
	    if (!equal(r0[j].result, ri[j].result)) {
	       return failure(prog, machs[0], machs[i], `results @ #${j}: ${JSON.stringify(r0[j].result)} / ${JSON.stringify(ri[j].result)}`);
	    }
	 }
      }
      return { status: "success" };
   }
}

export const prop = makeProp(
   prg => new hh.ReactiveMachine(prg, { name: "colin-no-sweep", verbose: -1, sweep: 0 }),
   prg => new hh.ReactiveMachine(prg, { name: "colin-sweep-wire", verbose: -1, sweep: -1 }),
   prg => new hh.ReactiveMachine(prg, { name: "colin-sweep", verbose: -1 })
   //prg => new hh.ReactiveMachine(prg, { name: "new", compiler: "new", unrollLoops: true, syncReg: true }),
/*    prg => new hh.ReactiveMachine(prg, { name: "new-nounroll", compiler: "new", unrollLoops: false, syncReg: true }) */
);





