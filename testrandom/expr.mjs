/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/testrandom/expr.mjs           */
/*    -------------------------------------------------------------    */
/*    Author      :  Manuel Serrano                                    */
/*    Creation    :  Fri Nov 14 14:49:15 2025                          */
/*    Last change :  Thu Nov 27 07:14:11 2025 (serrano)                */
/*    Copyright   :  2025 Manuel Serrano                               */
/*    -------------------------------------------------------------    */
/*    Simple JS expression parser                                      */
/*=====================================================================*/
import * as hh from "../lib/hiphop.js";
export { parseExpr, exprToHiphop, exprEqual, newBinary };

/*---------------------------------------------------------------------*/
/*    makeTokenizer ...                                                */
/*---------------------------------------------------------------------*/
function makeTokenizer(buf) {
   let index = 0;
   
   return function next() {
      if (index === buf.length) {
	 return { node: "eoi", value: null };
      } else if (buf[index] === " ") {
	 index++;
	 return next();
      } else if (buf[index] === "(" || buf[index] === ")" || buf[index] === "!") {
	 const m = buf[index++];
	 return { node: m, value: m };
      } else {
	 const s = buf.substr(index);
	 let m = s.match(/^false|^true/);
	 if (m) {
	    index += m[0].length;
	    return { node: "constant", value: m[0] };
	 } else if (m = s.match(/^(?:this[.])?([a-zA-Z0-9_]*)[.](now(?:val)?)/)) {
	    index += m[0].length;
	    return { node: m[2], value: m[1] };
	 } else if (m = s.match(/^(?:this[.])?([a-zA-Z0-9_]*)[.](pre(?:val)?)/)) {
	    index += m[0].length;
	    return { node: m[2], value: m[1] };
	 } else if (m = s.match(/^&&|^\|\|/)) {
	    index += m[0].length;
	    return { node: "binary", value: m[0] };
	 } else {
	    index++;
	    return { node: "error", value: s };
	 }
      }
   }
}

/*---------------------------------------------------------------------*/
/*    parse ...                                                        */
/*---------------------------------------------------------------------*/
function parse(next) {
   let tok = next();

   switch (tok.node) {
      case "constant":
	 return { node: "constant", value: tok.value };
      case "now":
      case "pre":
      case "nowval":
      case "preval":
	 return { node: "sig", prop: tok.node, value: tok.value };
      case "!":
	 return { node: "unary", op: "!", expr: parse(next)};
      case "(": {
	 const lhs = parse(next);
	 const op = next();
	 const rhs = parse(next);

	 if (next().node === ")") {
	    if (op.node === "binary") {
	       return { node: "binary", op: op.value, lhs: lhs, rhs: rhs };
	    } else {
	       throw SyntaxError("Illegal operator:" + op.value);
	    }
	 } else {
	    throw SyntaxError("Missing parenthesis");
	 }
      }
      case "eoi":
	 throw SyntaxError("Unexpected eof");
      case "error":
	 throw SyntaxError("Unexpected token: " + tok.value);
      default:
	 throw SyntaxError("Illegal token: " + tok.node);
   }
}

/*---------------------------------------------------------------------*/
/*    parseExpr ...                                                    */
/*---------------------------------------------------------------------*/
function parseExpr(expr) {
   if (expr === undefined) {
      throw new Error("UNDEF");
   } else if (typeof expr === "string") {
      return parse(makeTokenizer(expr));
   } else if (expr instanceof Object) {
      return expr;
   } else {
      console.error("*** ERROR: parseExpr: illegal expression", expr.toString());
      throw TypeError("Illegal expr");
   }
}
   
/*---------------------------------------------------------------------*/
/*    exprToHiphop ...                                                 */
/*---------------------------------------------------------------------*/
function exprToHiphop(obj) {
   switch (obj.node) {
      case "constant":
	 return obj.value;
      case "sig":
	 return `this.${obj.value}.${obj.prop}`;
      case "unary":
	 return `${obj.op}${exprToHiphop(obj.expr)}`;
      case "binary": 
	 return `(${exprToHiphop(obj.lhs)} ${obj.op} ${exprToHiphop(obj.rhs)})`;
      default:
	 throw SyntaxError("Unsupported obj: " + obj.constructor.name);
   }
}

/*---------------------------------------------------------------------*/
/*    exprEqual ...                                                    */
/*---------------------------------------------------------------------*/
function exprEqual(x, y) {
   if (x.node === y.node && x.prop === y.prop && x.value === y.value) {
      if (x.node === "constant" || x.node === "sig") {
	 return true;
      } else {
	 return exprToHiphop(x) === exprToHiphop(y);
      }
   } else {
      return false;
   }
}

/*---------------------------------------------------------------------*/
/*    newBinary ...                                                    */
/*---------------------------------------------------------------------*/
function newBinary(op, lhs, rhs) {
   if (exprEqual(lhs, rhs)) {
      return lhs;
   } else if (lhs.node === "constant") {
      if (lhs.value === "true") {
	 return (op === "||") ? lhs : rhs;
      } else if (lhs.value === "false") {
	 return (op === "||") ? rhs : lhs;
      }
   } else if (rhs.node === "constant") {
      return newBinary(op, rhs, lhs);
   } else {
      return {
	 node: "binary", op, lhs, rhs
      }
   }
}

//console.error("newB=", newBinary("||", parseExpr("this.xxx.now"),  parseExpr("this.xxx.now")));
