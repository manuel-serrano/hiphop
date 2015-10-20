"use hopscript"

function configure(prg, cmd) {
   if (cmd == "!reset") {
      prg.reset();
      return false;
   }

   if (cmd[0] == "%" || cmd[0] == "!")
      return false;

   var sig_name = cmd.split(" ");
   for (var i in sig_name)
      set_signal(prg.input_signals, sig_name[i]);
   return true;
}

function set_signal(sig_list, sig_name) {
   for (var i in sig_list)
      if (sig_list[i].name == sig_name)
	 sig_list[i].set_from_host(true, null);
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
	 if(configure(prg, cmd))
	    prg.react(prg.seq + 1);
      }
   });
}

exports.interpreter = interpreter;
