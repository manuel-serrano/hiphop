/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/testrandom/filters.mjs        */
/*    -------------------------------------------------------------    */
/*    Author      :  Manuel Serrano                                    */
/*    Creation    :  Tue Nov 18 07:40:33 2025                          */
/*    Last change :  Wed Dec  3 10:05:43 2025 (serrano)                */
/*    Copyright   :  2025 Manuel Serrano                               */
/*    -------------------------------------------------------------    */
/*    HipHop filters                                                   */
/*=====================================================================*/
import * as hh from "../lib/hiphop.js";
import * as config from "./config.mjs";
import * as hhapi from "../lib/ast.js";
import { jsonToHiphop } from "./hiphop.mjs";

export { filterinstantaneous };

/*---------------------------------------------------------------------*/
/*    filterinstantaneous ...                                          */
/*---------------------------------------------------------------------*/
const filterinstantaneous = {
   name() {
      return "instantaneous loop filter"
   },
   check(prop, prog) {
      // return false if no error found, otherwise, returns an error object
      if (config.LOOPSAFE) {
	 try {
	    new hh.ReactiveMachine(prog.clone(), { loopSafe: true, cloneAst: false });
	    return false;
	 } catch (err) {
	    if (err instanceof hh.LoopError) {
	       if (config.VERBOSE >= 3) {
		  console.error("*** ERROR: ", err.toString());
	       }
	       return err;
	    } else {
	       console.error("*** ERROR: ", err.toString());
	       console.error(jsonToHiphop(prog.tojson()));
	       throw err;
	    }
	 }
      } else {
	 return false;
      }
   },
   patch(err) {
      if (err.node) {
	 if (config.VERBOSE >= 3) {
	    console.error("patching instantaneous loop...", err.node.key);
	 }
	 return err.prog.fixIL(err.node);
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
      switch(Math.round(Math.random() * 4)) {
	 case 0:
	    return this.copy(hh.SEQUENCE({}, hh.PAUSE({}), ... this.children));
	 case 1:
	    return this.copy(hh.SEQUENCE({}, this.children.concat([hh.PAUSE({})])));
	 default:
	    if (this.children.length === 1) {
               return this.copy([this.children[0].patchIL()]);
	    } else {
               const i = Math.floor(Math.random() * l);
               return this.copy(this.children.map((c, j) =>
		  i === j ? c.patchIL() : c));
	    }
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

/*---------------------------------------------------------------------*/
/*    patchIL ::Sequence ...                                           */
/*---------------------------------------------------------------------*/
hhapi.Sequence.prototype.patchIL = function() {
   const l = this.children.length;

   if (l === 1) {
      return this.copy([this.children[0].patchIL()]);
   } else {
      const i = Math.round(Math.random() * (l + 1));
      if (i === 0) {
	 return hh.SEQUENCE({}, hh.PAUSE({}), ...this.children);;
      } else if (i === l + 1) {
	 return hh.SEQUENCE({}, this.children.concat([hh.PAUSE({})]));
      } else {
	 return this.copy(this.children.map((c, j) =>
	    (i - 1) === j ? c.patchIL() : c));
      }
   }
}
