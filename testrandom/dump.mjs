/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/testrandom/dump.mjs           */
/*    -------------------------------------------------------------    */
/*    Author      :  robby findler & manuel serrano                    */
/*    Creation    :  Tue May 27 16:45:26 2025                          */
/*    Last change :  Tue May 27 20:51:50 2025 (serrano)                */
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

hhapi.Local.prototype.tojson = function() {
  return {
     node: "local",
     signals: this.sigDeclList,
     children: this.children.map(c => c.tojson())
  };
}

hhapi.Emit.prototype.tojson = function() {
   return {
      node: "emit",
      signal: this.signame_list[0],
      children: []
   }
}

/*---------------------------------------------------------------------*/
/*    margins ...                                                      */
/*---------------------------------------------------------------------*/
const margins = [ "", " ", "  ", "   ", "    ", "     ", "      "];

/*---------------------------------------------------------------------*/
/*    margin ...                                                       */
/*---------------------------------------------------------------------*/
function margin(m) {
   if (m >= margins.length) {
      margins[m] = Array.from({length: m}).map(i => " ").join("");
   }
   return margins[m];
}

/*---------------------------------------------------------------------*/
/*    jsonToHiphop ...                                                 */
/*---------------------------------------------------------------------*/
function jsonToHiphop(obj, m = 0) {
   const { node, children } = obj;

   switch(node) {
      case "module": 
	 return margin(m) + 'module () {\n'
	    + children.map(c => jsonToHiphop(c, m + 2)).join(';\n')
	    + '\n' + margin(m) + '}';

      case "nothing":
	 return margin(m) + ';';

      case "pause":
	 return margin(m) + 'yield;';

      case "seq":
	 if (children.length === 0) {
	    return "";
	 } else {
	    return margin(m) + '{\n'
	       + children.map(c => jsonToHiphop(c, m + 2)).join('\n')  
	       + '\n' + margin(m) + '}';
	 }

      case "par":
	 if (children.length === 0) {
	    return margin(m) + 'fork {}';
	 } else {
	    return margin(m) + 'fork {\n'
	       + jsonToHiphop(children[0], m + 2)
	       + '\n' + margin(m) + '}'
	       + children
		  .slice(1, children.length)
		  .flatMap(c => ` par {\n${jsonToHiphop(c, m + 2)}\n${margin(m)}}`);
	 }

      case "loop":
	 return margin(m) + 'loop {\n'
	    + children.map(c => jsonToHiphop(c, m + 2)).join(';\n')
	    + '\n' + margin(m) + '}';

      case "emit":
	 return margin(m) + `emit ${obj.signal}();`;
	 
      case "local":
	 return margin(m) + '{\n'
	    + obj.signals.map(s => margin(m + 2) + s + ";\n")
	       + children.map(c => jsonToHiphop(c, m + 2)).join('\n')  
	    + '\n' + margin(m) + '}';
   }
}
