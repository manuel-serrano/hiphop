"use hopscript"

var eval_mode = false;
var xml_compiler = require("./xml-compiler.js");
var reactive = require("./reactive-kernel.js");

function prompt() {
   if (process.stdout.isTTY)
      process.stdout.write("> ");
}

function configure(prg, cmd) {
   if (cmd == "!reset") {
      prg.reset();
      return false;
   } else if (cmd == "!eval-begin") {
      eval_mode = true;
      return false;
   }

   if (cmd[0] == "%" || cmd[0] == "!")
      return false;

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
   return true;
}

function interpreter(prg) {
   prompt();
   process.stdin.on("data", function(buffer) {
      var raw = buffer.toString("utf8", 0);
      var i_sc = -1;
      var cmd = "";

      while((i_sc = raw.indexOf(";")) > -1) {
	 cmd = raw.substr(0, i_sc );
	 if (cmd[0] == "\n")
	    cmd = cmd.substr(1, cmd.length);
	 raw = raw.substr(i_sc + 1, raw.length);
	 if (eval_mode) {
	    if (cmd == "!eval-end")
	       eval_mode = false;
	    else
	       eval(cmd)
	 } else {
	    if(configure(prg, cmd))
	       prg.react();
	 }
      }
      prompt();
   });
}

exports.interpreter = interpreter;
