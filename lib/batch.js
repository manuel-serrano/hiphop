"use strict"
"use hopscript"

const lang = require("./lang.js");
const machine = require("./machine.js");
const fs = require("fs");
const error = require("./error.js");

var eval_mode = false;
var input_to_parse = {};
var include_dependencies = [ ];
var hiphop_machine = "";
var parser_raw_eval_mode = "";
var web_debugger;
var interactive = process.stdout.isTTY && process.stdin.isTTY;

function prompt() {
   process.stdout.write(hiphop_machine.name + "> ");
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

   	 hiphop_machine.setInput(sig, value);
      }
   }
}

function eval_command(cmd) {
   if (!interactive
       && !eval_mode && cmd != "!eval-begin" && cmd != "!eval-end") {
      prompt();
      console.log(cmd + ";")
   }

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
      hiphop_machine.accept(ast_visitor);
      console.log(ast_visitor.output);
   } else if (cmd == "!pretty-print") {
      if (process.argv.indexOf("-g") == -1) {
	 batch_error("Start hop with `-g` option to use pretty-print")
      } else {
	 var ast_visitor = new PrettyPrintVisitor("\x1b[31m",
						  "\x1b[0m",
						  " ",
						  "\n");
	 hiphop_machine.accept(ast_visitor);
	 console.log(ast_visitor.output);
      }
   } else if (cmd.indexOf("!parse-input") > -1) {
      cmd = cmd.split(" ");
      if (cmd[1] != "" && cmd[2] != "") {
	 input_to_parse[cmd[1]] = cmd[2];
      } else {
	 batch_error("Invalid arguments to !parse-input");
      }
   } else if (cmd == "!reset") {
      hiphop_machine.reset();
      console.log("--- Automaton", hiphop_machine.name, "reset");
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
	 var buf_out = "--- Output:";
	 var emitted;

      	 configure(cmd)
      	 emitted = hiphop_machine.react();
	 update_web_debugger();

	 for (var i in emitted)
	    buf_out += " " + emitted[i]
	 console.log(buf_out);
      }  catch (e) {
      	 console.log(e.message);

      	 if (e instanceof error.InternalError || e instanceof error.SyntaxError)
      	    process.exit(1);
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

function batch(prg) {
   var raw = "";

   if (!(prg instanceof machine.ReactiveMachine))
      throw new error.TypeError("ReactiveMachine", typeof(prg), "batch");

   hiphop_machine = prg;

   if (process.argv.indexOf("--no-server") == -1) {
      if (process.argv.indexOf("-g") == -1) {
	 web_debugger = new Service(function() {
	    return <html>Start hop with `-g` option to use this debugger</html>
	 }, "debug");
      } else {
	 web_debugger = new Service(function () {
	    var code = <div style="font-family:mono">
${get_web_pretty_print()}
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

      if (!eval_mode && raw.indexOf(".") > -1) {
	 console.log("Bye.");
	 process.exit(0);
      }

      if (interactive && !eval_mode)
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
   this.parent_loc = "";
}

PrettyPrintVisitor.prototype.apply_indent = function(n) {
   var buf = "";

   for (var i = 0; i < n; i++)
      buf += this.space;
   return buf;
}

PrettyPrintVisitor.prototype.set_output = function(node, buf) {
   if (this.parent_loc != node.loc)
      this.output += buf + " " + node.loc + this.eol;
}

PrettyPrintVisitor.prototype.visit = function(node) {
   var buf = this.indent + node.name;

   if (node["signal_name"] !== undefined)
      buf = buf + " " + node.signal_name;
   else if (node instanceof reactive.Trap)
      buf = buf + " " + node.trap_name;
   else if (node instanceof reactive.Exit)
      buf = buf + " " + node.trap_name + " " + node.return_code;
   else if (node instanceof reactive.Pause && node.reg)
      buf = this.marker_begin + buf + this.marker_end;


   if (node instanceof reactive.MultipleCircuit) {
      var prev_indent = this.indent;
      var self_parent_loc = this.parent_loc;
      var is_pause_selected = new IsPauseSelectedVisitor(node.loc);

      for (var i in node.go_in)
	 node.go_in[i].stmt_out.accept(is_pause_selected);
      if (is_pause_selected.selected)
	 buf = this.marker_begin + buf + this.marker_end;

      this.set_output(node, buf);
      this.parent_loc = node.loc;
      this.indent = this.apply_indent(this.indent_lvl) + this.indent;
      for (var i in node.go_in)
	 node.go_in[i].stmt_out.accept(this);
      this.parent_loc = self_parent_loc;
      this.indent = prev_indent;
   } else if (node instanceof reactive.Circuit) {
      var prev_indent = this.indent;
      var self_parent_loc = this.parent_loc;
      var is_pause_selected = new IsPauseSelectedVisitor(node.loc);

      node.go_in.stmt_out.accept(is_pause_selected);
      if (is_pause_selected.selected)
	 buf = this.marker_begin + buf + this.marker_end;

      this.set_output(node, buf);
      this.parent_loc = node.loc;
      node.go_in.stmt_out.accept(this);
      this.parent_loc = self_parent_loc;
      this.indent = prev_indent;
   } else {
      this.set_output(node, buf);
   }
}

function IsPauseSelectedVisitor(loc) {
   this.selected = false;
   this.stop = false;
   this.parent_loc = loc;
}

IsPauseSelectedVisitor.prototype.visit = function(node) {
   if (node.loc != this.parent_loc)
      return;
   if (this.stop)
      return;

   if (node instanceof reactive.Pause) {
      if (node.reg == true)
	 this.selected = true;
      this.stop = true;
   }

   if (node instanceof reactive.MultipleCircuit) {
      for (var i in node.go_in)
	 node.go_in[i].stmt_out.accept(this);
   } else if (node instanceof reactive.Circuit) {
      node.go_in.stmt_out.accept(this);
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
   //hiphop_machine.accept(ast_visitor);
   return ast_visitor.output;
}

exports.batch = batch;
