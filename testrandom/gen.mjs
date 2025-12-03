/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/testrandom/gen.mjs            */
/*    -------------------------------------------------------------    */
/*    Author      :  robby findler & manuel serrano                    */
/*    Creation    :  Tue May 27 17:28:51 2025                          */
/*    Last change :  Wed Dec  3 17:56:42 2025 (serrano)                */
/*    Copyright   :  2025 robby findler & manuel serrano               */
/*    -------------------------------------------------------------    */
/*    HipHop program random generator                                  */
/*=====================================================================*/
import * as hh from "../lib/hiphop.js";
import * as config from "./config.mjs";
import { jsonToHiphop } from "./hiphop.mjs";

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
function choose(conf, env, size, loop, ...entries) {
   let rnd = Math.random();
   let sum = 0;
   entries.forEach(e => sum += e[0]);

   for (let i = 0; i < entries.length; i++) {
      const w = entries[i][0] / sum;

      if (rnd < w) {
	 return entries[i][1](conf, env, size, loop);
      } else {
	 rnd -= w;
      }
   }
   throw new Error("should not be here...");
}

function testChoose() {
   const entries = [0, 0, 0, 0];
   
   for (let i = 10000; i >= 0; i--) {
      choose(undefined, undefined, undefined, [3,() => entries[0]++],
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
function genExpr(conf, env) {
   
   function gen(conf, env, size, loop) {
      if (size === 0 || env.signals.length === 0 || conf.expr === 0) {
	 return (Math.random() >= 0.5) ? "true" : "false";
      } else if (size === 1) {
	 const i = Math.floor(Math.random() * env.signals.length);
	 const sig = env.signals[i];
	 const axs = (conf.pre) ? ((Math.random() >= 0.8) ? "preval" : "nowval") : "nowval";
	 return `this.${sig}.${axs}`;
      } else {
	 switch (Math.floor(Math.random() * 6)) {
	    case 0: return `!${gen(conf, env, size - 1)}`;
	    case 1:
	    case 2:
	    case 3: return `(${gen(conf, env, size - 1)} && ${gen(conf, env, size - 1)})`;
	    case 4:
	    case 5:
	    case 6: return `(${gen(conf, env, size - 1)} || ${gen(conf, env, size - 1)})`;
	 }
      }
   }

   const expr = gen(conf, env, 1 + Math.round(Math.random() * 2));
   return eval(`(function() { return ${expr}; })`);
}

/*---------------------------------------------------------------------*/
/*    genDelay ...                                                     */
/*---------------------------------------------------------------------*/
function genDelay(conf, env) {
   
   function gen(conf, env, size, loop) {
      if (size === 1) {
	 const i = Math.floor(Math.random() * env.signals.length);
	 const sig = env.signals[i];
	 const prop = (conf.pre) ? ((Math.random() >= 0.8) ? "pre" : "now") : "now";
	 const delay = new hh.DelaySig(sig, prop);

	 if (Math.random() >= 0.7) {
	    return new hh.DelayUnary("!", delay);
	 } else {
	    return delay;
	 }
      } else {
	 const lhs = gen(conf, env, size - 1);
	 const rhs = gen(conf, env, size - 1);
	 const op = Math.random() >= 0.5 ? "&&" : "OR";
	 const delay = new hh.DelayBinary(op, lhs, rhs);

	 if (Math.random() >= 0.9) {
	    return new hh.DelayUnary("!", delay);
	 } else {
	    return delay;
	 }
      }
   }
   
   return gen(conf, env, 1 + Math.round(Math.random() * 2));
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
   const gen = (conf, env, size, loop) => {
      const n = randomInRange(0, size - 1);
      return hh.SEQUENCE(
	 {}, genStmt(conf, env, size - n - 1, loop), genStmt(conf, env, n, loop))
   };
   return choice(weight, gen);
}

/*---------------------------------------------------------------------*/
/*    genFork ...                                                      */
/*---------------------------------------------------------------------*/
function genFork(weight) {
   const gen = (conf, env, size, loop) => {
      const l = Math.round(Math.random() * 5);
      let children = [];
      for (let i = 0; i < l - 1; i++) {
	 const n = randomInRange(0, size - 1);
	 children[ i ] = genStmt(conf, env, size - n - 1, loop);
	 size -= n;
      }
      if (l > 0) {
	 children[ l - 1 ] = genStmt(conf, env, size, loop);
      }
      return hh.FORK({}, ...children);
   }
   return choice(weight, gen);
}

/*---------------------------------------------------------------------*/
/*    genLoop ...                                                      */
/*---------------------------------------------------------------------*/
function genLoop(weight) {
   const gen = (conf, env, size, loop) => {
      if (loop >= conf.maxLoop) {
	 return genStmt(conf, env, size, loop);
      } else {
	 return hh.LOOP({}, genStmt(conf, env, size - 1, loop + 1));
      }
   };
   return choice(weight, gen);
}

/*---------------------------------------------------------------------*/
/*    genLocal ...                                                     */
/*---------------------------------------------------------------------*/
function genLocal(weight) {
   const gen = (conf, env, size, loop) => {
      const l = Math.round(1 + Math.random() * 4);
      const names = Array.from({length: l}).map(c => gensym());
      const attrs = {};
      const signals = env.signals.concat(names);
      const nenv = Object.assign({}, env);
      nenv.signals = nenv.signals.concat(signals);
      names.forEach(name => attrs[name] = { signal: name, name, accessibility: hh.INOUT, combine: (x, y) => (x + y) });

      return hh.LOCAL(attrs, genStmt(conf, nenv, size - 1, loop));
   };
   return choice(weight, gen);
}

/*---------------------------------------------------------------------*/
/*    genIf ...                                                        */
/*---------------------------------------------------------------------*/
function genIf(weight) {
   const gen = (conf, env, size, loop) => {
      if (!conf.expr) {
	 return genStmt(conf, env, size, loop);
      } else {
	 const expr = genExpr(conf, env);
	 return hh.IF(
	    {apply: expr},
	    genStmt(conf, env, size - 1, loop),
	    genStmt(conf, env, size - 1, loop));
      }
   };
   return choice(weight, gen);
}

/*---------------------------------------------------------------------*/
/*    genPresent ...                                                   */
/*---------------------------------------------------------------------*/
function genPresent(weight) {
   const gen = (conf, env, size, loop) => {
      const expr = genDelay(conf, env);
      return hh.IF(
	 {apply: expr},
	 genStmt(conf, env, size - 1, loop),
	 genStmt(conf, env, size - 1, loop));
   };
   return choice(weight, gen);
}

/*---------------------------------------------------------------------*/
/*    genTrap ...                                                      */
/*---------------------------------------------------------------------*/
function genTrap(weight) {
   const gen = (conf, env, size, loop) => {
      const trap = gensym("trap");
      const nenv = Object.assign({}, env);
      nenv.traps = [trap, ...nenv.traps];
      return hh.TRAP({[trap]: trap}, genStmt(conf, nenv, size - 1, loop));
   };
   return choice(weight, gen);
}

/*---------------------------------------------------------------------*/
/*    genSuspend ...                                                   */
/*---------------------------------------------------------------------*/
function genSuspend(weight) {
   const gen = (conf, env, size, loop) => {
      if (env.signals.length > 0) {
	 return hh.SUSPEND({apply: genDelay(conf, env)}, genStmt(conf, env, size - 1, loop));
      } else {
	 return genStmt(conf, env, size, loop);
      }
   };
   return choice(weight, gen);
}

/*---------------------------------------------------------------------*/
/*    genAbort ...                                                     */
/*---------------------------------------------------------------------*/
function genAbort(weight) {
   const gen = (conf, env, size, loop) => {
      if (env.signals.length > 0) {
	 return hh.ABORT({apply: genDelay(conf, env)}, genStmt(conf, env, size - 1, loop));
      } else {
	 return genStmt(conf, env, size, loop);
      }
   };
   return choice(weight, gen);
}

/*---------------------------------------------------------------------*/
/*    genEvery ...                                                     */
/*---------------------------------------------------------------------*/
function genEvery(weight) {
   const gen = (conf, env, size, loop) => {
      if (loop >= conf.maxLoop) {
	 return genStmt(conf, env, size, loop);
      } else if (env.signals.length > 0) {
	 return hh.EVERY({apply: genDelay(conf, env)}, genStmt(conf, env, size - 1, loop + 1));
      } else {
	 return genStmt(conf, env, size, loop);
      }
   };
   return choice(weight, gen);
}

/*---------------------------------------------------------------------*/
/*    genLoopeach ...                                                  */
/*---------------------------------------------------------------------*/
function genLoopeach(weight) {
   const gen = (conf, env, size, loop) => {
      if (loop >= conf.maxLoop) {
	 return genStmt(conf, env, size, loop);
      } else if (env.signals.length > 0) {
	 return hh.LOOPEACH({apply: genDelay(conf, env)}, genStmt(conf, env, size - 1, loop + 1));
      } else {
	 return genStmt(conf, env, size, loop);
      }
   }
   return choice(weight, gen);
}

/*---------------------------------------------------------------------*/
/*    genAwait ...                                                     */
/*---------------------------------------------------------------------*/
function genAwait(weight) {
   const gen = (conf, env, size, loop) => {
      if (env.signals.length > 0) {
	 return hh.AWAIT({apply: genDelay(conf, env)});
      } else {
	 return genStmt(conf, env, size, loop);
      }
   };
   return choice(weight, gen);
}

/*---------------------------------------------------------------------*/
/*    genNothing ...                                                   */
/*---------------------------------------------------------------------*/
function genNothing(weight) {
   const gen = (conf, env, size, loop) => hh.NOTHING({});
   return choice(weight, gen);
}

/*---------------------------------------------------------------------*/
/*    genPause ...                                                     */
/*---------------------------------------------------------------------*/
function genPause(weight) {
   const gen = (conf, env, size, loop) => hh.PAUSE({});
   return choice(weight, gen);
}

/*---------------------------------------------------------------------*/
/*    genAtom ...                                                      */
/*---------------------------------------------------------------------*/
function genAtom(weight) {
      const gen = (conf, env, size, loop) => {
	 const expr = genExpr(conf, env);
	 return hh.ATOM({apply: expr});
      };
      return choice(weight, gen);
   }

/*---------------------------------------------------------------------*/
/*    genHalt ...                                                      */
/*---------------------------------------------------------------------*/
function genHalt(weight) {
   const gen = (conf, env, size, loop) => hh.HALT({});
   return choice(weight, gen);
}

/*---------------------------------------------------------------------*/
/*    genExit ...                                                      */
/*---------------------------------------------------------------------*/
function genExit(weight) {
   const gen = (conf, env, size, loop) => {
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
   const gen = (conf, env, size, loop) => {
      const i = Math.floor(Math.random() * env.signals.length);
      const sig = env.signals[i];
      const val = genEmitValue();
      return hh.EMIT({signame: env.signals[i], apply: (conf, env, size, loop) => val});
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
function genStmt(conf, env, size, loop) {
   if (size !== 0) {
      return choose(conf, env, size, loop,
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
      return choose(conf, env, size, loop,
         genNothing(10),
	 genPause(20),
	 genAtom(10));
   } else if (env.signals.length === 0) {
      return choose(conf, env, size, loop,
	 genNothing(3),
	 genPause(10),
	 genAtom(6),
	 genExit(1),
	 genHalt(1));
   } else if (env.traps.length === 0) {
      return choose(conf, env, size, loop,
	 genNothing(3),
	 genPause(10),
	 genAtom(5),
         genEmit(8),
         genAwait(1),
	 genHalt(1));
   } else {
      return choose(conf, env, size, loop,
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
function gen(prop) {
   const config = prop.config;
   
   while (true) {
      const l = Math.round(Math.random() * 4);
      const signals = Array.from({length: l}).map(c => gensym());
      const events = Array.from({length: 8}).map(i => genreactsigs(signals))
      const size = randomInRange(config.minSize, config.maxSize);
      const body = genStmt(config, {signals: signals, traps: []}, size, 0);
      const attrs = {};
      signals.forEach(name => attrs[name] = { signal: name, name, accessibility: hh.INOUT, combine: (x, y) => (x + y) });

      try {
	 let prog = hh.MODULE(attrs, body), prog0 = prog;
	 let isok = true;
	 
	 config.filters.forEach(f => {
	    if (isok) {
	       let err;
	       if (err = f.check(prop, prog)) {
		  isok = false;
		  
		  if (f.patch) {
		     for (let i = (f?.repeat ?? config.maxTry); i > 0 ; i--) {
			prog = f.patch(err);
			if (err = f.check(prop, prog)) {
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
	    return { prog, events };
	 } else {
	    return { status: "reject" };
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

