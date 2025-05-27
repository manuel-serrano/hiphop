/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/testrandom/dump.mjs           */
/*    -------------------------------------------------------------    */
/*    Author      :  robby findler & manuel serrano                    */
/*    Creation    :  Tue May 27 16:45:26 2025                          */
/*    Last change :  Tue May 27 16:54:39 2025 (serrano)                */
/*    Copyright   :  2025 robby findler & manuel serrano               */
/*    -------------------------------------------------------------    */
/*    Json dump and pretty-printing HipHop programs                    */
/*=====================================================================*/
import * as hh from "../lib/hiphop.js";
import * as hhapi from "../lib/ast.js";

/*---------------------------------------------------------------------*/
/*    export                                                           */
/*---------------------------------------------------------------------*/
export { jsonToHiphop };

/*---------------------------------------------------------------------*/
/*    tojson ...                                                       */
/*---------------------------------------------------------------------*/
hhapi.Module.prototype.tojson = function() {
   return {
      node: "module",
      children: this.children.map(c => c.tojson())
   };
}

hhapi.Nothing.prototype.tojson = function() {
   return { node: "nothing" };
}

hhapi.Pause.prototype.tojson = function() {
   return { node: "pause" };
}

hhapi.Sequence.prototype.tojson = function() {
   return {
      node: "seq", children:
      this.children.map(c => c.tojson())
   };
}

hhapi.Fork.prototype.tojson = function() {
   return {
      node: "par",
      children: this.children.map(c => c.tojson())
   };
}

hhapi.Loop.prototype.tojson = function() {
   return {
      node: "loop",
      children: this.children.map(c => c.tojson())
   };
}

/*---------------------------------------------------------------------*/
/*    jsonToHiphop ...                                                 */
/*---------------------------------------------------------------------*/
function jsonToHiphop(obj) {
   const { node, children } = obj;

   switch(node) {
      case "module": 
	 return 'module () {\n'
	    + children.map(jsonToHiphop).join(';\n')
	    + '\n}';

      case "nothing":
	 return ';';

      case "pause":
	 return 'yield;';

      case "seq":
	 if (children.length === 0) {
	    return "";
	 } else {
	    return '{\n'
	       + children.map(jsonToHiphop).join('\n')  
	       + '\n}';
	 }

      case "par":
	 if (children.length === 0) {
	    return 'fork {}';
	 } else {
	    return 'fork {\n'
	       + jsonToHiphop(children[0])
	       + '\n}'
	       + children
		  .slice(1, children.length)
		  .flatMap(c => ` par {\n ${jsonToHiphop(c)} \n}`);
	 }

      case "loop":
	 return 'loop {\n'
	    + children.map(jsonToHiphop).join(';\n')
	    + '\n}';
   }
}
