"use strict"
"use hopscript"

const machine = require("./machine.js");
const fs = require("fs");
const error = require("./error.js");

var hh_machine = "";
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
	    reactive.catchable_error("Failed to parse JSON", undefined);
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
   var signals = cmd.replace(/ *\([^)]*\) */g, " ").split(" ");

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
      hh_machine.reset();
      console.log("--- Automaton", hh_machine.name, "reset");
   } else if (cmd[0] == "%") {
      ;
   } else if (cmd[0] == "!") {
      batch_error("Ignored command: " + cmd);
   } else {
      try {
	 let buf_out = "--- Output:";
	 let emitted;

      	 configure(cmd)
      	 emitted = hh_machine.react();

	 for (var i in emitted)
	    buf_out += " " + emitted[i]
	 console.log(buf_out);
      }  catch (e) {
	 if (e) {
	    //
	    // Hack to avoid noise in test console
	    //
      	    console.log(e.message);
	 }
      }
   }
}

exports.batch = function(m) {
   let raw = "";

   if (!(m instanceof machine.ReactiveMachine))
      throw new error.TypeError("ReactiveMachine", typeof(m),
				"batch interpreter");

   hh_machine = m;
   if (interactive)
      prompt();

   process.stdin.on("data", function(buffer) {
      raw += buffer.toString("utf8", 0).trim() + " ";

      let i;
      while ((i = raw.indexOf(";")) > -1)  {
	 let cmd = raw.substring(0, i).trim();
	 raw = raw.slice(i + 1);
	 eval_command(cmd);
      }

      if (raw.indexOf(".") > -1) {
	 console.log("Bye.");
	 process.exit(0);
      }

     if (interactive)
      	 prompt();
   });
}

function batch_error(msg) {
   console.error("*** ERROR");
   console.error("***", msg);
}
