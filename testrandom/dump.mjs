/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/testrandom/dump.mjs           */
/*    -------------------------------------------------------------    */
/*    Author      :  robby findler & manuel serrano                    */
/*    Creation    :  Tue May 27 16:45:26 2025                          */
/*    Last change :  Wed Jun 11 08:57:02 2025 (serrano)                */
/*    Copyright   :  2025 robby findler & manuel serrano               */
/*    -------------------------------------------------------------    */
/*    Json dump and pretty-printing HipHop programs                    */
/*=====================================================================*/
import * as hh from "../lib/hiphop.js";
import * as hhapi from "../lib/ast.js";

/*---------------------------------------------------------------------*/
/*    export                                                           */
/*---------------------------------------------------------------------*/
export { jsonToHiphop, jsonToAst };

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
      children: this.children
	 .filter(c => !(c instanceof hhapi.Sync))
	 .map(c => c.tojson())
   };
}

hhapi.Loop.prototype.tojson = function() {
   return {
      node: "loop",
      children: this.children.map(c => c.tojson())
   };
}

hhapi.Trap.prototype.tojson = function() {
   return {
      node: "trap",
      trapName: this.trapName,
      children: this.children.map(c => c.tojson())
   };
}

hhapi.Exit.prototype.tojson = function() {
   return {
      node: "exit",
      trapName: this.trapName,
      children: this.children.map(c => c.tojson())
   };
}

hhapi.Local.prototype.tojson = function() {
  return {
     node: "local",
     signals: this.sigDeclList.map(p => p.name),
     children: this.children.map(c => c.tojson())
  };
}

hhapi.Emit.prototype.tojson = function() {
   return {
      node: "emit",
      signame: this.signame_list[0],
      children: []
   }
}

hhapi.If.prototype.tojson = function() {
   return {
      node: "if",
      func: this.func.toString().replace(/^function[(][)][ ]* { return /, "").replace(/;[ ]*}$/, ""),
      children: this.children.map(c => c.tojson())
   }
}

hhapi.Atom.prototype.tojson = function() {
   return {
      node: "atom",
      func: this.func.toString().replace(/^function[(][)][ ]* { return /, "").replace(/;[ ]*}$/, ""),
      children: []
   }
}

/*---------------------------------------------------------------------*/
/*    jsonToAst ...                                                    */
/*---------------------------------------------------------------------*/
function jsonToAst(obj) {
   const { node, children } = obj;
   
   switch(node) {
      case "module":
	 return hh.MODULE({}, ...children.map(jsonToAst));

      case "nothing":
	 return hh.NOTHING({});

      case "pause":
	 return hh.PAUSE({});

      case "seq":
	 return hh.SEQUENCE({}, ...children.map(jsonToAst));

      case "par":
	 return hh.FORK({}, ...children.map(jsonToAst));

      case "loop":
	 return hh.LOOP({}, ...children.map(jsonToAst));

      case "trap":
	 return hh.TRAP({[obj.trapName]: obj.trapName}, ...children.map(jsonToAst));

      case "exit":
	 return hh.EXIT({[obj.trapName]: obj.trapName});

      case "emit":
	 return hh.EMIT({[obj.signame_list[0]]: obj.signame_list[0]});
	 
      case "local": {
	 const attrs = {};
	 obj.signals.forEach(name => attrs[name] = { signal: name, name, accessibility: hh.INOUT });
	 return hh.LOCALS(attrs, ...children.map(jsonToAst));
      }
	 
      case "if": {
	 const attrs = {apply: eval(`(function() { return ${obj.func}; })`)};
	 return hh.IF(attrs, ...children.map(jsonToAst));
      }
	 
      case "atom": {
	 const attrs = {apply: eval(`(function() { return ${obj.func}; })`)};
	 return hh.ATOM(attrs);
      }
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
	 return margin(m) + 'module() {\n'
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
		  .flatMap(c => ` par {\n${jsonToHiphop(c, m + 2)}\n${margin(m)}}`).join('');
	 }

      case "loop":
	 return margin(m) + 'loop {\n'
	    + children.map(c => jsonToHiphop(c, m + 2)).join(';\n')
	    + '\n' + margin(m) + '}';

      case "trap":
	 return margin(m) + `${obj.trapName}: {\n`
	    + children.map(c => jsonToHiphop(c, m + 2)).join(';\n')
	    + '\n' + margin(m) + '}';

      case "exit":
	 return margin(m) + `break ${obj.trapName};`;

      case "emit":
	 return margin(m) + `emit ${obj.signame}();`;
	 
      case "local":
	 return margin(m) + '{\n'
	    + margin(m + 2) + "signal " + obj.signals.join(", ") + ";\n"
	    + children.map(c => jsonToHiphop(c, m + 2)).join('\n')  
	    + '\n' + margin(m) + '}';

      case "if":
	 return margin(m) + `if (${obj.func}) {\n`
	    + jsonToHiphop(children[0], m + 2) + '\n'
	    + margin(m) + "} else {\n"
	    + jsonToHiphop(children[1], m + 2)+ '\n'
	    + margin(m) + '}';
	 
      case "atom":
	 return margin(m) + `pragma { ${obj.func}; }`;
   }
}
