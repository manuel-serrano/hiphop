/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/lib/loopsafe.js               */
/*    -------------------------------------------------------------    */
/*    Author      :  manuel serrano                                    */
/*    Creation    :  Thu Nov  6 10:07:58 2025                          */
/*    Last change :  Tue Nov 18 11:19:30 2025 (serrano)                */
/*    Copyright   :  2025 manuel serrano                               */
/*    -------------------------------------------------------------    */
/*    Implementation of the Loop-Safe predicate.                       */
/*    -------------------------------------------------------------    */
/*    See Esterel Contructive Book, section 6.6, page 69-70.           */
/*=====================================================================*/
"use strict";
"use hopscript";

/*---------------------------------------------------------------------*/
/*    es6 module                                                       */
/*---------------------------------------------------------------------*/
import * as ast from "./ast.js";
import { basename } from "node:path";
import { ReferenceError, LoopError } from "./error.js";

export { loopSafe };

/*---------------------------------------------------------------------*/
/*    dumpLoops                                                        */
/*---------------------------------------------------------------------*/
const dumpLoops = process.env.HIPHOP_TRACE
   && process.env.HIPHOP_TRACE.split(",").find(n => n === "loopsafe");

/*---------------------------------------------------------------------*/
/*    loopSafe ...                                                     */
/*---------------------------------------------------------------------*/
function loopSafe(prog) {
   // compute the K property, Chapter 6, section 6.6, page 69-70
   prog.K([]);

   const n = unsafeLoop(prog);

   if (n) {
      throw new LoopError("Instantaneous loop", prog, n);
   } else {
      if (dumpLoops) {
	 console.log("Program loop safe");
      }
   }
}

/*---------------------------------------------------------------------*/
/*    unsafeLoop ...                                                   */
/*---------------------------------------------------------------------*/
function unsafeLoop(node) {

   function walk(node) {
      if (node instanceof ast.Loop) {
	 const len = node.children.length;

	 if (dumpLoops) {
	    console.log(
	       node.constructor.name, `${basename(node.loc.filename)}:${node.loc.pos}`,
	       node.children ? [...node.children[len-1].$K.values()] : true);
	 }
	 
	 if (len === 0) {
	    throw node;
	 } else if (node.children[len - 1].$K.has(0)) {
	    throw node;
	 } else {
	    node.children.forEach(walk);
	 }
      } else {
	 node.children.forEach(walk);
      }
   }

   try {
      walk(node);
      return false;
   } catch(exn) {
      if (exn instanceof ast.$ASTNode) {
	 return exn;
      } else {
	 throw exn;
      }
   }
}

/*---------------------------------------------------------------------*/
/*    Kseq ...                                                         */
/*---------------------------------------------------------------------*/
function Kseq(nodes, env, i = 0) {
   switch (nodes.length - i) {
      case 0:
	 return new Set([0]);
      case 1:
	 return nodes[i].K(env);
      default:
	 const Kp = nodes[i].K(env);

	 if (Kp.has(0)) {
	    const K = new Set(Kp);
	    K.delete(0);
	    return K.union(Kseq(nodes, env, i + 1));
	 } else {
	    // force the computation of the K set to all expressions
	    for (let j = i + 1; j < nodes.length; j++) {
	       nodes[j].K(env);
	    }
	    return Kp;
	 }
   }
}

/*---------------------------------------------------------------------*/
/*    K ::$ASTNode ...                                                 */
/*---------------------------------------------------------------------*/
ast.$ASTNode.prototype.K = function(env) {
   if (this.children.length === 0) {
      return this.$K = new Set([0]);
   } else {
      return this.$K = Kseq(this.children, env);
   }
}
   
/*---------------------------------------------------------------------*/
/*    K ::Pause ...                                                    */
/*---------------------------------------------------------------------*/
ast.Pause.prototype.K = function(env) {
   return this.$K = new Set([1]);
}

/*---------------------------------------------------------------------*/
/*    K ::If ...                                                       */
/*---------------------------------------------------------------------*/
ast.If.prototype.K = function(env) {
   return this.$K = this.children[0].K(env).union(this.children[1].K(env));
}

/*---------------------------------------------------------------------*/
/*    K ::Suspend ...                                                  */
/*---------------------------------------------------------------------*/
ast.Suspend.prototype.K = function(env) {
   return this.$K = Kseq(this.children, env);
}

/*---------------------------------------------------------------------*/
/*    K ::Sequence ...                                                 */
/*---------------------------------------------------------------------*/
ast.Sequence.prototype.K = function(env) {
   return this.$K = Kseq(this.children, env);
}

/*---------------------------------------------------------------------*/
/*    K ::Loop ...                                                     */
/*---------------------------------------------------------------------*/
ast.Loop.prototype.K = function(env) {
   const K = new Set(Kseq(this.children, env));
   K.delete(0);
   return this.$K = K;
}

/*---------------------------------------------------------------------*/
/*    K ::Fork ...                                                     */
/*---------------------------------------------------------------------*/
ast.Fork.prototype.K = function(env) {
   
   function Max(Ks, i) {
      if (i === Ks.length - 1) {
	 return Ks[i];
      } else {
	 const maxs = new Set();
	 const K = Ks[i];
	 const R = Max(Ks, i + 1);

	 K.forEach(k => R.forEach(r => maxs.add(Math.max(k, r))));

	 return maxs;
      }
   }

   switch (this.children.length) {
      case 0:
	 return this.$K = new Set([0]);
      case 1:
	 return this.$K = this.children[0].K(env);
      default:
	 return this.$K = Max(this.children.map(c => c.K(env)), 0);
   }
}

/*---------------------------------------------------------------------*/
/*    K ::Every ...                                                    */
/*---------------------------------------------------------------------*/
ast.Every.prototype.K = function(env) {
   this.children.forEach(c => c.K(env));
   return this.$K =  new Set([this.immediate ? 0 : 1]);
}

/*---------------------------------------------------------------------*/
/*    K ::LoopEach ...                                                 */
/*---------------------------------------------------------------------*/
ast.LoopEach.prototype.K = function(env) {
   this.children.forEach(c => c.K(env));
   return this.$K = new Set([this.immediate ? 0 : 1]);
}

/*---------------------------------------------------------------------*/
/*    K ::Await ...                                                    */
/*---------------------------------------------------------------------*/
ast.Await.prototype.K = function(env) {
   return this.$K = new Set([this.immedidate ? 0 : 1]);
}

/*---------------------------------------------------------------------*/
/*    K ::Trap ...                                                     */
/*---------------------------------------------------------------------*/
ast.Trap.prototype.K = function(env) {
   
   function down(k) {
      switch (k) {
	 case 0:
	 case 2: return 0;
	 case 1: return 1;
	 default: return k - 1;
      }
   }
   
   const ks = Kseq(this.children, [this.trapName].concat(env));
   return this.$K = new Set([...ks].map(down));
}
   
/*---------------------------------------------------------------------*/
/*    K ::Exit ...                                                     */
/*---------------------------------------------------------------------*/
ast.Exit.prototype.K = function(env) {
   const k = env.indexOf(this.trapName);

   if (k < 0) {
      ReferenceError(`Label ${this.trapName} unbound`, this.loc);
   } else {
      return this.$K = new Set([k + 2]);
   }
}

/*---------------------------------------------------------------------*/
/*    K ::Local ...                                                    */
/*---------------------------------------------------------------------*/
ast.Local.prototype.K = function(env) {
   return this.$K = Kseq(this.children, env);
}

/*---------------------------------------------------------------------*/
/*    K ::Sustain ...                                                  */
/*---------------------------------------------------------------------*/
ast.Sustain.prototype.K = function(env) {
   return this.$K = new Set([1]);
}

/*---------------------------------------------------------------------*/
/*    K ::Halt ...                                                     */
/*---------------------------------------------------------------------*/
ast.Halt.prototype.K = function(env) {
   return this.$K = new Set([1]);
}

/*---------------------------------------------------------------------*/
/*    K ::Run ...                                                      */
/*---------------------------------------------------------------------*/
ast.Run.prototype.K = function(env) {
   return this.$K = Kseq(this.children, env);
}

/*---------------------------------------------------------------------*/
/*    K ::Exec ...                                                     */
/*---------------------------------------------------------------------*/
ast.Exec.prototype.K = function(env) {
   return this.$K = new Set([1]);
}

/*---------------------------------------------------------------------*/
/*    K ::Abort ...                                                    */
/*---------------------------------------------------------------------*/
ast.Abort.prototype.K = function(env) {
   return this.$K = Kseq(this.children, env);
}

/*---------------------------------------------------------------------*/
/*    K ::WeakAbort ...                                                */
/*---------------------------------------------------------------------*/
ast.WeakAbort.prototype.K = function(env) {
   return this.$K = Kseq(this.children, env);
}

/*---------------------------------------------------------------------*/
/*    K ::LoopEach ...                                                 */
/*---------------------------------------------------------------------*/
ast.LoopEach.prototype.K = function(env) {
   return this.$K = Kseq(this.children, env);
}

/*---------------------------------------------------------------------*/
/*    K ::Sync ...                                                     */
/*---------------------------------------------------------------------*/
ast.Sync.prototype.K = function(env) {
   return this.$K = new Set([1]);
}

