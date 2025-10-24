/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/testrandom/gen.mjs            */
/*    -------------------------------------------------------------    */
/*    Author      :  robby findler & manuel serrano                    */
/*    Creation    :  Tue May 27 17:28:51 2025                          */
/*    Last change :  Fri Oct 24 18:23:40 2025 (serrano)                */
/*    Copyright   :  2025 robby findler & manuel serrano               */
/*    -------------------------------------------------------------    */
/*    HipHop program random generator                                  */
/*=====================================================================*/
import * as hh from "../lib/hiphop.js";
import { jsonToHiphop } from "./dump.mjs";

export { gen, wrap, gensym };

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
function choose(...entries) {
   let rnd = Math.random();
   let sum = 0;
   entries.forEach(e => sum += e[0]);

   for (let i = 0; i < entries.length; i++) {
      const w = entries[i][0] / sum;

      if (rnd < w) {
	 return entries[i][1]();
      } else {
	 rnd -= w;
      }
   }
   throw new Error("should not be here...");
}

function testChoose() {
   const entries = [0, 0, 0, 0];
   
   for (let i = 10000; i >= 0; i--) {
      choose([3,() => entries[0]++],
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
/*    genTestExpr ...                                                  */
/*---------------------------------------------------------------------*/
function genTestExpr(env, size) {
   if (size === 0 || env.signals.length === 0) {
      return (Math.random() >= 0.5) ? "true" : "false";
   } else if (size === 1) {
      const i = Math.floor(Math.random() * env.signals.length);
      const sig = env.signals[i];
      const axs = (Math.random() >= 0.8) ? "pre" : "now";
      return `this.${sig}.${axs}`;
   } else {
      switch (Math.floor(Math.random() * 6)) {
	 case 0: return `!(${genTestExpr(env, size - 1)})`;
	 case 1:
	 case 2:
	 case 3: return `(${genTestExpr(env, size - 1)} && ${genTestExpr(env, size - 1)})`;
	 case 4:
	 case 5:
	 case 6: return `(${genTestExpr(env, size - 1)} || ${genTestExpr(env, size - 1)})`;
      }
   }
}

/*---------------------------------------------------------------------*/
/*    genStmt ...                                                      */
/*    -------------------------------------------------------------    */
/*    returns an esterel expression of size `size`,                    */
/*    that might refer to the variables in `env`                       */
/*    (at the moment, never generates references nor binders, alas)    */
/*---------------------------------------------------------------------*/
function genStmt(env, size) {
   if (size === 0) {
      return choose(
	 // nothing
	 [2, () => hh.NOTHING({})],
	 // pause
	 [3, () => hh.PAUSE({})],
	 // atom
	 [2, () => {
	    const expr = genTestExpr(env, Math.round(Math.random() * 3));
	    const func = eval(`(function() { return ${expr}; })`);
	    return hh.ATOM({apply: func});
	 }],
	 // emit
	 [3, () => {
	    if (env.signals.length === 0) {
	       return hh.NOTHING({});
	    } else {
	       const i = Math.floor(Math.random() * env.signals.length);
	       const sig = env.signals[i];
	       return hh.EMIT({signame: env.signals[i]});
	    }
	 }],
	 // exit
	 [1, () => {
	    if (env.traps.length > 0) {
	       const i = Math.floor(Math.random() * env.traps.length);
	       const attr = { [env.traps[i]]: env.traps[i] };
	       return hh.EXIT(attr);
	    } else {
	       return hh.PAUSE({})
	    }
	 }]);
   } else {
      return choose(
	 // sequence
	 [10, () => {
	    const n = randomInRange(0, size - 1);
	    return hh.SEQUENCE({}, genStmt(env, size - n - 1), genStmt(env, n))
	 }],
	 // fork
	 [10, () => {
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
	 }],
	 // loop
	 [10, () => {
	    return hh.LOOP({}, genStmt(env, size - 1));
	 }],
	 // local
	 [3, () => {
	    const l = Math.round(1 + Math.random() * 4);
	    const names = Array.from({length: l}).map(c => gensym());
	    const attrs = {};
	    const signals = env.signals.concat(names);
	    const nenv = Object.assign({}, env);
	    nenv.signals = nenv.signals.concat(signals);
	    names.forEach(name => attrs[name] = { signal: name, name, accessibility: hh.INOUT });

	    return hh.LOCAL(attrs, genStmt(nenv, size - 1));
	 }],
	 // if
	 [1, () => {
	    const expr = genTestExpr(env, Math.round(Math.random() * 3));
	    const func = eval(`(function() { return ${expr}; })`);
	    return hh.IF({apply: func}, genStmt(env, size - 1), genStmt(env, size - 1));
	 }],
	 // trap
	 [1, () => {
	    const trap = gensym("trap");
	    const nenv = Object.assign({}, env);
	    nenv.traps = [trap, ...nenv.traps];
	    return hh.TRAP({[trap]: trap}, genStmt(nenv, size - 1));
	 }],
      );
   }
}

/*---------------------------------------------------------------------*/
/*    gen ...                                                          */
/*    -------------------------------------------------------------    */
/*    Generates a random program.                                      */
/*---------------------------------------------------------------------*/
function gen(size = 20) {
   const body = genStmt({signals: [], traps: []}, size);
   return hh.MODULE({}, body);
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
