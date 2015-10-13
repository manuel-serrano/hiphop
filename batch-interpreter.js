"use strict"

function configure(prg, cmd) {
   if (cmd == "!reset") {
      prg.reset();
      return;
   }

   if (cmd[0] == "%" || cmd[0] == "!")
      return;

   var sig_name = cmd.split(" ");
   for (var i in sig_name)
      set_signal(prg.signals, sig_name[i]);
}

function set_signal(sig_list, sig_name) {
   for (var i in sig_list)
      if (sig_list[i].name == sig_name)
	 sig_list[i].set_from_host(true, null);
}

function interpreter(prg) {
   /* For esterel batch compatibility */
   process.stdout.write("\x1B[3;J\x1b[H\x1B[2J");

   process.stdin.on("data", function(buffer) {
      var raw = buffer.toString("utf8", 0);
      var i_sc = -1;
      var cmd = "";

      while((i_sc = raw.indexOf(";")) > -1) {
	 cmd = raw.substr(0, i_sc );
	 if (cmd[0] == "\n")
	    cmd = cmd.substr(1, cmd.length);
	 raw = raw.substr(i_sc + 1, raw.length);
	 configure(prg, cmd);
	 prg.react();
      }
   });
}

exports.interpreter = interpreter;
