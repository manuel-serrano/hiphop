/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/lib/batch.js                  */
/*    -------------------------------------------------------------    */
/*    Author      :  Manuel Serrano                                    */
/*    Creation    :  Fri Dec 24 14:18:33 2021                          */
/*    Last change :                                                    */
/*    Copyright   :  2021-22 Manuel Serrano                            */
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
export { batch };
       
let hh_machine = null;
const interactive = process.stdout.isTTY && process.stdin.isTTY;

//
// Parse a host value to a JSON objet if it is a string which matches
// to JSON syntax, a number if it is a string which matches with a
// number, a boolean if it is a string which matches with a
// boolean. Returns the raw value otherwise.
//
function parse_value(value) {
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

function prompt() {
   process.stdout.write(hh_machine.name + "> ");
}

function configure(cmd) {
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
   	    value = parse_value(raw);
   	 }
   	 hh_machine.input(sig, value);
      }
   }
}

function eval_command(cmd) {
   if (!interactive) {
      prompt();
      console.log(cmd + ";")
   }

   if (cmd == "!debugger") {
      hh_machine.debuggerOn("debug");
   } else if (cmd == "!pretty-print") {
      console.log(hh_machine.pretty_print());
   } else if (cmd == "!reset") {
      batch_reset(hh_machine);
      hh_machine._debuggerUpdate();
      console.log("--- Automaton", hh_machine.name, "reset");
   } else if (cmd[0] == "%") {
      ;
   } else if (cmd[0] == "!") {
      batch_error("Ignored command: " + cmd);
   } else {
      try {
      	 configure(cmd)
      	 hh_machine.react();
      } catch (exn) {
	 if( exn ) {
	    exn.notify();
	 }
      }
   }
}

function print_emitted_signal(emitted) {
   let buf_out = "--- Output:";
   for (let i in emitted)
      buf_out += " " + emitted[i]
   console.log(buf_out);
}

function batch(m) {
   let raw = "";

   if (!(m instanceof machine.ReactiveMachine))
      throw new TypeError("ReactiveMachine", typeof(m), "batch interpreter");

   hh_machine = m;
   hh_machine.debug_emitted_func = print_emitted_signal;
   if (interactive)
      prompt();

   process.stdin.on("data", function(buffer) {
      raw += buffer.toString("utf8", 0).trim() + " ";

      let i;
      while( true ) {
	 if( i = ( /^[ \t\r\n]*%[^\n]*\r?\n/ ).exec( raw ) ) {
	    raw = raw.slice( i[ 0 ].length );
	 } else {
      	    i = raw.indexOf( ";" );
 	    
	    if( i > -1 )  {
	       let cmd = raw.substring( 0, i ).trim();
	       raw = raw.slice( i + 1 );
	       eval_command(cmd);
	    } else {
	       break;
	    }
	 }
      }

      if (raw.indexOf(".") > -1) {
	 console.log("Bye.");
	 process.exit(0);
      }

     if (interactive)
      	 prompt();
   });
}

function batch_reset(m) {
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
      // TODO: enable batch_reset even if sweep is on by recompiling
      // the internal circuit.
      //
      throw new error.MachineError("Can't reset machine: sweep is on.");
   }

   if (m.react_in_progress)
      throw new error.MachineError("Cant't reset machine: react in progress.");

   for (let i in m.nets)
	  m.nets[i].reset(true);

   m.boot_reg.value = true;
   m.reset_signals(true);

   m.actions = [];
}


function batch_error(msg) {
   console.error("*** ERROR");
   console.error("***", msg);
}
