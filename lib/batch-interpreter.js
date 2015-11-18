"use hopscript"

var eval_mode = false;

var xml_compiler = require("./xml-compiler.js");
var reactive = require("./reactive-kernel.js");

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
      var value = undefined;
      var name = sigs_name[i];
      var i_parleft = name.indexOf('(');
      var i_parright = name.indexOf(')');

      if (i_parleft > -1 && i_parright > -1) {
	 var value = xml_compiler.parse_value(name.substr(i_parleft + 1,
							  i_parright - 3));
	 name = name.substr(0, i_parleft);
      }
      set_signal(prg.input_signals, name, value);
   }
   return true;
}

function set_signal(sig_list, sig_name, sig_value) {
   for (var i in sig_list)
      if (sig_list[i].name == sig_name) {
	 if (sig_value != undefined
	     && sig_list[i] instanceof reactive.ValuedSignal)
	    sig_list[i].set_value(sig_value);
	 sig_list[i].set = true;
      }
}

function interpreter(prg) {
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
	       prg.react(prg.seq + 1);
	 }
      }
   });
}

exports.interpreter = interpreter;
