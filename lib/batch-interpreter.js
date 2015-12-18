"use hopscript"

var eval_mode = false;
var xml_compiler = require("./xml-compiler.js");
var reactive = require("./reactive-kernel.js");

function prompt() {
   if (process.stdout.isTTY)
      process.stdout.write("> ");
}

function configure(prg, cmd) {
   var sigs_name = cmd.split(" ");
   for (var i in sigs_name) {
      var expr = sigs_name[i];
      var value = undefined;
      var name = undefined;
      if (expr == undefined || expr.trim() == "") break;
      var i_parleft = expr.indexOf('(');
      var i_parright = expr.indexOf(')');

      if (i_parleft > -1 && i_parright > -1) {
	 name = expr.substr(0, i_parleft);
	 var raw = expr.substr(i_parleft + 1, expr.length - name.length - 2);
	 value = xml_compiler.parse_value(raw);
      } else {
	 name = expr
      }
      prg.setInput(name, value);
   }
}

function interpreter(prg) {
   var raw = "";

   prompt();
   process.stdin.on("data", function(buffer) {
      raw += buffer.toString("utf8", 0).trim() + " ";

      if (raw.indexOf(".") > -1) {
	 console.log("Bye.");
	 process.exit(0);
      }

      var i;
      while ((i = raw.indexOf(";")) > -1)  {
	 var cmd = raw.substring(0, i).trim();
	 raw = raw.slice(i + 1);

	 if (eval_mode) {
      	    if (cmd == "!eval-end")
      	       eval_mode = false;
      	    else
      	       eval(cmd)
      	 } else if (cmd == "!reset") {
	    prg.reset();
	 } else if (cmd == "!eval-begin") {
	    eval_mode = true;
	 } else if (cmd[0] == "%") {
	    ;
	 } else if (cmd[0] == "!") {
	    console.log("*** ERROR\n*** Ignored command:", cmd);
	 } else {
      	    try {
      	       configure(prg, cmd)
      	       prg.react();
      	    }  catch (e) {
      	       if (e instanceof EvalError) {
      		  console.log(e.message);
      	       } else {
      		  if (e instanceof Error)
      		     console.log(e.message);
      		  else
      		     console.log(e)
      		  process.exit(1);
      	       }
      	    }
      	 }
      }
      prompt();
   });
}

exports.interpreter = interpreter;
