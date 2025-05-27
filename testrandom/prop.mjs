/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/testrandom/prop.mjs           */
/*    -------------------------------------------------------------    */
/*    Author      :  robby findler & manuel serrano                    */
/*    Creation    :  Tue May 27 16:44:27 2025                          */
/*    Last change :                                                    */
/*    Copyright   :  2025 robby findler & manuel serrano               */
/*    -------------------------------------------------------------    */
/*    Testing execution engines and compilers                          */
/*=====================================================================*/
import * as hh from "../lib/hiphop.js";
import * as hhapi from "../lib/ast.js";
import { jsonToHiphop } from "./dump.mjs";

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


function failure(prog, mach0, machN, msg, fmt = "src") {
   const jsonprog = prog.tojson();
   const jsonstr = JSON.stringify(jsonprog);
   if (fmt === "src") {
      const hhprog = jsonToHiphop(jsonprog);
      console.error(`${jsonstr}` + `"${mach0.name()}"/"${machN.name()}": ${msg}`);
      console.error(hhprog);
      
      return hhprog;
   } else {
      return `${jsonstr}` + `"${mach0.name()}"/"${machN.name()}": ${msg}`;
   }
}

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

function makeProp(...machCtor) {
   return prog => {
      const machs = machCtor.map(ctor => ctor(prog));
      const v0 = run(machs[0]);

      for (let i = 1; i < machCtor.length; i++) {
	 const v = run(machs[i]);

	 for (let r = 0; r < Math.max(v0.length, v.length); r++) {
	    if (r >= v0.length || r >= v.length) {
	       return failure(prog, machs[0], machs[i], `Number of reactions differs`);
	    }
	    if (!equal(v0[r], v[r])) {
	       return failure(prog, machs[0], machs[i], `Results differ at reaction #${r}\n  v0=${v0[r]}\n  vr=${v[r]}`);
	    }
	 }
      }
   }
   return false;
}

export const prop = makeProp(
   prg => new hh.ReactiveMachine(prg, { name: "colin" }),
   prg => new hh.ReactiveMachine(prg, { name: "new", compiler: "new", unrollLoops: true, syncReg: true }),
   prg => new hh.ReactiveMachine(prg, { name: "new-nounroll", compiler: "new", unrollLoops: false, syncReg: true }));





