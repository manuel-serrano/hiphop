/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/testrandom/gen.mjs            */
/*    -------------------------------------------------------------    */
/*    Author      :  robby findler & manuel serrano                    */
/*    Creation    :  Tue May 27 17:28:51 2025                          */
/*    Last change :  Fri Nov 28 11:33:31 2025 (serrano)                */
/*    Copyright   :  2025 robby findler & manuel serrano               */
/*    -------------------------------------------------------------    */
/*    HipHop program random generator                                  */
/*=====================================================================*/
import * as hh from "../lib/hiphop.js";
import * as config from "./config.mjs";
import { jsonToHiphop } from "./json.mjs";

export { gen, genreactsigs, gensym };

/*---------------------------------------------------------------------*/
/*    gensymCnt ...                                                    */
/*---------------------------------------------------------------------*/
let gensymCnt = 1;

/*---------------------------------------------------------------------*/
/*    gensym ...                                                       */
/*---------------------------------------------------------------------*/
function gensym(base = "g") {
   return base + gensymCnt++;
}

/*---------------------------------------------------------------------*/
/*    choose ...                                                       */
/*    -------------------------------------------------------------    */
/*    accepts a list of pairs of weights and thunks                    */
/*    returns the result of calling one of the thunks,                 */
/*    choosing one randomly, but based on the weights                  */
/*    eg, choose([[1,() => "a"],[3,() => "b"]])                        */
/*    will return "a" with probability 1/4 and "b"                     */
/*    with probability 3/4.                                            */
/*---------------------------------------------------------------------*/
function choose(env, size, ...entries) {
   let rnd = Math.random();
   let sum = 0;
   entries.forEach(e => sum += e[0]);

   for (let i = 0; i < entries.length; i++) {
      const w = entries[i][0] / sum;

      if (rnd < w) {
	return entries[i][1](env, size);
      } else {
	 rnd -= w;
      }
   }
   throw new Error("should not be here...");
}

function testChoose() {
   const entries = [0, 0, 0, 0];
   
   for (let i = 10000; i >= 0; i--) {
      choose(undefined, undefined, [3,() => entries[0]++],
	     [1,() => entries[1]++],
	     [1,() => entries[2]++],
	     [1,() => entries[3]++]);
   }
   console.log(entries);
}

// testChoose();

/*---------------------------------------------------------------------*/
/*    randomInRange ...                                                */
/*    -------------------------------------------------------------    */
/*    returns a random integer in the set [a,b],                       */
/*    ie, a and b are both possible results                            */
/*---------------------------------------------------------------------*/
function randomInRange(a, b) {
   const r = Math.random();
   return a + Math.floor((b - a + 1) * r);
}

function testRandomInRange() {
   const entries = [0, 0, 0, 0, 0];
   
   for (let i = 10000; i >= 0; i--) {
      entries[randomInRange(1, 3)]++;
   }
   console.log(entries);
}


// testRandomInRange();

/*---------------------------------------------------------------------*/
/*    genExpr ...                                                      */
/*---------------------------------------------------------------------*/
function genExpr(env) {
   
   function gen(env, size) {
      if (size === 0 || env.signals.length === 0) {
	 return (Math.random() >= 0.5) ? "true" : "false";
      } else if (size === 1 &&  !config.DELAYONLY) {
	 const i = Math.floor(Math.random() * env.signals.length);
	 const sig = env.signals[i];
	 const axs = (Math.random() >= 0.8) ? "preval" : "nowval";
	 return `this.${sig}.${axs}`;
      } else {
	 switch (Math.floor(Math.random() * 6)) {
	    case 0: return `!${gen(env, size - 1)}`;
	    case 1:
	    case 2:
	    case 3: return `(${gen(env, size - 1)} && ${gen(env, size - 1)})`;
	    case 4:
	    case 5:
	    case 6: return `(${gen(env, size - 1)} || ${gen(env, size - 1)})`;
	 }
      }
   }

   const expr = gen(env, 1 + Math.round(Math.random() * 2));
   return eval(`(function() { return ${expr}; })`);
}

/*---------------------------------------------------------------------*/
/*    genDelay ...                                                     */
/*---------------------------------------------------------------------*/
function genDelay(env) {
   
   function gen(env, size) {
      if (size === 1) {
	 const i = Math.floor(Math.random() * env.signals.length);
	 const sig = env.signals[i];
	 const prop = (Math.random() >= 0.8) ? "pre" : "now";
	 const delay = new hh.DelaySig(sig, prop);

	 if (Math.random() >= 0.7) {
	    return new hh.DelayUnary("!", delay);
	 } else {
	    return delay;
	 }
      } else {
	 const lhs = gen(env, size - 1);
	 const rhs = gen(env, size - 1);
	 const op = Math.random() >= 0.5 ? "&&" : "OR";
	 const delay = new hh.DelayBinary(op, lhs, rhs);

	 if (Math.random() >= 0.9) {
	    return new hh.DelayUnary("!", delay);
	 } else {
	    return delay;
	 }
      }
   }
   
   return gen(env, 1 + Math.round(Math.random() * 2));
}

/*---------------------------------------------------------------------*/
/*    genTestExpr ...                                                  */
/*---------------------------------------------------------------------*/
function genTestExpr(env) {
   if (config.DELAYONLY || (Math.random() >= 0.2)) {
      return genDelay(env);
   } else {
      return genExpr(env);
   }
}

/*---------------------------------------------------------------------*/
/*    genEmitValue ...                                                 */
/*---------------------------------------------------------------------*/
function genEmitValue() {
   return 1 + Math.floor(Math.random() * 100);
}

/*---------------------------------------------------------------------*/
/*    choice ...                                                       */
/*---------------------------------------------------------------------*/
function choice(weight, gen) {
   return [ weight, gen ];
}

/*---------------------------------------------------------------------*/
/*    genSequence ...                                                  */
/*---------------------------------------------------------------------*/
function genSequence(weight) {
   const gen = (env, size) => {
      const n = randomInRange(0, size - 1);
      return hh.SEQUENCE({}, genStmt(env, size - n - 1), genStmt(env, n))
   };
   return choice(weight, gen);
}

/*---------------------------------------------------------------------*/
/*    genFork ...                                                      */
/*---------------------------------------------------------------------*/
function genFork(weight) {
   const gen = (env, size) => {
      const l = Math.round(Math.random() * 5);
      let children = [];
      for (let i = 0; i < l - 1; i++) {
	 const n = randomInRange(0, size - 1);
	 children[ i ] = genStmt(env, size - n - 1);
	 size -= n;
      }
      if (l > 0) {
	 children[ l - 1 ] = genStmt(env, size);
      }
      return hh.FORK({}, ...children);
   }
   return choice(weight, gen);
}

/*---------------------------------------------------------------------*/
/*    genLoop ...                                                      */
/*---------------------------------------------------------------------*/
function genLoop(weight) {
   const gen = (env, size) => {
      return hh.LOOP({}, genStmt(env, size - 1));
   };
   return choice(weight, gen);
}

/*---------------------------------------------------------------------*/
/*    genLocal ...                                                     */
/*---------------------------------------------------------------------*/
function genLocal(weight) {
   const gen = (env, size) => {
      const l = Math.round(1 + Math.random() * 4);
      const names = Array.from({length: l}).map(c => gensym());
      const attrs = {};
      const signals = env.signals.concat(names);
      const nenv = Object.assign({}, env);
      nenv.signals = nenv.signals.concat(signals);
      names.forEach(name => attrs[name] = { signal: name, name, accessibility: hh.INOUT, combine: (x, y) => (x + y) });

      return hh.LOCAL(attrs, genStmt(nenv, size - 1));
   };
   return choice(weight, gen);
}

/*---------------------------------------------------------------------*/
/*    genIf ...                                                        */
/*---------------------------------------------------------------------*/
function genIf(weight) {
   const gen = (env, size) => {
      const expr = genExpr(env);
      return hh.IF({apply: expr}, genStmt(env, size - 1), genStmt(env, size - 1));
   };
   return choice(weight, gen);
}

/*---------------------------------------------------------------------*/
/*    genPresent ...                                                   */
/*---------------------------------------------------------------------*/
function genPresent(weight) {
   const gen = (env, size) => {
      const expr = genDelay(env);
      return hh.IF({apply: expr}, genStmt(env, size - 1), genStmt(env, size - 1));
   };
   return choice(weight, gen);
}

/*---------------------------------------------------------------------*/
/*    genTrap ...                                                      */
/*---------------------------------------------------------------------*/
function genTrap(weight) {
   const gen = (env, size) => {
      const trap = gensym("trap");
      const nenv = Object.assign({}, env);
      nenv.traps = [trap, ...nenv.traps];
      return hh.TRAP({[trap]: trap}, genStmt(nenv, size - 1));
   };
   return choice(weight, gen);
}

/*---------------------------------------------------------------------*/
/*    genAbort ...                                                     */
/*---------------------------------------------------------------------*/
function genAbort(weight) {
   const gen = (env, size) => {
      if (env.signals.length > 0) {
	 return hh.ABORT({apply: genDelay(env)}, genStmt(env, size - 1));
      } else {
	 return genStmt(env, size);
      }
   };
   return choice(weight, gen);
}

/*---------------------------------------------------------------------*/
/*    genEvery ...                                                     */
/*---------------------------------------------------------------------*/
function genEvery(weight) {
   const gen = (env, size) => {
      if (env.signals.length > 0) {
	 return hh.EVERY({apply: genDelay(env)}, genStmt(env, size - 1));
      } else {
	 return genStmt(env, size);
      }
   };
   return choice(weight, gen);
}

/*---------------------------------------------------------------------*/
/*    genLoopeach ...                                                  */
/*---------------------------------------------------------------------*/
function genLoopeach(weight) {
   const gen = (env, size) => {
      if (env.signals.length > 0) {
	 return hh.LOOPEACH({apply: genDelay(env)}, genStmt(env, size - 1));
      } else {
	 return genStmt(env, size);
      }
   }
   return choice(weight, gen);
}

/*---------------------------------------------------------------------*/
/*    genAwait ...                                                     */
/*---------------------------------------------------------------------*/
function genAwait(weight) {
   const gen = (env, size) => {
      if (env.signals.length > 0) {
	 return hh.AWAIT({apply: genDelay(env)});
      } else {
	 return genStmt(env, size);
      }
   };
   return choice(weight, gen);
}

/*---------------------------------------------------------------------*/
/*    genNothing ...                                                   */
/*---------------------------------------------------------------------*/
function genNothing(weight) {
   const gen = (env, size) => hh.NOTHING({});
   return choice(weight, gen);
}

/*---------------------------------------------------------------------*/
/*    genPause ...                                                     */
/*---------------------------------------------------------------------*/
function genPause(weight) {
   const gen = (env, size) => hh.PAUSE({});
   return choice(weight, gen);
}

/*---------------------------------------------------------------------*/
/*    genAtom ...                                                      */
/*---------------------------------------------------------------------*/
function genAtom(weight) {
      const gen = (env, size) => {
	 const expr = genExpr(env);
	 return hh.ATOM({apply: expr});
      };
      return choice(weight, gen);
   }

/*---------------------------------------------------------------------*/
/*    genHalt ...                                                      */
/*---------------------------------------------------------------------*/
function genHalt(weight) {
   const gen = (env, size) => hh.HALT({});
   return choice(weight, gen);
}

/*---------------------------------------------------------------------*/
/*    genExit ...                                                      */
/*---------------------------------------------------------------------*/
function genExit(weight) {
   const gen = (env, size) => {
      const i = Math.floor(Math.random() * env.traps.length);
      const attr = { [env.traps[i]]: env.traps[i] };
      return hh.EXIT(attr);
   };
   return choice(weight, gen);
}

/*---------------------------------------------------------------------*/
/*    genEmit ...                                                      */
/*---------------------------------------------------------------------*/
function genEmit(weight) {
   const gen = (env, size) => {
      const i = Math.floor(Math.random() * env.signals.length);
      const sig = env.signals[i];
      const val = genEmitValue();
      return hh.EMIT({signame: env.signals[i], apply: (env, size) => val});
   };
   return choice(weight, gen);
}

/*---------------------------------------------------------------------*/
/*    genStmt ...                                                      */
/*    -------------------------------------------------------------    */
/*    returns an esterel expression of size `size`,                    */
/*    that might refer to the variables in `env`                       */
/*    (at the moment, never generates references nor binders, alas)    */
/*---------------------------------------------------------------------*/
function genStmt(env, size) {
   if (size !== 0) {
      return choose(env, size,
	 genSequence(100),
	 genFork(50),
	 genLoop(10),
	 genLocal(30),
	 genIf(20),
         genPresent(env.signals.length ? 40 : 0),
	 genTrap(10),
	 genAbort(20),
	 genEvery(30),
	 genLoopeach(30));
   } else if (env.signals.length === 0 && env.traps.length === 0) {
      return choose(env, size,
         genNothing(10),
	 genPause(20),
	 genAtom(10));
   } else if (env.signals.length === 0) {
      return choose(env, size,
	 genNothing(3),
	 genPause(10),
	 genAtom(6),
	 genExit(1),
	 genHalt(1));
   } else if (env.traps.length === 0) {
      return choose(env, size,
	 genNothing(3),
	 genPause(10),
	 genAtom(5),
         genEmit(8),
         genAwait(1),
	 genHalt(1));
   } else {
      return choose(env, size,
	 genNothing(5),
	 genPause(10),
	 genAtom(4),
	 genEmit(6),
         genAwait(1),
	 genExit(1),
	 genHalt(1));
   }
}

/*---------------------------------------------------------------------*/
/*    gen ...                                                          */
/*    -------------------------------------------------------------    */
/*    Generates a random program.                                      */
/*---------------------------------------------------------------------*/
function gen({filters, minsize = config.MINSIZE, maxsize = config.MAXSIZE}) {
   while (true) {
      const l = Math.round(Math.random() * 4);
      const signals = Array.from({length: l}).map(c => gensym());
      const events = Array.from({length: 8}).map(i => genreactsigs(signals))
      const size = randomInRange(minsize, maxsize);
      const body = genStmt({signals: signals, traps: []}, size);
      const attrs = {};
      signals.forEach(name => attrs[name] = { signal: name, name, accessibility: hh.INOUT, combine: (x, y) => (x + y) });

      try {
	 let prog = hh.MODULE(attrs, body), prog0 = prog;
	 let isok = true;
	 
	 filters.forEach(f => {
	    if (isok) {
	       let err;
	       if (err = f.check(prog)) {
		  isok = false;
		  
		  if (f.patch) {
		     for (let i = (f?.repeat ?? 5); i > 0 ; i--) {
			prog = f.patch(err.prog, err);
			if (err = f.check(prog)) {
			} else {
			   isok = true;
			   break;
			}
		     }
		  }
	       }
	    }
	 });

	 if (isok) {
	    return { prog, events, filters };
	 } else {
	    if (config.VERBOSE > 3) {
	       console.error("*** Cannot fix program");
	       console.error(jsonToHiphop(prog.tojson()));
	    }
	 }
      } catch(e) {
	 console.error("Cannot construct module");
	 console.error(e.toString());
	 throw e;
      }
   }
}

/*---------------------------------------------------------------------*/
/*    genreactsigs ...                                                 */
/*---------------------------------------------------------------------*/
function genreactsigs(signals) {
   const l = Math.round(Math.random() * signals.length);

   if (l === 0) {
      return null;
   } else {
      const obj = {};
      for (let i = 0; i < l; i++) {
	 const j = Math.floor(Math.random() * (l - i));
	 const s = signals[j];
	 obj[s] = genEmitValue();
	 signals[j] = signals[i];
	 signals[i] = s;
      }
      return obj;
   }
}

/*---------------------------------------------------------------------*/
/*    wrap ...                                                         */
/*---------------------------------------------------------------------*/
function wrap(prog, ctor, depth) {
   const children = prog.children;
   let body = children.length === 1 ? children : hh.SEQUENCE({}, children);
   
   while (depth-- > 0) {
      body = ctor({}, body);
   }

   return hh.MODULE({}, body);
}

