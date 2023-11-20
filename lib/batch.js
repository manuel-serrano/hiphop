/*=====================================================================*/
/*    serrano/prgm/project/hiphop/1.3.x/lib/batch.js                   */
/*    -------------------------------------------------------------    */
/*    Author      :  Manuel Serrano                                    */
/*    Creation    :  Fri Dec 24 14:18:33 2021                          */
/*    Last change :  Mon Nov 20 17:30:28 2023 (serrano)                */
/*    Copyright   :  2021-23 Manuel Serrano                            */
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
       
const tty = process.stdout.isTTY && process.stdin.isTTY;

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

function prompt(mach) {
   process.stdout.write(mach.name + "> ");
}

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
   	    value = parse_value(raw);
   	 }
   	 mach.input(sig, value);
      }
   }
}

function batch_error(msg) {
   console.error("*** ERROR");
   console.error("***", msg);
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


/*---------------------------------------------------------------------*/
/*    evalCommand ...                                                  */
/*---------------------------------------------------------------------*/
function evalCommand(mach, cmd, outbuf, interactive) {
   if (interactive) {
      prompt(mach);
      console.log(cmd + ";")
   }

   if (cmd == "!debugger") {
      mach.debuggerOn("debug");
   } else if (cmd == "!pretty-print") {
      outbuf += mach.pretty_print();
   } else if (cmd == "!reset") {
      batch_reset(mach);
      mach._debuggerUpdate();
      outbuf += ("--- Automaton " + mach.name + " reset");
   } else if (cmd[0] == "%") {
      ;
   } else if (cmd[0] == "!") {
      batch_error("Ignored command: " + cmd);
   } else {
      try {
      	 configure(mach, cmd)
      	 mach.react();
      } catch (exn) {
	 if( exn ) {
	    exn.notify();
	 }
      }
   }
}

/*---------------------------------------------------------------------*/
/*    batch ...                                                        */
/*---------------------------------------------------------------------*/
function batch(mach, test = undefined) {
   let raw = "";
   let fd = undefined;
   let outbuf = "";
   let input, output;

   if (!(mach instanceof machine.ReactiveMachine)) {
      throw new TypeError("ReactiveMachine", typeof(mach), "batch interpreter");
   }

   mach.debug_emitted_func = emitted => {
      outbuf += "--- Output:";
      for (let i in emitted) {
	 outbuf += " " + emitted[i];
      }
   };
   
   if (tty && !test) {
      prompt(mach);
   }

   if (test) {
      const name = test.replace(/\..*$/, "");
      input = name + ".in";
      output = name + ".out";

      if (fs.existsSync(input)) {
	 fd = fs.createReadStream(null, {fd: fs.openSync(input, "r")});
      } else {
	 // no input given, assumes that the machine as already reacted
	 outbuf = mach.outbuf;
      }
   } else {
      fd = process.stdin;
   }

   if (fd) {
      fd.on("data", function(buffer) {
	 raw += buffer.toString("utf8", 0).trim() + " ";

	 let i;
	 while (true) {
	    if (i = ( /^[ \t\r\n]*%[^\n]*\r?\n/ ).exec(raw)) {
	       raw = raw.slice(i[0].length);
	    } else {
      	       i = raw.indexOf(";");
 	       
	       if (i > -1)  {
		  let cmd = raw.substring(0, i).trim();
		  raw = raw.slice(i + 1);
		  evalCommand(mach, cmd, outbuf, tty && !test);
	       } else {
		  break;
	       }
	    }
	 }

	 if (raw.indexOf(".") > -1) {
	    outbuf += "Bye.";

	    if (fd !== process.stdin) {
	       fd.destroy();
	    } else {
	       console.log(outbuf);
	    }

	    if (test) {
	       const expected = fs.readFileSync(output).toString();

	       if (expected === outbuf) {
		  return false;
	       } else {
		  return "expecting [" + expected + "]\n" +
		         "      got [" + outbuf + "]";
	       }
	    } else {
	       return false;
	    }
	 }

	 if (tty && !test) {
      	    prompt(mach);
	 }
      });
   } else {
      const expected = fs.readFileSync(output).toString();

      if (expected === outbuf) {
	 return false;
      } else {
	 return "expecting [" + expected + "]\n" +
	    "      got [" + outbuf + "]";
      }
   }
}

