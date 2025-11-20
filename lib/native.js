/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/lib/native.js                 */
/*    -------------------------------------------------------------    */
/*    Author      :  Manuel Serrano                                    */
/*    Creation    :  Wed Nov 19 06:57:43 2025                          */
/*    Last change :  Thu Nov 20 16:59:10 2025 (serrano)                */
/*    Copyright   :  2025 Manuel Serrano                               */
/*    -------------------------------------------------------------    */
/*    Native net-list compilation                                      */
/*=====================================================================*/

/*---------------------------------------------------------------------*/
/*    ES6 module                                                       */
/*---------------------------------------------------------------------*/
import * as config from "./config.js";
import * as net from "./net.js";
import { Queue } from "./queue.js";
import * as compiler from "./compiler.js";
import { readFileSync, writeFileSync } from "node:fs";
import { basename } from "node:path";

export { compile, link }

/*---------------------------------------------------------------------*/
/*    DEBUG ...                                                        */
/*---------------------------------------------------------------------*/
const DEBUG = process.env.HIPHOP_TRACE
   && process.env.HIPHOP_TRACE.split(",").find(n => n === "native");

/*---------------------------------------------------------------------*/
/*    compile ...                                                      */
/*---------------------------------------------------------------------*/
function compile(mach) {
   if (config.Process.env.HIPHOP_DEBUG_NATIVE_SOURCE) {
      // debug, substitute the actual circuit with a user file
      if (DEBUG) {
	 console.log("load native", config.Process.env.HIPHOP_DEBUG_NATIVE_SOURCE);
      }
      return readFileSync(config.Process.env.HIPHOP_DEBUG_NATIVE_SOURCE).toString();
   } else {

      if (DEBUG) {
	 console.log("compile native...");
      }
      return compileJS(mach);
   }
}

/*---------------------------------------------------------------------*/
/*    link ...                                                         */
/*---------------------------------------------------------------------*/
function link(mach, obj) {
   return linkJS(mach, obj);
}

/*---------------------------------------------------------------------*/
/*    compileJS ...                                                    */
/*    -------------------------------------------------------------    */
/*    Returns a JS string that is the result of the compilation        */
/*    of the acyclic circuit of the machine. It is compiled into       */
/*    a JS function that accepts as parameters all the JS thunks       */
/*    of all the ActionNets it contains. The function linkJS, calls    */
/*    this function with all the actual thunk which yield to a         */
/*    "react" function that can be invoked as the genuine mach.react   */
/*    method.                                                          */
/*---------------------------------------------------------------------*/
function compileJS(mach) {

   function purify(str) {
      if (str.indexOf(str, /\n/) >= 0) {
	 const p = str.replace(/\n/g, " ");
	 if (p.length > 20) {
	    return p.substring(0, 20) + "...";
	 } else {
	    return p;
	 }
      } else {
	 return str;
      }
   }

   function isConstantNet(n) {
      return n.faninList.length === 0
	 && n.__proto__ === net.LogicalNet.prototype
	 && n.sweepable;
   }

   // generate the net-list
   mach.compile();
   
   let buf = "";
   let nets = mach.nets;

   // get the list of actions (thunks of ActionNet nodes)
   const args = nets.filter(n => n instanceof net.ActionNet)
      .map(n => n.toJSAction())
      .join(", ");

   // pack all actions inside a unique parameter to work around
   // some JS implementation restriction on the number of arguments.
   buf += (`(A) => {\n`)

   if (args.length > 0) {
      buf += `   const { ${args} } = A;\n\n`;
   }

   // invokeListeners
   buf += "   const invokeListeners = (mach, signame, emitted, emittedDebug) => {\n";
   buf += "      const sig = mach.global_signal_map[signame];\n";
   buf += "      const preval = mach.signals[signame].nowval;\n";
   buf += "      const callbacks = mach.host_event_map[signame];\n\n";
   buf += "      mach.signals[signame].preval = mach.signals[signame].nowval;\n";
   buf += "      mach.signals[signame].pre = mach.signals[signame].now;\n";
   buf += "      mach.signals[signame].nowval = sig.value;\n";
   buf += "      mach.signals[signame].now = true;\n\n";
   buf += "      if (callbacks) {\n";
   buf += "         let stop_propagation = false;\n";
   buf += "         let event = { signame, nowval: sig.value, preval, stopPropagation: () => { stop_propagation = true; } };\n";
   buf += "         for (let i = 0; i < callbacks.length && !stop_propagation; i++) callbacks[i].call(mach, event);\n";
   buf += "      } else {\n";
   buf += "         mach.signals[signame].pre = mach.signals[signame].now;\n";
   buf += "         mach.signals[signame].now = false;\n";
   buf += "      }\n";
   buf += "      emitted[signame] = this.output_signal_map[signame].value;\n";
   buf += "      if (this.debug_emitted_func) {\n"
   buf += "         if (emitted[signame] === undefined) {\n";
   buf += "            emittedDebug.push(signame);\n";
   buf += "         } else {\n";
   buf += "            emittedDebug.push(signame + '(' + JSON.stringify(emitted[signame]) + ')');\n";
   buf += "         }\n";
   buf += "      }\n";
   buf += "   }\n\n";

   // fillThisArg
   buf += "   const prepareThisArg = (arg, signame, sigid, now, pre) => {\n";
   buf += "      const sig = this.signalsById[sigid];\n";
   buf += "      const argf = arg[signame];\n";
   buf += "      argf.nowval = sig.value;\n";
   buf += "      argf.preval = sig.pre_value;\n";
   buf += "      argf.now = now;\n";
   buf += "      argf.pre = pre;\n";
   buf += "   }\n\n";
   
   // pre-allocate all the ActionNet arguments
   nets.filter(n => n instanceof net.ActionNet)
      .forEach(n => {
	 const arr = `new Array(${n.lvl + 1}).fill(undefined)\n      `;
	 const sigs = n.accessor_list
	    .map(a => `["${a.signame}"]: { signame: "${a.signal.name}", nowval: undefined, preval: undefined, now: undefined, pre: undefined }`)
	    .join(", ");
	 buf += `   const ${n.toJSArg()} = ${arr}.map(_ => { return { ${sigs} }; });\n`;
      });
   buf += "\n";

   // declare the net registers
   buf += ("   let " +
      nets.filter(n => n instanceof net.RegisterNet)
	 .map(n => `${n.toJSReg()} = ${n.nextValue}`)
	 .join(", ") + ";");
   buf += "\n\n";

   // object function (to be evaluated+linked), see linkJS
   buf += ("   const react = function(signals = {}) {\n\n");

   // declare gate registers of sweeped input signal gates
   for (let k in mach.input_signal_map) {
      const s = mach.input_signal_map[k];
      const g = s.gate_list[0];

      if (g.sweeped && !s.gate_list[0].sweeped) {
	 buf += `      const ${s.gate_list[0].toJSVar()} = ("${k}" in signals);\n`;
      }
   }

   // declare gate registers
   buf += ("      const " + nets.filter(isConstantNet).map(n => n.toJSDecl()).join(", ") + ";\n");
   buf += ("      let " + nets.filter(n => !isConstantNet(n)).map(n => n.toJSDecl()).join(", ") + ";\n\n");
   
   buf += "      for (let k in signals) this.setInputSignal(k, signals[k]);\n"
   buf += "      this.react_in_progress = false;\n\n";

   
   // reset execs
   buf += "      // reset execs\n";
   for (let i in mach.exec_status_list) {
      buf += `      if (this.exec_status_list[${i}].prev_active && !this.exec_status_list[${i}].suspended) {\n`;
      buf += `         if (!this.exec_status_list[${i}].kill) {\n`;
      buf += `            ${mach.exec_status_list[i].callback_wire.toJSVar()} = true;\n`;
      buf += "         }\n";
      buf += `         this.exec_status_list[${i}].prev_active = false;\n`;
      buf += "      }\n";
   }
   buf += "\n";

   // prepare the code generation
   nets.forEach(n => n.propagated = (n instanceof net.RegisterNet));

   // propagation
   while (nets.length > 0) {
      const l = nets.length;

      nets = nets.filter(n => {
	 let com = ` // ${n.id}`
	 if (!n instanceof net.ActionNet) {
	    com += `${n.debugName} ${n.constructor.name}`;
	 }
	 if (n.astNode?.loc?.filename
	    && n.astNode.loc.filename.indexOf("string://") !== 0) {
	    com += ` @ ${purify(basename(n.astNode.loc.filename))}:${n.astNode.loc.pos}\n`;
	 } else {
	    com += "\n";
	 }
	 
	 if (n.faninList.length === 0) {
	    n.propagated = true;
	    buf += ("      undefined;" + com);
	    return false;
	 } else if (n.faninList.every(f => f.net.propagated)) {
	    n.propagated = true;
	    buf += ("      " + n.toJS() + ";" + com);
	    return false;
	 } else {
	    return true;
	 }
      });

      if (nets.length === l) {
	 
	 if (DEBUG) {
	    console.log("native failed because of cycle.");
	    console.log("cycles:", nets.map(n => n.id).join(","));
	 }
	 
	 const err = new Error("error, cyclic net list "
	    + nets.map(n => n.id).join(","));
	 err.cyclic = true;
	 throw err;
      }
   }
   
   buf += "\n";

   // output listeners
   buf += "      const emitted = {};\n";
   buf += "      const emittedDebug = [];\n";
   buf += "      const allEmittedSignals = {};\n";
   for (let k in mach.output_signal_map) {
      const s = mach.output_signal_map[k];
      const g = s.gate_list[0];
      buf += `      if (${g.toJSVar()}) {\n`;
      buf += `         invokeListeners(this, "${s.name}", emitted, emittedDebug);\n`;
      buf += `         allEmittedSignals["${s.name}"]=${g.toJSVar()}\n`;
      buf += '      }\n';
   }
   for (let k in mach.input_signal_map) {
      const s = mach.input_signal_map[k];
      const g = s.gate_list[0];
      buf += `      if (${g.toJSVar()}) allEmittedSignals["${s.name}"]=${g.toJSVar()}\n`;
   }
   buf += "\n";
   buf += "      // debug\n";
   buf += "      if (this.allEmittedFunc) {\n";
   for (let k in mach.local_signal_list) {
      const s = mach.local_signal_list[k];
      buf += `         if (this.signalsById[${k}]?.emitted.find(x => x)) { allEmittedSignals["${s.name}"]=this.signalsById[${k}].value; }\n`;
   }
   buf += "         this.allEmittedFunc(allEmittedSignals);\n";
   buf += "      }\n";
   buf += "\n";
   buf += "      // resert signals\n";
   buf += "      this.reset_signals();\n";
   buf += "\n";
   buf += "      // trigger execs\n";
   buf += "      this.trigger_execs();\n";
   buf += "\n";
   buf += "      if (this.debug_emitted_func)\n";
   buf += "         this.debug_emitted_func(emittedDebug);\n";
   buf += "\n";
   buf += "      this.react_in_progress = false;\n";
   buf += "\n";
   buf += "      this.flushActions();\n";
   buf += "\n";
   buf += "      return emitted;\n";
   buf += ("   };\n");
   buf += ("   return react;\n");
   buf += ("}");

   if (DEBUG) {
      console.log('native succeeded (see "/tmp/native.mjs"), to re-execute:');
      console.log('');
      console.log(`NODE_OPTIONS="${process.env?.NODE_OPTIONS ?? "--enable-source-maps --no-warnings --loader @hop/hiphop/lib/hiphop-loader.mjs"}" HIPHOP_DEBUG_NATIVE_SOURCE="/tmp/native.mjs" ${process.argv.join(" ")}`);
      writeFileSync("/tmp/native.mjs", buf.toString());
      console.log('');
   }
	 
   return buf;
}
   
/*---------------------------------------------------------------------*/
/*    linkJS ...                                                       */
/*    -------------------------------------------------------------    */
/*    The first argument is a reactive machine. The second argument    */
/*    is the evaluated result of the compilation of that machine       */
/*    to JS. Typically obtained with "eval(mach.toJS())".              */
/*    -------------------------------------------------------------    */
/*    It is required to separate the compilation of the circuit from   */
/*    the compilation of the ActionNet thunks because the compiled     */
/*    circuit is "evaluated" (to get an executable JS code) in the     */
/*    environment of HipHop implementation, but the ActionNet thunks   */
/*    are defined in the application environment.                      */
/*---------------------------------------------------------------------*/
function linkJS(mach, objfun) {
   const A = {};
   
   if (DEBUG) {
      console.log("link native...");
   }
   
   mach.nets
      .filter(n => (n instanceof net.ActionNet))
      .forEach(n => A[`A${n.id}`] = n.func);

   return objfun.call(undefined, A);
}
