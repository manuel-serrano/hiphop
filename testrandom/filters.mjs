/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/testrandom/filters.mjs        */
/*    -------------------------------------------------------------    */
/*    Author      :  Manuel Serrano                                    */
/*    Creation    :  Tue Nov 18 07:40:33 2025                          */
/*    Last change :  Tue Nov 18 11:14:48 2025 (serrano)                */
/*    Copyright   :  2025 Manuel Serrano                               */
/*    -------------------------------------------------------------    */
/*    HipHop filters                                                   */
/*=====================================================================*/
import * as hh from "../lib/hiphop.js";
import * as config from "./config.mjs";
import * as hhapi from "../lib/ast.js";
import { jsonToHiphop } from "./json.mjs";

export { filterinstantaneous };

/*---------------------------------------------------------------------*/
/*    filterinstantaneous ...                                          */
/*---------------------------------------------------------------------*/
const filterinstantaneous = {
   check(prog) {
      // return false if no error found, otherwise, returns an error object
      if (config.LOOPSAFE) {
	 try {
	    new hh.ReactiveMachine(prog.clone(), { loopSafe: true, cloneAst: false });
	    return false;
	 } catch (e) {
	    if (e instanceof hh.LoopError) {
	       if (config.VERBOSE >= 3) {
		  console.error("*** ERROR: ", e.toString());
	       }
	    } else {
	       console.error("*** ERROR: ", e.toString());
	       console.error(jsonToHiphop(prog.tojson()));
	       throw e;
	    }
	    return e;
	 }
      } else {
	 return false;
      }
   },
   patch(prog, err) {
      if (err.node) {
	 if (config.VERBOSE >= 3) {
	    console.error("patching instantaneous loop...", err.node.key);
	 }
	 return prog.fixIL(err.node);
      }
   }
}

/*---------------------------------------------------------------------*/
/*    fixIL ...                                                        */
/*---------------------------------------------------------------------*/
hhapi.$ASTNode.prototype.fixIL = function(node) {
   return this.copy(this.children.map(c => c.fixIL(node)));
}

/*---------------------------------------------------------------------*/
/*    fixIL ::Loop ...                                                 */
/*---------------------------------------------------------------------*/
hhapi.Loop.prototype.fixIL = function(node) {
   if (this === node) {
      const l = this.children.length;

      if (l === 1) {
	 return this.copy([this.children[0].patchIL()]);
      } else {
	 const i = Math.floor(Math.random() * l);
	 return this.copy(this.children.map((c, j) =>
	    i === j ? c.patchIL() : c));
      }
   } else {
      return this.copy(this.children.map(c => c.fixIL(node)));
   }
}

/*---------------------------------------------------------------------*/
/*    patchIL ...                                                      */
/*---------------------------------------------------------------------*/
hhapi.$ASTNode.prototype.patchIL = function() {
   if (Math.random() >= 0.5) {
      return hh.SEQUENCE({}, [ hh.PAUSE({}), this ]);
   } else {
      return hh.SEQUENCE({}, [ this, hh.PAUSE({}) ]);
   }
}
   
/*---------------------------------------------------------------------*/
/*    patchIL ::If ...                                                 */
/*---------------------------------------------------------------------*/
hhapi.If.prototype.patchIL = function() {
   return this.copy(this.children.map(c => c.patchIL()));
}
   
/*---------------------------------------------------------------------*/
/*    patchIL ::Fork ...                                               */
/*---------------------------------------------------------------------*/
hhapi.Fork.prototype.patchIL = function() {
   const l = this.children.length;
   
   if (l === 0) {
      return hh.SEQUENCE({}, [ hh.PAUSE({}), this ]);
   } else if (l === 1) {
      return this.copy([this.children[0].patchIL()]);
   } else {
      const i = Math.floor(Math.random() * l);
      return this.copy(this.children.map((c, j) =>
	 i === j ? c.patchIL() : c));
   }
}
