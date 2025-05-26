import * as hh from "@hop/hiphop";

export { gen };

// accepts a list of pairs of weights and thunks
// returns the result of calling one of the thunks,
// choosing one randomly, but based on the weights
// eg, choose([[1,() => "a"],[3,() => "b"]])
// will return "a" with probability 1/4 and "b"
// with probability 3/4.
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

// returns a random integer in the set [a,b],
// ie, a and b are both possible results
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

// returns a esterel expression of size `size`,
// that might refer to the variables in `env`
// (at the moment, never generates references nor
//  binders, alas)
function genEnv(env, size) {
   if (size === 0) {
      return choose(
	 [1, () => hh.NOTHING({})],
	 [1, () => hh.PAUSE({})])
   } else {
      return choose(
	 [1, () => {
	    const n = randomInRange(0, size - 1);
	    return hh.SEQUENCE({}, genEnv(env, size - n - 1), genEnv(env, n))
	 }],
	 [1, () => {
	    const n = randomInRange(0, size - 1);
	    return hh.FORK({}, genEnv(env, size - n - 1), genEnv(env, n));
	 }],
	 [1, () => {
	    return hh.LOOP({}, genEnv(env, size - 1));
	 }]);
   }
}

// generates a random program
function gen() {
   return hh.MODULE({}, genEnv({}, 10));
}
