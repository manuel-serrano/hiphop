/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/testrandom/expr.mjs           */
/*    -------------------------------------------------------------    */
/*    Author      :  Manuel Serrano                                    */
/*    Creation    :  Fri Nov 14 14:49:15 2025                          */
/*    Last change :  Mon Nov 17 10:41:34 2025 (serrano)                */
/*    Copyright   :  2025 Manuel Serrano                               */
/*    -------------------------------------------------------------    */
/*    Simple JS expression parser                                      */
/*=====================================================================*/
export { parseExpr, exprToHiphop, exprEqual, newBinary };

/*---------------------------------------------------------------------*/
/*    makeTokenizer ...                                                */
/*---------------------------------------------------------------------*/
function makeTokenizer(buf) {
   let index = 0;
   
   return function next() {
      if (index === buf.length) {
	 return { kind: "eoi", value: null };
      } else if (buf[index] === " ") {
	 index++;
	 return next();
      } else if (buf[index] === "(" || buf[index] === ")" || buf[index] === "!") {
	 const m = buf[index++];
	 return { kind: m, value: m };
      } else {
	 const s = buf.substr(index);
	 let m = s.match(/^false|^true/);
	 if (m) {
	    index += m[0].length;
	    return { kind: "constant", value: m[0] };
	 } else if (m = s.match(/^this[.]([a-zA-Z0-9_]*)[.]now/)) {
	    index += m[0].length;
	    return { kind: "now", value: m[1] };
	 } else if (m = s.match(/^this[.]([a-zA-Z0-9_]*)[.]pre/)) {
	    index += m[0].length;
	    return { kind: "pre", value: m[1] };
	 } else if (m = s.match(/^&&|^\|\|/)) {
	    index += m[0].length;
	    return { kind: "binary", value: m[0] };
	 } else {
	    index++;
	    return { kind: "error", value: s };
	 }
      }
   }
}

/*---------------------------------------------------------------------*/
/*    parse ...                                                        */
/*---------------------------------------------------------------------*/
function parse(next) {
   let tok = next();

   switch (tok.kind) {
      case "constant":
	 return { kind: "constant", value: tok.value };
      case "now":
	 return { kind: "sig", prop: "now", value: tok.value };
      case "pre":
	 return { kind: "sig", prop: "pre", value: tok.value };
      case "!":
	 return { kind: "unary", op: "!", expr: parse(next)};
      case "(": {
	 const lhs = parse(next);
	 const op = next();
	 const rhs = parse(next);

	 if (next().kind === ")") {
	    if (op.kind === "binary") {
	       return { kind: "binary", op: op.value, lhs: lhs, rhs: rhs };
	    } else {
	       throw SyntaxError("Illegal operator:" + op.value);
	    }
	 } else {
	    throw SyntaxError("Missing parenthesis");
	 }
      }
      case "eoi":
	 throw SyntaxError("Unexpected eof");
      default:
	 throw SyntaxError("Illegal token: " + token.kind);
   }
}

/*---------------------------------------------------------------------*/
/*    parseExpr ...                                                    */
/*---------------------------------------------------------------------*/
function parseExpr(expr) {
   if (expr === undefined) {
      throw new Error("UNDEF");
   }
   return parse(makeTokenizer(expr));
}
   
/*---------------------------------------------------------------------*/
/*    exprToHiphop ...                                                 */
/*---------------------------------------------------------------------*/
function exprToHiphop(obj) {
   switch (obj.kind) {
      case "constant":
	 return obj.value;
      case "sig":
	 return `this.${obj.value}.${obj.prop}`;
      case "unary":
	 return `${obj.op}${exprToHiphop(obj.expr)}`;
      case "binary": 
	 return `(${exprToHiphop(obj.lhs)} ${obj.op} ${exprToHiphop(obj.rhs)})`;
      default:
	 throw SyntaxError("Unsupported obj: " + obj);
   }
}

/*---------------------------------------------------------------------*/
/*    exprEqual ...                                                    */
/*---------------------------------------------------------------------*/
function exprEqual(x, y) {
   if (x.kind === y.kind && x.prop === y.prop && x.value === y.value) {
      if (x.kind === "constant" || x.kind === "sig") {
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
   } else if (lhs.kind === "constant") {
      if (lhs.value === "true") {
	 return (op === "||") ? lhs : rhs;
      } else if (lhs.value === "false") {
	 return (op === "||") ? rhs : lhs;
      }
   } else if (rhs.kind === "constant") {
      return newBinary(op, rhs, lhs);
   } else {
      return {
	 kind: "binary", op, lhs, rhs
      }
   }
}

//console.error("newB=", newBinary("||", parseExpr("this.xxx.now"),  parseExpr("this.xxx.now")));
