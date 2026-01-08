/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/testrandom/racket.mjs         */
/*    -------------------------------------------------------------    */
/*    Author      :  Manuel Serrano                                    */
/*    Creation    :  Fri Oct 24 16:29:15 2025                          */
/*    Last change :  Thu Jan  8 09:36:44 2026 (serrano)                */
/*    Copyright   :  2025-26 Manuel Serrano                            */
/*    -------------------------------------------------------------    */
/*    Testing HipHop programs with racket/esterel                      */
/*=====================================================================*/

/*---------------------------------------------------------------------*/
/*    The module                                                       */
/*---------------------------------------------------------------------*/
export { ReactiveMachine };
import { writeFileSync, existsSync, renameSync, unlinkSync } from "node:fs";
import { parseExpr } from "./expr.mjs";
import { spawnSync } from "child_process";

/*---------------------------------------------------------------------*/
/*    unary ...                                                        */
/*---------------------------------------------------------------------*/
const unary = { "!": "signal-not" };
const binary = { "||": "signal-or", "&&" : "signal-and" };

/*---------------------------------------------------------------------*/
/*    margins                                                          */
/*---------------------------------------------------------------------*/
let margins = [""];

function margin(n) {
   if (typeof n !== "number") {
      throw new TypeError("n is not a number: " + n);
   }

   if (typeof margins[n] !== "string") {
      margins[n] = " ".repeat(n);
   }
      
   return margins[n];
}
   
/*---------------------------------------------------------------------*/
/*    json2racket ...                                                  */
/*---------------------------------------------------------------------*/
function json2racket(o, m) {

   function expr2racket(expr, present) {

      function toRacket(obj) {
	 switch (obj.node) {
	    case "constant":
	       return obj.value === "true" ? "#t" : "#f";
	    case "sig":
	       switch (obj.prop) {
		  case "now": return `${obj.value}`;
		  case "pre": return `(NOT-IMPLEMENTED ${obj.value} #:pre 1)`;
		  case "nowval":
		  case "preval": throw TypeError("Racket unimplemented test operator " + obj.prop);
		  default: throw TypeError("Illegal signal operator " + obj.prop);
	       }
	    case "unary":
	       return `(${unary[obj.op]} ${toRacket(obj.expr)})`;
	    case "binary": 
	       return `(${binary[obj.op]} ${toRacket(obj.lhs)} ${toRacket(obj.rhs)})`;
	    default: throw SyntaxError("Unsupported obj: " + obj.node);
	 }
      }

      const test = toRacket(parseExpr(expr));
      if (present) {
	 return `(present? ${test})`;
      } else {
	 return test;
      }
   }
      
   function childrenOf(o, m) {
      if (o.children.length === 1) {
	 return json2racket(o.children[0], m);
      } else {
	 return `${margin(m)}(begin ${o.children.map(c => json2racket(c, m)).join(`${margin(m)}\n`)})`;
      }
   }

   function if2racket({func, children, m}) {
      return `${margin(m)}(if ${expr2racket(func, true)}\n${margin(m + 3)}${json2racket(children[0], m + 3)}\n${margin(m + 3)}${json2racket(children[1], m + 3)})\n`
   }

   switch (o.node) {
      case "module":
	 return `(esterel #:pre 1\n${childrenOf(o, m + 3)})`;
      case "loop":
	 return `${margin(m)}(loop\n${childrenOf(o, m + 3)})`;
      case "if":
	 return if2racket(o, m);
      case "local":
	 return `${margin(m)}(with-signal (${o.signals.join(" ")})\n${childrenOf(o, m + 3)})`;
      case "nothing":
	 return `${margin(m)}(void)`;
      case "pause":
	 return `${margin(m)}(pause)`;
      case "seq":
	 return childrenOf(o, m + 3);
      case "trap":
	 return `${margin(m)}(with-trap ${o.trapName} ${childrenOf(o, m + 3)})`;
      case "exit":
	 return `${margin(m)}(exit-trap ${o.trapName})\n`;
      case "halt":
	 return `${margin(m)}(halt)`;
      case "par":
	 return `${margin(m)}(par ${o.children.map(c => json2racket(c, m + 3)).join("\n")})`;
      case "atom":
	 return `${margin(m)}${expr2racket(o.func, false)}\n`;
      case "emit":
	 return `${margin(m)}(emit ${o.signame})\n`;
      case "abort":
	 return `${margin(m)}(abort ${o.children.map(c => json2racket(c, m)).join("\n")} #:when ${expr2racket(o.func, true)})\n`;
      case "suspend":
	 return `${margin(m)}(suspend ${o.children.map(c => json2racket(c, m)).join("\n")} ${expr2racket(o.func, true)})\n`;
      case "every":
	 return `${margin(m)}(every ${expr2racket(o.func, true)} #:do ${o.children.map(c => json2racket(c, m)).join("\n")})`;
      case "loopeach":
	 return `${margin(m)}(loop ${o.children.map(c => json2racket(c, m)).join("\n")} #:each ${expr2racket(o.func, true)})\n`;
      case "await":
	 return `${margin(m)}(await ${expr2racket(o.func, true)})\n`;
      default:
	 return `"Unsupported node ${o.node}"`;
   }
}

/*---------------------------------------------------------------------*/
/*    makeProg ...                                                     */
/*---------------------------------------------------------------------*/
function makeProg(backend, prog, filename) {
   const evts = `(call-with-input-file "${filename}" read)`;
   const o = prog.tojson();
   
   return ";; generated by testrandom\n"
      + "#lang racket\n"
      + (`(require ${backend})\n`)
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
      + ('                (cons* "\\\"" (signal-name (car keys)) "\\\": true"\n')
      + ('                   (if (pair? (cdr keys))\n')
      + ('                       (cons ", " (loop (cdr keys)))\n')
      + ("                       '())))\n")
      + ("             '(\"}\")))))\n")
      + ('\n')
      + ('(define (handler x)\n')
      + ('    (display (exn-message x) (current-error-port))\n')
      + ('    (newline (current-error-port))\n')
      + ('    (list "{\\\"status\\\": \\\"trouble\\\", \\\"msg\\\": \\\""\n')
      + ('       (regexp-replace* #rx"\n" (exn-message x) " ")\n')
      + ('       "\\\", \\\"reason\\\": \\\"exception\\\", \\\"signals\\\": {}}"))\n')
      + ('\n')
      + (`(define (run-mach machine events)\n`)
      + (`   (cons "["\n`)
      + (`      (let loop ((events events) (i 0))\n`)
      + ('         (display "racket: " (current-error-port))\n')
      + ('         (display i (current-error-port))\n')
      + ('         (newline (current-error-port))\n')
      + ('         (let ((step (with-handlers ([exn:fail? (lambda (x) (set! events (list (car events))) (handler x))])\n')
      + (`                        (append '("{ \\\"status\\\": \\\"success\\\", \\\"signals\\\":")\n`)
      + (`                           (hash-to-json (react! machine #:emit (map symbol-to-signal (car events))))\n`)
      + ('                           \'("}")))))\n')
      + (`            (append step\n`)
      + (`              (if (pair? (cdr events))\n`)
      + (`                  (cons* "," (loop (cdr events) (+ i 1)))\n`)
      + (`                  '("]")))))))\n`)
      + ('\n')
      + (`(define-signal ${o.signals.join(" ")})\n`)
      + (`(define (symbol-to-signal s)\n`)
      + (`   (case s\n`)
      + (`      ${o.signals.map(s => `((${s}) ${s})`).join("\n      ")}\n`)
      + (`      (else (error "unknown signal ~s" s))))\n`)
      + (`(define machine ${json2racket(o, 3)})\n`)
      + ('\n')
      + (`(let ((events ${evts}))\n`)
      + ('   (displayln (apply string-append (run-mach machine events))))\n');
   
}

/*---------------------------------------------------------------------*/
/*    makeStandaloneProg ...                                           */
/*---------------------------------------------------------------------*/
function makeStandaloneProg(backend, prog, events) {
   const evts = `'(${events.map(e => e ? `(${Object.keys(e).join(" ")})` : "()").join(" ")})`;
   const o = prog.tojson();
   
   return ";; generated by testrandom\n"
      + "#lang racket\n"
      + (`(require ${backend})\n`)
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
      + ('                (cons* "\\\"" (signal-name (car keys)) "\\\": true"\n')
      + ('                   (if (pair? (cdr keys))\n')
      + ('                       (cons ", " (loop (cdr keys)))\n')
      + ("                       '())))\n")
      + ("             '(\"}\")))))\n")
      + ('\n')
      + ('(define (handler x)\n')
      + ('    (display (exn-message x) (current-error-port))\n')
      + ('    (newline (current-error-port))\n')
      + ('    (list "{\\\"status\\\": \\\"trouble\\\", \\\"msg\\\": \\\""\n')
      + ('       (regexp-replace* #rx"\n" (exn-message x) " ")\n')
      + ('       "\\\", \\\"reason\\\": \\\"exception\\\"}"))\n')
      + ('\n')
      + (`(define (run-mach machine events)\n`)
      + (`   (let loop ((events events) (i 0))\n`)
      + ('      (display "racket[" (current-error-port))\n')
      + ('      (display i (current-error-port))\n')
      + ('      (display "]: " (current-error-port))\n')
      + ('      (display (apply string-append (hash-to-json (react! machine #:emit (map symbol-to-signal (car events))))) (current-error-port))\n')
      + ('      (newline (current-error-port))\n')
      + (`      (if (pair? (cdr events))\n`)
      + (`          (loop (cdr events) (+ i 1))\n`)
      + ('          #f)))\n')
      + ('\n')
      + (`(define-signal ${o.signals.join(" ")})\n`)
      + (`(define (symbol-to-signal s)\n`)
      + (`   (case s\n`)
      + (`      ${o.signals.map(s => `((${s}) ${s})`).join("\n      ")}\n`)
      + (`      (else (error "unknown signal ~s" s))))\n`)
      + ('\n')
      + (`(define machine ${json2racket(o, 3)})\n`)
      + ('\n')
      + (`(let ((events ${evts}))\n`)
      + ('   (run-mach machine events))\n');
   
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
   backend;
   backendName;
   
   constructor (prog, opts) {
      const backend = opts.backend === "redex"
	 ? "(file \"/tmp/ESTEREL/esterel-metatheory/test/faux-esterel.rkt\")"
	 : "esterel/full";
      
      this.file = opts?.file || this.#rktfile;
      this.eventsfile = opts?.eventsfile || this.#eventsfile;
      this.opts = opts;
      this.rktProg = makeProg(backend, prog, this.eventsfile);
      this.backend = backend;
      this.backendName = this.opts.name || opts.backend || "racket";

      writeFileSync(this.file, this.rktProg);
   }

   name() {
      return this.backendName;
   }
   
   react(e) {
      this.events.push(e);
   }

   reactDebug(e) {
      return this.react(e);
   }

   end() {
      const evt = `(${this.events.map(e => e ? `(${Object.keys(e).join(" ")})` : "()").join(" ")})`;
      writeFileSync(this.eventsfile, evt);
      this.events = [];
      return this.run(this.file);
   }

   run(file) {
      const child = spawnSync("racket", ["-y", this.file]);
      const out = child.stdout.toString();
      try {
	 return JSON.parse(out);
      } catch (e) {
	 console.error("*** Racket: cannot parse generated json text when running");
	 console.error(`racket -y ${this.file}`);
	 console.error(">>>");
	 console.error(out);
	 console.error("<<<");
	 throw e;
      }
   }

   outConf(dir, suffix, {prog, events}) {
      const target = `${dir}/${this.name()}${suffix}.hh.rkt`;
      writeFileSync(target, makeStandaloneProg(this.backend, prog, events) + `\n;; racket -y ${target}`);
      return target;
   }
}
