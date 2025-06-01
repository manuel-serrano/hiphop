/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/testrandom/gen.mjs            */
/*    -------------------------------------------------------------    */
/*    Author      :  robby findler & manuel serrano                    */
/*    Creation    :  Tue May 27 17:28:51 2025                          */
/*    Last change :  Sat May 31 09:03:55 2025 (serrano)                */
/*    Copyright   :  2025 robby findler & manuel serrano               */
/*    -------------------------------------------------------------    */
/*    HipHop program random generator                                  */
/*=====================================================================*/
import * as hh from "../lib/hiphop.js";

export { gen };

/*---------------------------------------------------------------------*/
/*    gensymCnt ...                                                    */
/*---------------------------------------------------------------------*/
let gensymCnt = 1;

/*---------------------------------------------------------------------*/
/*    gensym ...                                                       */
/*---------------------------------------------------------------------*/
function gensym() {
   return "g" + gensymCnt++;
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
/*    genEnv ...                                                       */
/*    -------------------------------------------------------------    */
/*    returns an esterel expression of size `size`,                    */
/*    that might refer to the variables in `env`                       */
/*    (at the moment, never generates references nor binders, alas)    */
/*---------------------------------------------------------------------*/
function genEnv(env, size) {
   if (size === 0) {
      return choose(
	 [1, () => hh.NOTHING({})],
	 [1, () => hh.PAUSE({})],
	 [1, () => {
	    if (env.signals.length === 0) {
	       return hh.NOTHING({});
	    } else {
	       const i = Math.round(Math.random() * env.signals.length);
	       return hh.EMIT({signame: env.signals[i]});
	    }
	 }]);
   } else {
      return choose(
	 [1, () => {
	    const n = randomInRange(0, size - 1);
	    return hh.SEQUENCE({}, genEnv(env, size - n - 1), genEnv(env, n))
	 }],
	 [1, () => {
	    const l = Math.round(Math.random() * 5);
	    let children = [];
	    for (let i = 0; i < l - 1; i++) {
	       const n = randomInRange(0, size - 1);
	       children[ i ] = genEnv(env, size - n - 1);
	       size -= n;
	    }
	    if (l > 0) {
	       children[ l - 1 ] = genEnv(env, size);
	    }
	    return hh.FORK({}, ...children);
	 }],
	 [1, () => {
	    return hh.LOOP({}, genEnv(env, size - 1));
	 }]
/* 	 [1, () => {                                                   */
/* 	    const l = Math.round(Math.random() * 5);                   */
/* 	    const names = Array.from({length: l}).map(c => gensym());  */
/* 	    const attrs = {};                                          */
/* 	    const signals = env.signals.concat(names);                 */
/* 	    const nenv = Object.assign(env, { signals });              */
/* 	    names.forEach(name => attrs[name] = { signal: name, name, accessibility: hh.INOUT }); */
/*                                                                     */
/* 	    console.error("LOCALS: ", names);                          */
/* 	    return hh.LOCAL(attrs, genEnv(nenv, size - 1));            */
/* 	 }]                                                            */
      );
   }
}

/*---------------------------------------------------------------------*/
/*    gen ...                                                          */
/*    -------------------------------------------------------------    */
/*    Generates a random program.                                      */
/*---------------------------------------------------------------------*/
function gen(size = 20) {
   return hh.MODULE({}, genEnv({signals: []}, size));
}
