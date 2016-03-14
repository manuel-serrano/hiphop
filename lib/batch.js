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

   for (var i in signals) {
      var sig = signals[i];
      if (sig.trim() == "")
	 break;

      var i_sig = cmd.indexOf(sig);
      var value;

      if (i_sig > -1) {
   	 var buffer = cmd.split(sig)[1];
   	 if (buffer[0] == "(") {
   	    var i_parleft = buffer.indexOf("(")
   	    var i_parright = buffer.indexOf(")");

   	    var raw = buffer.substr(i_parleft + 1, i_parright-1);
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
      console.log(hh_machine.ast_node.pretty_print(0));
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
      	 console.log(e.message);
      }
   }
}

exports.batch = function(m) {
   var raw = "";

   if (!(m instanceof machine.ReactiveMachine))
      throw new error.TypeError("ReactiveMachine", typeof(m),
				"batch interpreter");

   hh_machine = m;
   init_web_debugger();
   if (interactive)
      prompt();
   process.stdin.on("data", function(buffer) {
      raw += buffer.toString("utf8", 0).trim() + " ";

      var i;
      while ((i = raw.indexOf(";")) > -1)  {
	 var cmd = raw.substring(0, i).trim();
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
${get_web_pretty_print()}
		</div>;
	    return
	    <html>
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
   hop.broadcast("react", web_pretty_print());
}

function pretty_print_web_debugger() {
   return "NYI";
}
