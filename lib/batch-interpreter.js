"use hopscript"

var eval_mode = false;
var xml_compiler = require("./xml-compiler.js");
var reactive = require("./reactive-kernel.js");
var fs = require("fs");
var input_to_parse = {};
var include_dependencies = [ ];
var batch_prg = "";
var parser_raw_eval_mode = "";


function prompt() {
   if (process.stdout.isTTY)
      process.stdout.write("> ");
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
   	    value = xml_compiler.parse_value(raw);
   	 }

   	 batch_prg.setInput(sig, value);
      }
   }
}

function eval_command(cmd) {
   if (eval_mode) {
      if (cmd == "!eval-end" || cmd.indexOf("!eval-end") > -1) {
      	 eval_mode = false;
	 parser_raw_eval_mode += cmd;
	 eval(parser_raw_eval_mode.split("!eval-end")[0]);
      } else {
      	 parser_raw_eval_mode += cmd + ";";
      }
   } else if (cmd == "!print-unfold-ast") {
      var ast_visitor = new reactive.UnfoldAbstractTreeVisitor();
      batch_prg.accept(ast_visitor);
      console.log(ast_visitor.output);
   } else if (cmd.indexOf("!parse-input") > -1) {
      cmd = cmd.split(" ");
      if (cmd[1] != "" && cmd[2] != "") {
	 input_to_parse[cmd[1]] = cmd[2];
      } else {
	 batch_error("Invalid arguments to !parse-input");
      }
   } else if (cmd.indexOf("!include") > -1) {
      cmd = cmd.split(" ");
      if (cmd[1] != "") {
	 var data;

	 try {
	    data = fs.readFileSync(cmd[1], 'utf8');
	 } catch (e) {
	    batch_error("Unable to read file " + cmd[1]);
	 }
	 if (include_dependencies.indexOf(cmd[1]) > -1) {
	    batch_error("Can't have cycles in include dependencies");
	 } else {
	    include_dependencies.push(cmd[1]);
	    include_interpreter(data);
	 }
      } else {
	 batch_error("Missing file to !include");
      }
   } else if (cmd == "!reset") {
      batch_prg.reset();
   } else if (cmd == "!eval-begin") {
      eval_mode = true;
      parser_raw_eval_mode = "";
   } else if (cmd[0] == "%") {
      ;
   } else if (cmd[0] == "!") {
      batch_error("Ignored command: " + cmd);
   } else {
      try {
      	 configure(cmd)
      	 batch_prg.react();
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

function include_interpreter(buffer) {
   var i;

   while ((i = buffer.indexOf(";")) > -1)  {
	 var cmd = buffer.substring(0, i).trim();
	 buffer = buffer.slice(i + 1);
	 eval_command(cmd);
      }
}

function interpreter(prg) {
   var raw = "";

   batch_prg = prg;
   prompt();
   process.stdin.on("data", function(buffer) {
      raw += buffer.toString("utf8", 0).trim() + " ";

      var i;
      while ((i = raw.indexOf(";")) > -1)  {
	 var cmd = raw.substring(0, i).trim();
	 raw = raw.slice(i + 1);
	 eval_command(cmd);
      }

      if (!eval_mode && raw.indexOf(".") > -1) {
	 console.log("Bye.");
	 process.exit(0);
      }

      prompt();
   });
}

function batch_error(msg) {
   console.error("*** ERROR");
   console.error("***", msg);
}

exports.interpreter = interpreter;
