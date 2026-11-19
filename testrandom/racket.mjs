/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/testrandom/racket.mjs         */
/*    -------------------------------------------------------------    */
/*    Author      :  Manuel Serrano                                    */
/*    Creation    :  Fri Oct 24 16:29:15 2025                          */
/*    Last change :  Thu Jan  8 13:38:05 2026 (serrano)                */
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
	 return `${margin(m)}(begin\n${o.children.map(c => json2racket(c, m + 3)).join(``)}${margin(m+3)})\n`;
      }
   }

   function if2racket({ func, children }, m) {
      return `${margin(m)}(if ${expr2racket(func, true)}\n${json2racket(children[0], m + 3)}${json2racket(children[1], m + 3)}${margin(m + 3)})\n`
   }

   switch (o.node) {
      case "module":
	 return `(esterel #:pre 1\n${childrenOf(o, m + 3)}${margin(m + 3)})`;
      case "loop":
	 return `${margin(m)}(loop\n${childrenOf(o, m + 3)}${margin(m + 3)})\n`;
      case "if":
	 return if2racket(o, m);
      case "local":
	 return `${margin(m)}(with-signal (${o.signals.join(" ")})\n${childrenOf(o, m + 3)}${margin(m + 3)})\n`;
      case "nothing":
	 return `${margin(m)}(void)\n`;
      case "pause":
	 return `${margin(m)}(pause)\n`;
      case "seq":
	 return childrenOf(o, m);
      case "trap":
	 return `${margin(m)}(with-trap ${o.trapName} ${childrenOf(o, m + 3)}${margin(m + 3)})\n`;
      case "exit":
	 return `${margin(m)}(exit-trap ${o.trapName})\n`;
      case "halt":
	 return `${margin(m)}(halt)\n`;
      case "par":
	 return `${margin(m)}(par\n${o.children.map(c => json2racket(c, m + 3)).join("")}${margin(m + 3)})\n`;
      case "atom":
	 return `${margin(m)}${expr2racket(o.func, false)}\n`;
      case "emit":
	 return `${margin(m)}(emit ${o.signame})\n`;
      case "abort":
	 return `${margin(m)}(abort ${o.children.map(c => json2racket(c, m + 3)).join("")} #:when ${expr2racket(o.func, true)}\n${margin(m + 3)})\n`;
      case "suspend":
	 return `${margin(m)}(suspend ${o.children.map(c => json2racket(c, m + 3)).join("")} ${expr2racket(o.func, true)}\n${margin(m + 3)})\n`;
      case "every":
	 return `${margin(m)}(every ${expr2racket(o.func, true)} #:do ${o.children.map(c => json2racket(c, m + 3)).join("")}${margin(m + 3)})\n`;
      case "loopeach":
	 return `${margin(m)}(loop ${o.children.map(c => json2racket(c, m + 3)).join("")} #:each ${expr2racket(o.func, true)}\n${margin(m + 3)})\n`;
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
  return makeProgGeneric(backend, prog, `(call-with-input-file "${filename}" read)`)
}

/*---------------------------------------------------------------------*/
/*    makeProgGeneric ...                                              */
/*---------------------------------------------------------------------*/
function makeProgGeneric(backend, prog, evts_code) {
   const o = prog.tojson();

   return "#lang racket\n"
      + ";; generated by testrandom\n"
      + (`(require ${backend} json)\n`)
      + ('\n')
      + ('(define (hash-to-json hash)\n')
      + ('  (for/hash ([(k v) (in-hash hash)] #:when v)\n')
      + ('    (values (string->symbol (signal-name k)) v)))\n')
      + ('\n')
      + ('(define (handler exn)\n')
      + ('  (define msg (exn-message exn))\n')
      + ('  (define status (cond [(regexp-match? #rx"the program is not constructive" msg) "causality"] [(regexp-match? #rx"gave up" msg) "gaveup"] [else "trouble"]))\n')
      + ('  (list (hash \'reason "exception" \'signals (hash) \'status status \'msg (regexp-replace* #rx"\\n" msg " "))))\n')
      + ('\n')
      + ('(define (run-mach machine events)\n')
      + ('  (let loop ((events events) (i 0))\n')
      + ('    (match events\n')
      + ('      [\'() \'()]\n')
      + ('      [(cons this-instant events)\n')
      + ('       (eprintf "racket: ~a\\n" i)\n')
      + ('       (with-handlers ([exn:fail? handler])\n')
      + ('         (cons (hash \'status "success" \'signals\n')
      + ('                     (hash-to-json (react! machine #:emit (map symbol-to-signal this-instant))))\n')
      + ('               (loop events (+ i 1))))])))\n')
      + ('\n')
      + (`(define-signal ${o.signals.join(" ")})\n`)
      + (`(define (symbol-to-signal s)\n`)
      + (`   (case s\n`)
      + (`      ${o.signals.map(s => `((${s}) ${s})`).join("\n      ")}\n`)
      + (`      (else (error "unknown signal ~s" s))))\n`)
      + (`(define machine ${json2racket(o, 0)})\n`)
      + ('\n')
      + (`(write-json (run-mach machine ${evts_code}))\n`);
      + (`(newline)\n`);
}

function events_to_sexp(evts) {
  return `(${evts.map(e => e ? `(${Object.keys(e).join(" ")})` : "()").join(" ")})`;
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
      const evt = events_to_sexp(this.events)
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

   outConf(dir, suffix, { prog, events }) {
      const target = `${dir}/${this.name()}${suffix}.hh.rkt`;
      writeFileSync(target, makeProgGeneric(this.backend, prog, `'${events_to_sexp(events)}`) + `\n;; racket -y ${target}`);
      return target;
   }
}
