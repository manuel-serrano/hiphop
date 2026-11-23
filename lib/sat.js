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
   #rails = new Map();      // net -> [t, f]
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
         const [t1, f1] = this.#point(p1);
         const [t2, f2] = this.#point(p2);

         if (t1 === t2 && f1 === f2) {
            return true;
         } else {
            const d = "d" + this.#queries++;
            this.#solver.require(
               Logic.implies(d, Logic.or(Logic.xor(t1, t2), Logic.xor(f1, f2))));
            return this.#solver.solveAssuming(d) === null;
         }
      } catch (e) {
         if (e instanceof CycleError) {
            // the encoding is only meaningful for acyclic circuits
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

   // encode net and its fanins (iteratively, circuits can be deep)
   #encode(net) {
      const stack = [net];
      const onstack = new Set(stack);

      while (stack.length > 0) {
         const n = stack[stack.length - 1];

         if (this.#rails.has(n)) {
            stack.pop();
            onstack.delete(n);
         } else {
            const fan = this.#fanins(n).find(f => !this.#rails.has(f.net));

            if (!fan) {
               this.#rails.set(n, this.#gate(n));
            } else if (onstack.has(fan.net)) {
               throw new CycleError();
            } else {
               stack.push(fan.net);
               onstack.add(fan.net);
            }
         }
      }

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
