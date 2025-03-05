/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/lib/batch.js                  */
/*    -------------------------------------------------------------    */
/*    Author      :  Manuel Serrano                                    */
/*    Creation    :  Fri Dec 24 14:18:33 2021                          */
/*    Last change :  Wed Mar  5 14:04:42 2025 (serrano)                */
/*    Copyright   :  2021-25 Manuel Serrano                            */
/*    -------------------------------------------------------------    */
/*    Batch execution (for testing).                                   */
/*=====================================================================*/
"use strict";
"use hopscript";

/*---------------------------------------------------------------------*/
/*    es6 module                                                       */
/*---------------------------------------------------------------------*/
import * as machine from "./machine.js";
import * as fs from "fs";
import * as error from "./error.js";
import { dirname, basename, join } from "path";
export { batch };

/*---------------------------------------------------------------------*/
/*    parseValue ...                                                   */
/*---------------------------------------------------------------------*/
function parseValue(value) {
   //
   // Parse a host value to a JSON objet if it is a string which matches
   // to JSON syntax, a number if it is a string which matches with a
   // number, a boolean if it is a string which matches with a
   // boolean. Returns the raw value otherwise.
   //
   if (typeof(value) == "string" || value instanceof String) {
      try {
	 value = JSON.parse(value);
      } catch (e) {
	 if (value[0] == "{" && value[value.length - 1] == "}")
	    throw( "Failed to parse JSON" );
	 let raw_value = value.toLowerCase().trim();

	 if (raw_value == "true") {
	    value = true;
	 } else if (raw_value == "false") {
	    value = false;
	 } else {
	    let num = Number(raw_value);

	    if (!isNaN(num)) {
	       value = num;
	    }
	 }
      }
   }
   return value;
}

/*---------------------------------------------------------------------*/
/*    prompt ...                                                       */
/*---------------------------------------------------------------------*/
function prompt(mach) {
   mach.outbuf += mach.$$name + "> ";
}

/*---------------------------------------------------------------------*/
/*    configure ...                                                    */
/*---------------------------------------------------------------------*/
function configure(mach, cmd) {
   const signals = cmd.replace(/ *\([^)]*\) */g, " ").split(" ");

   for (let i in signals) {
      let sig = signals[i];
      if (sig.trim() == "")
	 break;

      let i_sig = cmd.indexOf(sig);
      let value;

      if (i_sig > -1) {
   	 let buffer = cmd.split(sig)[1];
   	 if (buffer[0] == "(") {
   	    let i_parleft = buffer.indexOf("(")
   	    let i_parright = buffer.indexOf(")");

   	    let raw = buffer.substr(i_parleft + 1, i_parright-1);
   	    value = parseValue(raw);
   	 }
   	 mach.input(sig, value);
      }
   }
}

/*---------------------------------------------------------------------*/
/*    batchError ...                                                   */
/*---------------------------------------------------------------------*/
function batchError(msg) {
   console.error("*** ERROR");
   console.error("***", msg);
}

/*---------------------------------------------------------------------*/
/*    batchReset ...                                                   */
/*---------------------------------------------------------------------*/
function batchReset(m) {
   if (m.sweep) {
      //
      // Reactive machine reset makes a fresh reactive machine without
      // recompiling the crcuit. Hence, register which has value
      // `true` because of constant propagation will become false,
      // which is an error.
      //
      // Since reactive machine reset is only used in batch, we just
      // forbid it if sweep optimization is on.
      //
      // TODO: enable batchReset even if sweep is on by recompiling
      // the internal circuit.
      //
      throw new error.MachineError("Can't reset machine: sweep is on.");
   }

   if (m.react_in_progress)
      throw new error.MachineError("Cant't reset machine: react in progress.");

   for (let i in m.nets) {
      m.nets[i].reset(true);
   }

   m.boot_reg.value = true;
   m.reset_signals(true);

   m.actions = [];
}

/*---------------------------------------------------------------------*/
/*    evalCommand ...                                                  */
/*---------------------------------------------------------------------*/
function evalCommand(mach, cmd) {
   prompt(mach);
   mach.outbuf += cmd + ";\n"

   if (cmd === "!debugger") {
      mach.debuggerOn("debug");
   } else if (cmd == "!pretty-print") {
      mach.outbuf += mach.pretty_print();
   } else if (cmd === "!reset") {
      batchReset(mach);
      mach._debuggerUpdate();
      mach.outbuf += ("--- Automaton " + mach.name + " reset");
   } else if (cmd[0] === "%") {
      ;
   } else if (cmd[0] === "!") {
      batchError("Ignored command: " + cmd);
   } else {
      try {
      	 configure(mach, cmd)
      	 mach.react();
      } catch (exn) {
	 if (exn?.notify) {
	    exn?.notify();
	 } else {
	    console.error(exn);
	 }
      }
   }
}

/*---------------------------------------------------------------------*/
/*    checkResult ...                                                  */
/*---------------------------------------------------------------------*/
function checkResult(test, mach, output) {
   if (output && fs.existsSync(output)) {
      const expected = fs.readFileSync(output).toString();

      return { expected, got: mach.outbuf };
   } else {
      return { expected: true, got: true };
   }
}

/*---------------------------------------------------------------------*/
/*    batch ...                                                        */
/*---------------------------------------------------------------------*/
function batch(mach, test = undefined, done = undefined) {
   let raw = "";
   let input, output;

   if (!(mach instanceof machine.ReactiveMachine)) {
      throw new TypeError("ReactiveMachine", typeof(mach), "batch interpreter");
   } else {
      mach.done = done;
   }

   if (typeof mach.outbuf !== "string") {
      mach.outbuf = "";
   }

   if (!mach.debug_emitted_func) {
      mach.debug_emitted_func = emitted => {
	 mach.outbuf += "--- Output:";
	 for (let i in emitted) {
	    mach.outbuf += " " + emitted[i];
	 }
	 mach.outbuf += "\n";
      };
   }

   if (test) {
      const dir = dirname(test);
      const name = basename(test).replace(/\..*$/, "");
      input = dir + "/" + name + ".in";
      output = dir + "/" + name + ".out";

      if (fs.existsSync(input)) {
	 raw = fs.readFileSync(input).toString().trim();
      }
   }

   let i;
   if (raw) {
      while (true) {
	 if (i = /^[ \t\r\n]*%[^\n]*\r?\n/.exec(raw)) {
	    raw = raw.slice(i[0].length);
	 } else {
      	    i = raw.indexOf(";");
 	    
	    if (i > -1)  {
	       let cmd = raw.substring(0, i).trim();
	       raw = raw.slice(i + 1);
	       evalCommand(mach, cmd);
	    }
	 }

	 if (raw.indexOf(".") > -1) {
	    mach.outbuf += "Bye.";
	    break;
	 }

	 if (raw.length === 0) {
	    break;
	 }
      }
   }

   try {
      if (mach.batchPromise) {
	 return mach.batchPromise.then(v => checkResult(test, mach, output));
      } else {
	 return new Promise((res, rej) => res(checkResult(test, mach, output)));
      }
   } catch(e) {
      const dir = dirname(test);
      const name = basename(test).replace(/\..*$/, "");
      const got = e.message;
      const efile = test + "/" + name + ".err";
      if (fs.existsSync(efile)) {
	 const expected = fs.readFileSync(efile).toString();
	 return { expected, got };
      } else {
	 if (output && fs.existsSync(output)) {
	    const expected = fs.readFileSync(output).toString();
	    return { expected, got };
	 } else {
	    return { expected: true, got };
	 }
      }
   }
}

