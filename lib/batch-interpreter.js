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
   var sigs_name = cmd.split(/\s+/g);

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

      if (input_to_parse[name] != undefined) {
	 if (value[0] != '"' && value[0] != "'" && typeof(value) == "string")
	    value = '"' + value + '"';
	 value = eval(input_to_parse[name] + "(" + value + ")");
      }
      batch_prg.setInput(name, value);
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
