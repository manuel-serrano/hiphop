/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/lib/loopsafe.js               */
/*    -------------------------------------------------------------    */
/*    Author      :  manuel serrano                                    */
/*    Creation    :  Thu Nov  6 10:07:58 2025                          */
/*    Last change :  Fri Nov  7 10:58:33 2025 (serrano)                */
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
import { ReferenceError, loopError } from "./error.js";

export { loopSafe };

/*---------------------------------------------------------------------*/
/*    loopSafe ...                                                     */
/*---------------------------------------------------------------------*/
function loopSafe(astNode) {
   // compute the K property, Chapter 6, section 6.6, page 69-70
   astNode.K([]);

   const n = unsafeLoop(astNode);

   if (n) {
      loopError(n.loc);
   } 
}

/*---------------------------------------------------------------------*/
/*    unsafeLoop ...                                                   */
/*---------------------------------------------------------------------*/
function unsafeLoop(node) {

   function walk(node) {
      if (node instanceof ast.Loop || node instanceof ast.LoopEach) {
	 const len = node.children.length;

	 if (len === 0) {
	    throw node;
	 } else if (node.children[len - 1].$K.has(0)) {
	    throw node;
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
   
   function Max(Ks) {
      const maxs = Ks.map(k => Math.max.apply(undefined, [...k.values()]));

      return new Set([Math.max.apply(undefined, maxs)]);
   }

   switch (this.children.length) {
      case 0:
	 return this.$K = new Set([0]);
      case 1:
	 return this.$K = this.children[0].K(env);
      default:
	 return this.$K = Max(this.children.map(c => c.K(env)));
   }
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

