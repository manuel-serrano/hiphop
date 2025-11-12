/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/testrandom/racket.mjs         */
/*    -------------------------------------------------------------    */
/*    Author      :  Manuel Serrano                                    */
/*    Creation    :  Fri Oct 24 16:29:15 2025                          */
/*    Last change :  Wed Nov 12 05:22:44 2025 (serrano)                */
/*    Copyright   :  2025 Manuel Serrano                               */
/*    -------------------------------------------------------------    */
/*    Testing HipHop programs with racket/esterel                      */
/*=====================================================================*/

/*---------------------------------------------------------------------*/
/*    The module                                                       */
/*---------------------------------------------------------------------*/
export { ReactiveMachine };
import { writeFileSync, existsSync, renameSync, unlinkSync } from "node:fs";
import { spawnSync } from "child_process";

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
/*    json2racket ...                                                  */
/*---------------------------------------------------------------------*/
function json2racket(o) {

   function parseExpr(next) {
      let tok = next();

      switch (tok.kind) {
	 case "constant": return tok.value === "true" ? "#t" : "#f";
	 case "now": return `(present? ${tok.value})`;
	 case "pre": return `(present? ${tok.value} #:pre 1)`;
	 case "!": return `(not ${parseExpr(next)})`;
	 case "(": {
	    const lhs = parseExpr(next);
	    const op = next();
	    const rhs = parseExpr(next);

	    if (next().kind === ")") {
	       if (op.kind === "binary") {
		  return `(${op.value === "||" ? "or" : "and"} ${lhs} ${rhs})`;
	       } else {
		  throw SyntaxError("Illegal operator:" + op.value);
	       }
	    } else {
	       throw SyntaxError("Missing parenthesis");
	    }
	 }
	 case "eoi": throw SyntaxError("Unexpected eof");
	 default: throw SyntaxError("Illegal token: " + token.kind);
      }
   }
      
   function expr2racket(expr) {
      return parseExpr(makeTokenizer(expr));
   }
   
   function childrenOf(o) {
      if (o.children.length === 1) {
	 return json2racket(o.children[0]);
      } else {
	 return `(begin ${o.children.map(json2racket).join("\n")})`;
      }
   }

   function if2racket({func, children}) {
      return `(if (begin "${func}" ${expr2racket(func)}) ${json2racket(children[0])} ${json2racket(children[1])})`
   }
   
   switch (o.node) {
      case "module":
	 return `(esterel #:pre 1 ${childrenOf(o)})`;
      case "loop":
	 return `(loop ${childrenOf(o)})`;
      case "if":
	 return if2racket(o);
      case "local":
	 return `(with-signal (${o.signals.join(" ")}) ${childrenOf(o)})`;
      case "nothing":
	 return "(void)";
      case "pause":
	 return "(pause)";
      case "seq":
	 return childrenOf(o);
      case "trap":
	 return `(with-trap ${o.trapName} ${childrenOf(o)})`;
      case "exit":
	 return `(exit-trap ${o.trapName})`;
      case "halt":
	 return `(loop (pause))`;
      case "par":
	 return `(par ${o.children.map(json2racket).join("\n")})`;
      case "atom":
	 return `(begin "${o.func}" ${expr2racket(o.func)})`;
      case "emit":
	 return `(emit ${o.signame})`;
      default:
	 return `"Unsupported node ${o.node}"`;
   }
}

/*---------------------------------------------------------------------*/
/*    makeProg ...                                                     */
/*---------------------------------------------------------------------*/
function makeProg(prog, events) {
   const evts = (typeof events === "string")
      ? `(call-with-input-file "${events}" read)`
      : `'(${events.map(e => "()").join(" ")})`;
   
   return ";; generated by testrandom\n"
      + "#lang racket\n"
      + ('(require esterel/full)\n')
      + ('\n')
      + ("(define (cons* a . x)\n")
      + ("   (define (consx x) (if (null? (cdr x)) (car x) (cons (car x) (consx (cdr x)))))\n")
      + ("   (if (null? x) a (cons a (consx x))))\n")
      + ('\n')
      + ('(define (hash-to-json hash)\n')
      + ('   (let ((keys (filter (lambda (k) (hash-ref hash k #f)) (hash-keys hash))))\n')
      + ('      (if (null? keys)\n')
      + ("          '(\"{}\")\n")
      + ("          (append '(\"{\")\n")
      + ('             (let loop ((keys keys))\n')
      + ('                (cons* "\\\"" (signal-name (car keys)) "\\\": null"\n')
      + ('                   (if (pair? (cdr keys))\n')
      + ('                       (cons ", " (loop (cdr keys)))\n')
      + ("                       '())))\n")
      + ("             '(\"}\")))))\n")
      + ('\n')
      + ('(define (handler x)\n')
      + ('    (display (exn-message x) (current-error-port))\n')
      + ('    (newline (current-error-port))\n')
      + ('    (list "{\\\"status\\\": \\\"error\\\", \\\"msg\\\": \\\""\n')
      + ('       (regexp-replace* #rx"\n" (exn-message x) " ")\n')
      + ('       "\\\", \\\"reason\\\": \\\"exception\\\"}"))\n')
      + ('\n')
      + (`(define (run-mach machine events)\n`)
      + (`   (cons "["\n`)
      + (`      (let loop ((events events) (i 0))\n`)
      + ('         (display "racket: " (current-error-port))\n')
      + ('         (display i (current-error-port))\n')
      + ('         (newline (current-error-port))\n')
      + ('         (let ((step (with-handlers ([exn:fail? (lambda (x) (set! events (list (car events))) (handler x))])\n')
      + (`                        (append '("{ \\\"status\\\": \\\"success\\\", \\\"signals\\\":")\n`)
      + (`                           (hash-to-json (react! machine))\n`)
      + ('                           \'("}")))))\n')
      + (`            (append step\n`)
      + (`              (if (pair? (cdr events))\n`)
      + (`                  (cons* "," (loop (cdr events) (+ i 1)))\n`)
      + (`                  '("]")))))))\n`)
      + ('\n')
      + (`(define machine ${json2racket(prog.tojson())})\n`)
      + ('\n')
      + (`(let ((events ${evts}))\n`)
      + ('   (display (apply string-append (run-mach machine events))))\n');
   
}

/*---------------------------------------------------------------------*/
/*    ReactiveMachine ...                                              */
/*---------------------------------------------------------------------*/
class ReactiveMachine {
   #rktfile = "/tmp/prog.hh.rkt";
   #eventsfile = "/tmp/prog.events.rkt";
   
   events = [];
   rktProg = undefined;
   opts = {};
   file;
   
   constructor (prog, opts) {
      this.file = opts?.file || this.#rktfile;
      this.eventsfile = opts?.eventsfile || this.#eventsfile;
      this.opts = opts;
      this.rktProg = makeProg(prog, this.eventsfile);
      writeFileSync(this.file, this.rktProg);
   }

   name() {
      return this.opts.name || "racket"
   }
   
   react(e) {
      this.events.push("()")
   }

   reactDebug(e) {
      this.react(e)
   }

   end() {
      writeFileSync(this.eventsfile, `(${this.events.join(" ")})`);
      this.events = [];
      return this.run(this.file);
   }

   run(file) {
      const child = spawnSync("racket", [this.file]);
      const out = child.stdout.toString();
      return JSON.parse(out);
   }

   outProg(suffix, prog, events) {
      const target = `racket${suffix}.hh.rkt`;
      writeFileSync(target, makeProg(prog, events) + `\n;; racket ${target}`);
      return target;
   }
}
