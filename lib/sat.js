/*=====================================================================*/
/*    hiphop/lib/sat.js                                                */
/*    -------------------------------------------------------------    */
/*    SAT encoding of net lists, used by the cycle removal             */
/*    (see uncycle.js) to detect that two nets always carry the        */
/*    same value.                                                      */
/*    -------------------------------------------------------------    */
/*    Nets are 3-valued (true, false, bottom), so each net is          */
/*    encoded with two SAT literals ("dual-rail"):                     */
/*                                                                     */
/*      t  f                                                           */
/*      1  0    true                                                   */
/*      0  1    false                                                  */
/*      0  0    bottom                                                 */
/*                                                                     */
/*    Two nets are equivalent when the solver proves that their        */
/*    rails cannot differ. A net is encoded the first time it is       */
/*    queried, together with its (transitive) fanins, so the           */
/*    encoding always reflects the current shape of the circuit.       */
/*    Nets whose value is not determined by their fanins (registers,   */
/*    input signals, test expressions, ...) are free variables.        */
/*    Before calling the solver, the nets are simulated on random      */
/*    values of these variables and on the counter-examples found by   */
/*    the solver, which cheaply shows that most non-equivalent pairs   */
/*    can differ.                                                      */
/*    The bottom net is "false or bottom" because the native code      */
/*    evaluates it as false while the interpreter never fires it.      */
/*=====================================================================*/
"use strict"
"use hopscript"

/*---------------------------------------------------------------------*/
/*    es6 module                                                       */
/*---------------------------------------------------------------------*/
import Logic from "logic-solver";
import * as ast from "./ast.js";
import { FAN, RegisterNet, LogicalNet, BottomNet, WireNet, SignalNet, ActionNet, TestExpressionNet } from "./net.js";

export { CircuitSat };

/*---------------------------------------------------------------------*/
/*    CircuitSat ...                                                   */
/*---------------------------------------------------------------------*/
class CircuitSat {
   #solver = new Logic.Solver();
   #rails = new Map();      // net -> [t, f] SAT rails
   #sims = new Map();       // net -> [t, f] simulation words (topological order)
   #randoms = new Map();    // SAT variable -> random simulation words
   #seed = 0x9e3779b9;      // deterministic, for reproducible compilations
   #cexs = 0;               // number of counter-examples found by the solver
   #inputs = new Map();     // signal -> SAT variable prefix
   #queries = 0;
   #disabled = false;

   // returns true iff the two points (net + connection type) are
   // proved to always carry the same value
   equivalent(p1, p2) {
      if (this.#disabled) {
         return false;
      }

      try {
         if (differ(this.#simPoint(p1), this.#simPoint(p2))) {
            return false;
         }

         const [t1, f1] = this.#point(p1);
         const [t2, f2] = this.#point(p2);

         if (t1 === t2 && f1 === f2) {
            return true;
         } else {
            const d = "d" + this.#queries++;
            this.#solver.require(
               Logic.implies(d, Logic.or(Logic.xor(t1, t2), Logic.xor(f1, f2))));
            const sol = this.#solver.solveAssuming(d);

            if (sol === null) {
               return true;
            } else {
               this.#counterExample(sol.getMap());
               return false;
            }
         }
      } catch (e) {
         if (e instanceof CycleError) {
            // the encoding is only meaningful for acyclic circuits
            this.#disabled = true;
            return false;
         } else if (typeof e === "string" && e.startsWith("abort(")) {
            // MiniSat has a fixed size heap, when it is exhausted,
            // continue unrolling without the solver
            console.error("*** WARNING: SAT solver out of memory, cycle removal continues without it");
            this.#disabled = true;
            return false;
         } else {
            throw e;
         }
      }
   }

   #point({net, type}) {
      const [t, f] = this.#encode(net);
      return type === FAN.NEG ? [f, t] : [t, f];
   }

   #fan(fan) {
      return this.#point({ net: fan.net, type: fan.polarity ? FAN.STD : FAN.NEG });
   }

   // visit net and its fanins in topological order (iteratively,
   // circuits can be deep)
   #visit(net, done, visit) {
      const stack = [net];
      const onstack = new Set(stack);

      while (stack.length > 0) {
         const n = stack[stack.length - 1];

         if (done.has(n)) {
            stack.pop();
            onstack.delete(n);
         } else {
            const fan = this.#fanins(n).find(f => !done.has(f.net));

            if (!fan) {
               visit(n);
            } else if (onstack.has(fan.net)) {
               throw new CycleError();
            } else {
               stack.push(fan.net);
               onstack.add(fan.net);
            }
         }
      }
   }

   // encode net and its fanins
   #encode(net) {
      this.#visit(net, this.#rails, n => this.#rails.set(n, this.#gate(n)));
      return this.#rails.get(net);
   }

   // the fanins that define the value of a net
   #fanins(n) {
      if (isBuffer(n)) {
         return n.faninList;
      } else if (n instanceof BottomNet || n instanceof RegisterNet
         || !(n instanceof LogicalNet)
         || !n.faninList.find(f => !f.dependency)) {
         return [];
      } else if (n instanceof ActionNet) {
         return n.faninList;
      } else {
         return n.faninList.filter(f => !f.dependency);
      }
   }

   #gate(n) {
      if (n instanceof BottomNet) {
         return [Logic.FALSE, "bottom"];
      } else if (n instanceof RegisterNet) {
         return this.#bool("r" + n.id);
      } else if (isBuffer(n)) {
         return this.#fan(n.faninList[0]);
      } else if (!(n instanceof LogicalNet)) {
         return this.#free(n);
      } else if (this.#fanins(n).length === 0) {
         if (n.faninList.length > 0) {
            // dependencies only
            return this.#free(n);
         } else if (n instanceof SignalNet || n instanceof ActionNet) {
            return this.#bool("c" + n.id);
         } else {
            return n.neutral ? [Logic.TRUE, Logic.FALSE] : [Logic.FALSE, Logic.TRUE];
         }
      } else {
         const ins = n.faninList.filter(f => !f.dependency).map(f => this.#fan(f));

         if (n instanceof SignalNet && (n.accessibility & ast.IN)) {
            // input signals are also set by the environment
            ins.push(this.#bool(this.#input(n)));
         }

         // c: rail of the controlling value, u: rail of the neutral value
         const c = n.neutral ? 1 : 0;
         const u = 1 - c;
         const out = ["t" + n.id, "f" + n.id];
         const all = Logic.and(ins.map(r => r[u]));

         this.#solver.require(Logic.equiv(out[c], Logic.or(ins.map(r => r[c]))));

         if (n instanceof ActionNet) {
            // the interpreter waits for the dependencies before
            // propagating the neutral value, the native code does not
            // (the dependencies are fanins, so they are already encoded)
            const defs = n.faninList.filter(f => f.dependency)
               .map(f => Logic.or(this.#rails.get(f.net)));
            this.#solver.require(Logic.implies(out[u], all));
            this.#solver.require(Logic.implies(Logic.and(all, defs), out[u]));
         } else {
            this.#solver.require(Logic.equiv(out[u], all));
         }

         if (n instanceof TestExpressionNet) {
            // the test is evaluated when the gate is true
            const v = "v" + n.id;
            return [Logic.and(out[0], v), Logic.or(out[1], Logic.and(out[0], Logic.not(v)))];
         } else {
            return out;
         }
      }
   }

   /*------------------------------------------------------------------*/
   /*    Simulation                                                    */
   /*    --------------------------------------------------------      */
   /*    Each bit position of the simulation words is an assignment    */
   /*    of the free variables of the encoding (named as in #gate),    */
   /*    so each bit position is a model of the encoding. Most are     */
   /*    random, the bits of the last word are the last 32 counter-    */
   /*    examples found by the solver.                                 */
   /*------------------------------------------------------------------*/
   #simPoint({net, type}) {
      this.#visit(net, this.#sims, n => {
         const t = new Int32Array(SIMWIDTH);
         const f = new Int32Array(SIMWIDTH);

         for (let k = 0; k < SIMWIDTH; k++) {
            [t[k], f[k]] = this.#simulate(n, k);
         }
         this.#sims.set(n, [t, f]);
      });

      const [t, f] = this.#sims.get(net);
      return type === FAN.NEG ? [f, t] : [t, f];
   }

   #simFan(fan, k) {
      const [t, f] = this.#sims.get(fan.net);
      return fan.polarity ? [t[k], f[k]] : [f[k], t[k]];
   }

   // simulation word k of a net (see #gate)
   #simulate(n, k) {
      if (n instanceof BottomNet) {
         return [0, this.#random("bottom", k)];
      } else if (n instanceof RegisterNet) {
         return this.#simBool("r" + n.id, k);
      } else if (isBuffer(n)) {
         return this.#simFan(n.faninList[0], k);
      } else if (!(n instanceof LogicalNet)) {
         return this.#simFree(n, k);
      } else if (this.#fanins(n).length === 0) {
         if (n.faninList.length > 0) {
            return this.#simFree(n, k);
         } else if (n instanceof SignalNet || n instanceof ActionNet) {
            return this.#simBool("c" + n.id, k);
         } else {
            return n.neutral ? [-1, 0] : [0, -1];
         }
      } else {
         const c = n.neutral ? 1 : 0;
         const u = 1 - c;
         const out = [0, 0];
         let any = 0, all = -1;

         n.faninList.forEach(f => {
            if (!f.dependency) {
               const r = this.#simFan(f, k);
               any |= r[c];
               all &= r[u];
            }
         });

         if (n instanceof SignalNet && (n.accessibility & ast.IN)) {
            const r = this.#simBool(this.#input(n), k);
            any |= r[c];
            all &= r[u];
         }

         out[c] = any;

         if (n instanceof ActionNet) {
            // the neutral value is free when a dependency is bottom
            let defs = -1;

            n.faninList.forEach(f => {
               if (f.dependency) {
                  const [t, f_] = this.#sims.get(f.net);
                  defs &= t[k] | f_[k];
               }
            });
            out[u] = all & (defs | this.#random((u === 0 ? "t" : "f") + n.id, k));
         } else {
            out[u] = all;
         }

         if (n instanceof TestExpressionNet) {
            const v = this.#random("v" + n.id, k);
            return [out[0] & v, out[1] | (out[0] & ~v)];
         } else {
            return out;
         }
      }
   }

   #random(v, k) {
      if (!this.#randoms.has(v)) {
         this.#randoms.set(v, Int32Array.from({ length: SIMWIDTH }, () => this.#next()));
      }
      return this.#randoms.get(v)[k];
   }

   // xorshift32
   #next() {
      this.#seed ^= this.#seed << 13;
      this.#seed ^= this.#seed >>> 17;
      this.#seed ^= this.#seed << 5;
      return this.#seed;
   }

   #simBool(v, k) {
      const r = this.#random(v, k);
      return [r, ~r];
   }

   #simFree(n, k) {
      const t = this.#random("t" + n.id, k);
      return [t, this.#random("f" + n.id, k) & ~t];
   }

   // store a model of the solver in the counter-example word and
   // simulate it
   #counterExample(model) {
      const bit = 1 << (this.#cexs++ % 32);

      this.#randoms.forEach((words, v) => {
         if (v in model) {
            words[CEXWORD] = model[v]
               ? words[CEXWORD] | bit : words[CEXWORD] & ~bit;
         }
      });
      this.#sims.forEach(([t, f], n) => {
         [t[CEXWORD], f[CEXWORD]] = this.#simulate(n, CEXWORD);
      });
   }

   #input(n) {
      if (!this.#inputs.has(n.signal)) {
         this.#inputs.set(n.signal, "i" + this.#inputs.size + "_");
      }
      return this.#inputs.get(n.signal) + n.lvl;
   }

   #bool(v) {
      return [v, Logic.not(v)];
   }

   #free(n) {
      const t = "t" + n.id;
      const f = "f" + n.id;
      this.#solver.forbid(Logic.and(t, f));
      return [t, f];
   }
}

/*---------------------------------------------------------------------*/
/*    simulation words                                                 */
/*---------------------------------------------------------------------*/
const SIMWIDTH = 8;
const CEXWORD = SIMWIDTH - 1;

function differ([t1, f1], [t2, f2]) {
   return t1.some((x, i) => x !== t2[i] || f1[i] !== f2[i]);
}

/*---------------------------------------------------------------------*/
/*    isBuffer ...                                                     */
/*    -------------------------------------------------------------    */
/*    Wires are only removed by the sweep optimization.                */
/*---------------------------------------------------------------------*/
function isBuffer(n) {
   return n instanceof WireNet
      && n.faninList.length === 1 && !n.faninList[0].dependency;
}

/*---------------------------------------------------------------------*/
/*    CycleError ...                                                   */
/*---------------------------------------------------------------------*/
class CycleError extends Error {
}
