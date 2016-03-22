"use strict"
"use hopscript"

const lang = require("./lang.js");
const machine = require("./machine.js");
const fs = require("fs");
const error = require("./error.js");

var hh_machine = "";
var web_debugger = null;
const interactive = process.stdout.isTTY && process.stdin.isTTY;

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
   	    value = lang.parse_value(raw);
   	 }
   	 hh_machine.setInput(sig, value);
      }
   }
}

function eval_command(cmd) {
   if (!interactive) {
      prompt();
      console.log(cmd + ";")
   }

   if (cmd == "!pretty-print") {
      console.log(hh_machine.ast.pretty_print(0));
   } else if (cmd == "!reset") {
      hh_machine.reset();
      console.log("--- Automaton", hh_machine.name, "reset");
      update_web_debugger();
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
	 update_web_debugger();

	 for (var i in emitted)
	    buf_out += " " + emitted[i]
	 console.log(buf_out);
      }  catch (e) {
	 if (e) /* hack to avoid noise in test console -- fix it */
      	    console.log(e.message);
      }
   }
}

exports.batch = function(m) {
   let raw = "";

   if (!(m instanceof machine.ReactiveMachine))
      throw new error.TypeError("ReactiveMachine", typeof(m),
				"batch interpreter");

   hh_machine = m;
   init_web_debugger();
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


function init_web_debugger() {
   if (process.argv.indexOf("--no-server") == -1) {
      if (process.argv.indexOf("-g") == -1) {
	 web_debugger = new Service(function() {
	    return <html>Start hop with `-g` option to use this debugger</html>
	 }, "debug");
      } else {
	 web_debugger = new Service(function () {
	    var code =
		<div style="font-family:mono">
${pretty_print_web_debugger()}
		</div>;
	    return <html>
   	      <head>
   	     ~{
   		server.addEventListener("react", function(event) {
   		   ${code}.innerHTML = event.value;
   		});
   	     }
   	      </head>
   ${code}
	    </html>;
	 }, "debug");
      }
   }
}

function update_web_debugger() {
   hop.broadcast("react", pretty_print_web_debugger());
}

function pretty_print_web_debugger() {
   function format_web_debugger(indent, instruction, depth, sel) {
      let buf = "[" + depth + "] ";

      for (let i = 0; i < indent; i++)
	 buf += "&nbsp;";

      if (sel)
	 buf += "<span style='color:red;'>" + instruction + "</span>";
      else
	 buf += instruction;
      buf += "<br/>";

      return buf;
   }

   return hh_machine.ast.pretty_print(format_web_debugger);
}
