/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/testrandom/json.mjs           */
/*    -------------------------------------------------------------    */
/*    Author      :  robby findler & manuel serrano                    */
/*    Creation    :  Tue May 27 16:45:26 2025                          */
/*    Last change :  Tue Dec  2 09:07:14 2025 (serrano)                */
/*    Copyright   :  2025 robby findler & manuel serrano               */
/*    -------------------------------------------------------------    */
/*    Json dump and pretty-printing HipHop programs                    */
/*=====================================================================*/
import * as hh from "../lib/hiphop.js";
import * as hhapi from "../lib/ast.js";

/*---------------------------------------------------------------------*/
/*    export                                                           */
/*---------------------------------------------------------------------*/
export { jsonToAst };

/*---------------------------------------------------------------------*/
/*    tojson ...                                                       */
/*---------------------------------------------------------------------*/
hhapi.Module.prototype.tojson = function() {
   return {
      node: "module",
      signals: this.sigDeclList.map(s => s.name),
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

hhapi.Halt.prototype.tojson = function() {
   return {
      node: "halt",
      trapName: this.trapName
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
      value: ("func" in this ? this.func() : null),
      children: []
   };
}

hhapi.If.prototype.tojson = function() {
   const func = (this.func instanceof hh.$Delay)
      ? this.func.tojson()
      : this.func.toString()
	 .replace(/^function[(][)][ ]* { return /, "")
	 .replace(/;[ ]*}$/, "");
   return {
      node: "if",
      func,
      children: this.children.map(c => c.tojson())
   };
}

hhapi.Abort.prototype.tojson = function() {
   const func = (this.func instanceof hh.$Delay)
      ? this.func.tojson()
      : this.func.toString()
	 .replace(/^function[(][)][ ]* { return /, "")
	 .replace(/;[ ]*}$/, "");

   return {
      node: "abort",
      func,
      children: this.children.map(c => c.tojson())
   };
}

hhapi.Suspend.prototype.tojson = function() {
   const func = (this.func instanceof hh.$Delay)
      ? this.func.tojson()
      : this.func.toString()
	 .replace(/^function[(][)][ ]* { return /, "")
	 .replace(/;[ ]*}$/, "");

   return {
      node: "suspend",
      func,
      children: this.children.map(c => c.tojson())
   };
}

hhapi.Every.prototype.tojson = function() {
   const func = (this.func instanceof hh.$Delay)
      ? this.func.tojson()
      : this.func.toString()
	 .replace(/^function[(][)][ ]* { return /, "")
	 .replace(/;[ ]*}$/, "");

   return {
      node: "every",
      func,
      children: this.children.map(c => c.tojson())
   };
}

hhapi.LoopEach.prototype.tojson = function() {
   const func = (this.func instanceof hh.$Delay)
      ? this.func.tojson()
      : this.func.toString()
	 .replace(/^function[(][)][ ]* { return /, "")
	 .replace(/;[ ]*}$/, "");

   return {
      node: "loopeach",
      func,
      children: this.children.map(c => c.tojson())
   };
}

hhapi.Await.prototype.tojson = function() {
   const func = (this.func instanceof hh.$Delay)
      ? this.func.tojson()
      : this.func.toString()
	 .replace(/^function[(][)][ ]* { return /, "")
	 .replace(/;[ ]*}$/, "");

   return {
      node: "await",
      func,
      children: []
   };
}

hhapi.Atom.prototype.tojson = function() {
   return {
      node: "atom",
      func: this.func.toString().replace(/^function[(][)][ ]* { return /, "").replace(/;[ ]*}$/, ""),
      children: []
   };
}

hhapi.$ASTNode.prototype.tojson = function() {
   console.error(`*** ERROR: ${this.constructor.name} -- tojson not implemented`);
   throw "tojson not implemented.";
}

hh.DelaySig.prototype.tojson = function() {
   return {
      node: "sig",
      value: this.id,
      prop: this.prop
   };
}

hh.DelayUnary.prototype.tojson = function() {
   return {
      node: "unary",
      op: this.op,
      expr: this.delay.tojson()
   };
}

hh.DelayBinary.prototype.tojson = function() {
   return {
      node: "binary",
      op: this.op === "OR" ? "||" : this.op,
      lhs: this.lhs.tojson(),
      rhs: this.rhs.tojson()
   };
}

/*---------------------------------------------------------------------*/
/*    jsonToAst ...                                                    */
/*---------------------------------------------------------------------*/
function jsonToAst(obj) {
   const { node, children } = obj;

   function delayToAst(node) {
      switch (node.node) {
	 case "sig": {
	    return new hh.DelaySig(node.value, node.prop);
	 }
	 case "unary": {
	    return new hh.DelayUnary(node.op, delayToAst(node.expr));
	 }
	 case "binary": {
	    const op = node.op === "||" ? "OR" : node.op;
	    return new hh.DelayBinary(op, delayToAst(node.lhs), delayToAst(node.rhs));
	 }
	 default:
	    console.error("*** ERROR: illegal json", node);
	    throw new TypeError("Illegal json");
      }
   }
	    
   switch (node) {
      case "module": { 
	 const attrs = {};
	 obj.signals.forEach(name => attrs[name] = { signal: name, name, accessibility: hh.INOUT, combine: (x, y) => (x + y) });
	 return hh.MODULE(attrs, ...children.map(jsonToAst));
      }

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

      case "halt":
	 return hh.HALT({});

      case "emit":
	 const func = eval(`(function() { return ${obj.value}; })`);
	 return hh.EMIT({[obj.signame]: obj.signame, apply: func});
	 
      case "local": {
	 const attrs = {};
	 obj.signals.forEach(name => attrs[name] = { signal: name, name, combine: (x, y) => (x + y) });
	 return hh.LOCAL(attrs, ...children.map(jsonToAst));
      }
	 
      case "if": {
	 const attrs = typeof obj.func === "string"
	    ? {apply: eval(`(function() { return ${obj.func}; })`)}
	    : {apply: delayToAst(obj.func)};
	 return hh.IF(attrs, ...children.map(jsonToAst));
      }
	 
      case "abort": {
	 const attrs = typeof obj.func === "string"
	    ? {apply: eval(`(function() { return ${obj.func}; })`)}
	    : {apply: delayToAst(obj.func)};
	 return hh.ABORT(attrs, ...children.map(jsonToAst));
      }
	 
      case "suspend": {
	 const attrs = typeof obj.func === "string"
	    ? {apply: eval(`(function() { return ${obj.func}; })`)}
	    : {apply: delayToAst(obj.func)};
	 return hh.SUSPEND(attrs, ...children.map(jsonToAst));
      }
	 
      case "every": {
	 const attrs = typeof obj.func === "string"
	    ? {apply: eval(`(function() { return ${obj.func}; })`)}
	    : {apply: delayToAst(obj.func)};
	 return hh.EVERY(attrs, ...children.map(jsonToAst));
      }
	 
      case "loopeach": {
	 const attrs = typeof obj.func === "string"
	    ? {apply: eval(`(function() { return ${obj.func}; })`)}
	    : {apply: delayToAst(obj.func)};
	 return hh.LOOPEACH(attrs, ...children.map(jsonToAst));
      }
	 
      case "await": {
	 const attrs = typeof obj.func === "string"
	    ? {apply: eval(`(function() { return ${obj.func}; })`)}
	    : {apply: delayToAst(obj.func)};
	 return hh.AWAIT(attrs);
      }
	 
      case "atom": {
	 const attrs = {apply: eval(`(function() { return ${obj.func}; })`)};
	 return hh.ATOM(attrs);
      }

      default:
	 return delayToAst(obj);
   }
}

