"use hopscript"

var xml_compiler = require("./xml-compiler.js");
var reactive = require("./reactive-kernel.js");
var hop = require("hop");
var fs = require("fs");

var eval_mode = false;
var input_to_parse = {};
var include_dependencies = [ ];
var batch_prg = "";
var parser_raw_eval_mode = "";

service debug() {
   var code = <div style="font-family:mono">${get_web_pretty_print()}</div>;
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
}

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
      var ast_visitor = new UnfoldAbstractTreeVisitor();
      batch_prg.accept(ast_visitor);
      console.log(ast_visitor.output);
   } else if (cmd == "!pretty-print") {
      var ast_visitor = new PrettyPrintVisitor("\x1b[31m",
					       "\x1b[0m",
					       " ",
					       "\n");
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
      update_web_debugger();
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
	 update_web_debugger();
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
   update_web_debugger();
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

function UnfoldAbstractTreeVisitor() {
   this.indent = "+-- ";
   this.INDENT_UNIT = "   ";
   this.output = "";
}

UnfoldAbstractTreeVisitor.prototype.visit = function(node) {
   var buf = this.indent + node.name;

   if (node["signal_name"] !== undefined)
      buf = buf + " " + node.signal_name;
   else if (node instanceof reactive.Trap)
      buf = buf + " " + node.trap_name;
   else if (node instanceof reactive.Exit)
      buf = buf + " " + node.trap_name + " " + node.return_code;

   this.output += buf + " " + node.loc + "\n";

   if (node instanceof reactive.Circuit) {
      var prev_indent = this.indent;

      this.indent = this.INDENT_UNIT + this.indent;
      if (node instanceof reactive.MultipleCircuit)
	 for (var i in node.go_in)
	    node.go_in[i].stmt_out.accept(this);
      else
	 node.go_in.stmt_out.accept(this);
      this.indent = prev_indent;
   }
}

function PrettyPrintVisitor(m_begin, m_end, space, eol) {
   this.indent = "+-- ";
   this.indent_lvl = 3;
   this.INDENT_UNIT = this.apply_indent(this.indent_lvl);
   this.output = "";
   this.marker_begin = m_begin;
   this.marker_end = m_end;
   this.space = space;
   this.eol = eol;
}

PrettyPrintVisitor.prototype.apply_indent = function(n) {
   var buf = "";

   for (var i = 0; i < n; i++)
      buf += this.space;
   return buf;
}

PrettyPrintVisitor.prototype.visit = function(node) {
   var buf = this.indent + node.name;

   if (node["signal_name"] !== undefined)
      buf = buf + " " + node.signal_name;
   else if (node instanceof reactive.Trap)
      buf = buf + " " + node.trap_name;
   else if (node instanceof reactive.Exit)
      buf = buf + " " + node.trap_name + " " + node.return_code;

   if (node instanceof reactive.Circuit) {
      if (node instanceof reactive.Halt
	  || node instanceof reactive.Await) {
	 buf += " " + node.loc
	 var is_pause_selected = new IsPauseSelectedVisitor();

	 node.go_in.stmt_out.accept(is_pause_selected);
	 if (is_pause_selected.selected) {
	    buf = this.marker_begin + buf + this.marker_end;
	 }
	 this.output += buf + this.eol;
      } else {
	 this.output += buf + " " + node.loc + this.eol;
	 var prev_indent = this.indent;

	 this.indent = this.apply_indent(this.indent_lvl) + this.indent;
	 if (node instanceof reactive.MultipleCircuit)
	    for (var i in node.go_in)
	       node.go_in[i].stmt_out.accept(this);
	 else
	    node.go_in.stmt_out.accept(this);
	 this.indent = prev_indent;
      }
   }
}

function IsPauseSelectedVisitor() {
   this.selected = false;
   this.stop = false;
}

IsPauseSelectedVisitor.prototype.visit = function(node) {
   if (this.stop)
      return;

   if (node instanceof reactive.Pause) {
      if (node.reg == true)
	 this.selected = true;
      this.stop = true;
   }

   if (node instanceof reactive.Circuit) {
      node.go_in.stmt_out.accept(this);
   } else if (node instanceof reactive.MultipleCircuit) {
      for (i in node.go_in)
	 node.go_in[i].stmt_out.accept(this);
   }
}

function update_web_debugger() {
   hop.broadcast("react", get_web_pretty_print());
}

function get_web_pretty_print() {
   var ast_visitor = new PrettyPrintVisitor("<span style='color:red'>",
					    "</span>",
					    "&nbsp;",
					    "<br/>");
   batch_prg.accept(ast_visitor);
   return ast_visitor.output;
}


exports.interpreter = interpreter;
