/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/testrandom/prop.mjs           */
/*    -------------------------------------------------------------    */
/*    Author      :  robby findler & manuel serrano                    */
/*    Creation    :  Tue May 27 16:44:27 2025                          */
/*    Last change :  Tue Dec 16 16:43:42 2025 (serrano)                */
/*    Copyright   :  2025 robby findler & manuel serrano               */
/*    -------------------------------------------------------------    */
/*    Testing execution engines and compilers                          */
/*=====================================================================*/
import * as hh from "../lib/hiphop.js";
import * as hhapi from "../lib/ast.js";
import { jsonToHiphop } from "./hiphop.mjs";
import * as config from "./config.mjs";
import { filterinstantaneous } from "./filters.mjs";

export { Prop };

/*---------------------------------------------------------------------*/
/*    Prop ...                                                         */
/*---------------------------------------------------------------------*/
class Prop {
   #systems = [];
   config = {
      minSize: config.MINSIZE,
      maxSize: config.MAXSIZE,
      maxLoop: config.MAXLOOP,
      maxTry: config.MAXTRY,
      expr: 1,
      pre: 1,
      present: 3,
      stdlib: 0,
      filters: [ filterinstantaneous ]
   };
   
   constructor(...systems) {
      this.#systems = systems.filter(s => config.SYSTEMS.indexOf(s.name) >= 0);

      if (this.#systems.length === 0) {
	 throw new TypeError("Prop: no system defined");
      } else {
	 console.log("Testing:", this.#systems.map(({name}) => name));
      }
      
      this.#systems.forEach(s => {
	 for (const k in this.config) {
	    if (typeof this.config[k] === "number") {
	       this.config[k] =
		  Math.min(this.config[k], s?.config?.[k] ?? this.config[k]);
	    } else if (Array.isArray(this.config[k])) {
	       this.config[k] =
		  this.config[k].concat(s?.config?.[k] ?? []);
	    }
	 }
      });
   }

   run(conf) {
      let f;

      // check the program
      if (f = this.config.filters.find(f => f.check(this, conf.prog))) {
	 return { status: "reject", reason: f.name() };
      }

      // construct all the reactive machines
      const machs = this.#systems.map(sys => {
	 try {
	    return sys.ctor(conf.prog);
	 } catch (e) {
	    return {
	       reactDebug(_) {
		  throw {
		     status: "error",
		     reason: "compilation",
		     message: e.toString(),
		  }
	       },
	       outConf(suf, conf) {
		  const mach = sys.ctor(hh.MODULE({}, hh.NOTHING()));
		  return mach.outConf(suf, conf);
	       },
	       name() {
		  return sys.name;
	       }
	    }
	 }
      });

      // run all the machiness
      const runs = machs.map(mach => {
	 const res = runMach(mach, conf.events);

	 if (config.VERBOSE >= 1) {
	    console.log(
	       `  |   | ${mach.name}:`
		  + res[res.length-1].status + ` (${res.length})`);
	 }
	 return res;
      });

      try {
	 // compare the execution results
	 if (runs.find(r => r.length !== runs[0].length)) {
	    return {
	       status: "failure",
	       reason: "numbers of reactions",
	       systems: this.#systems,
	       machines: machs,
	       conf,
	       runs
	    };
	 } else if (runs.find(r => r[r.length - 1].status !== runs[0][runs[0].length - 1].status)) {
	    const [ r0, r1 ] = runs;

	    return {
	       status: "failure",
	       reason: "statuses",
	       systems: this.#systems,
	       machines: machs,
	       conf,
	       runs
	    };
	 } else if (runs.find(r => r.find((e, i) => !signalsEqual(e.signals, runs[0][i].signals)))) {
	    return {
	       status: "failure",
	       reason: "signals",
	       systems: this.#systems,
	       machines: machs,
	       conf,
	       runs
	    };
	 } else {
	    return {
	       status: "success",
	       systems: this.#systems,
	       machines: machs,
	       conf,
	       runs
	    }
	 }
      } catch (e) {
	 console.error("*** ERROR while comparing results");
	 runs.forEach(r => console.error(r));
	 throw e;
      }
   }
}

/*---------------------------------------------------------------------*/
/*    signalsEqual ...                                                 */
/*---------------------------------------------------------------------*/
function signalsEqual(x, y) {
   
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
	    e.signals = {};
	    res.push(e);
	 } else {
	    res.push({ status: "trouble", msg: e.toString(), signals: {} });
	 }
	 return res;
      }
   }
   if ("end" in mach) {
      res = mach.end();
   }

   return res;
}

