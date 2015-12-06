"use strict"

var reactive = require("./reactive-kernel.js");

var INDENT_LEVEL = 4;

function apply_indent(indent) {
   var buf = "";

   for (var i = 0; i < indent; i++)
      buf += " ";

   return buf;
}

function print_valued_signal(signal) {
   if (!(signal instanceof reactive.ValuedSignal))
      return "";

   var buf = "";
   var type = signal.type;

   if (type == "number") {
      if (signal.has_init_value)
	 signal.init_value % 1 === 0 ? type = "integer" : type = "float";
      else
	 /* could be wrong, but it will remains correct at syntaxic level */
	 type = "integer";
   }

   if (signal.has_init_value)
      buf += " := " + signal.init_value;

   if (signal.single)
      buf += " : " + type;

   else
      buf += " : combine " + type + " with " + signal.combine_with;
   return buf;
}

function print_test_pre(stmt) {
   var buf = stmt.signal_name;

   if (stmt.test_pre)
      buf = "pre(" + buf + ")";
   return buf;
}

String.prototype.replace_char = function(index, chr) {
   return this.substr(0, index) + chr + this.substr(index + 1);
}

reactive.Statement.prototype.esterel_code = function(indent) {
   return apply_indent(indent) + this.name + " NYI";
}

reactive.ReactiveMachine.prototype.esterel_code = function(indent) {
   var buf = "module " + this.machine_name + ":\n";
   var len;
   var count;

   len = Object.keys(this.input_signals).length;
   if (len > 0) {
      buf += "input ";
      count = 0;
      for (var i in this.input_signals) {
	 var sig = this.input_signals[i];

	 count++;
	 buf += sig.name + print_valued_signal(sig);
	 buf += count == len ? ";\n" : ", ";
      }
   }

   len = Object.keys(this.output_signals).length;
   if (len > 0) {
      buf += "output ";
      count = 0;
      for (var i in this.output_signals) {
	 var sig = this.output_signals[i];

	 count++;
	 buf += sig.name + print_valued_signal(sig);
	 buf += count == len ? ";\n" : ", ";
      }
   }

   buf += this.go_in.stmt_out.esterel_code(0);
   buf += "\nend module";

   return buf;
}

reactive.Emit.prototype.esterel_code = function(indent) {
   var buf = apply_indent(indent) + "emit " + this.signal_name;

   if (this.expr instanceof reactive.Expression)
      buf += "(" + this.expr.esterel_code() + ")";
   return buf;
}

reactive.Pause.prototype.esterel_code = function(indent) {
   return apply_indent(indent) + "pause";
}

reactive.Present.prototype.esterel_code = function(indent) {
   var buf = "";

   buf += apply_indent(indent) + "present " + print_test_pre(this) + " then\n";
   buf += this.go_in[0].stmt_out.esterel_code(indent + INDENT_LEVEL);

   if (!(this.go_in[1].stmt_out instanceof reactive.Nothing)) {
      buf += "\n" + apply_indent(indent) + "else\n";
      buf += this.go_in[1].stmt_out.esterel_code(indent + INDENT_LEVEL);
   }
   buf += "\n" + apply_indent(indent) + "end present";

   return buf;
}

reactive.Sequence.prototype.esterel_code = function(indent) {
   var buf = "";
   var stmt_buf = "";
   var stmt_is_par = false;
   var stmt_indent;
   var max = this.go_in.length;

   for (var i = 0; i < max; i++) {
      stmt_indent = indent;
      stmt_buf = "";

      if (this.go_in[i].stmt_out instanceof reactive.Parallel) {
	 stmt_is_par = true;
	 stmt_indent += 2;
      }

      stmt_buf += this.go_in[i].stmt_out.esterel_code(stmt_indent);

      if (stmt_is_par) {
	 stmt_is_par = false;
	 stmt_buf = stmt_buf.replace_char(indent, "[");
	 stmt_buf += " ]";
      }

      if (i + 1 < max)
	 stmt_buf += ";\n";

      buf += stmt_buf;
   }

   return buf;
}

reactive.Loop.prototype.esterel_code = function(indent) {
   var buf = "";

   buf += apply_indent(indent) + "loop\n";
   buf += this.go_in.stmt_out.esterel_code(indent + INDENT_LEVEL);
   buf += "\n" + apply_indent(indent) + "end loop";

   return buf;
}

reactive.Abort.prototype.esterel_code = function(indent) {
   var buf = "";

   buf += apply_indent(indent) + "abort\n";
   buf += this.go_in.stmt_out.esterel_code(indent + INDENT_LEVEL);
   buf += "\n" + apply_indent(indent) + "when " + print_test_pre(this);

   return buf;
}

reactive.Suspend.prototype.esterel_code = function(indent) {
   var buf = "";

   buf += apply_indent(indent) + "suspend\n";
   buf += this.go_in.stmt_out.esterel_code(indent + INDENT_LEVEL);
   buf += "\n" + apply_indent(indent) + "when " + print_test_pre(this);

   return buf;
}

reactive.Await.prototype.esterel_code = function(indent) {
   return apply_indent(indent) + "await " + print_test_pre(this);
}

reactive.Halt.prototype.esterel_code = function(indent) {
   return apply_indent(indent) + "halt";
}

reactive.Parallel.prototype.esterel_code = function(indent) {
   var buf = "";
   var branch_buf = "";
   var branch_indent = indent + INDENT_LEVEL;
   var branch_seq = false;

   if (this.go_in[0].stmt_out instanceof reactive.Sequence) {
      branch_indent += 2;
      branch_seq = true;
   }

   branch_buf = this.go_in[0].stmt_out.esterel_code(branch_indent);
   if (branch_seq) {
      branch_buf = branch_buf.replace_char(indent + INDENT_LEVEL, "[");
      branch_buf += " ]";
      branch_indent = indent + INDENT_LEVEL;
      branch_seq = false;
   }
   buf += branch_buf;
   branch_buf = "";
   buf += "\n" + apply_indent(indent) + "||\n";

   if (this.go_in[1].stmt_out instanceof reactive.Sequence) {
      branch_indent += 2;
      branch_seq = true;
   }

   branch_buf += this.go_in[1].stmt_out.esterel_code(branch_indent);
   if (branch_seq) {
      branch_buf = branch_buf.replace_char(indent + INDENT_LEVEL, "[");
      branch_buf += " ]";
      branch_indent = indent + INDENT_LEVEL;
      branch_seq = false;
   }

   buf += branch_buf;

   return buf;
}

reactive.Nothing.prototype.esterel_code = function(indent) {
   return apply_indent(indent) + "nothing";
}

reactive.Atom.prototype.esterel_code = function(indent) {
   return apply_indent(indent) + "atom";
}

reactive.Exit.prototype.esterel_code = function(indent) {
   return apply_indent(indent) + "exit " + this.trap_name;
}

reactive.Trap.prototype.esterel_code = function(indent) {
   var buf = "";

   buf += apply_indent(indent) + "trap " + this.trap_name + " in\n";
   buf += this.go_in.stmt_out.esterel_code(indent + INDENT_LEVEL);
   buf += "\n" + apply_indent(indent) + "end trap";

   return buf;
}

reactive.LocalSignalIdentifier.prototype.esterel_code = function(indent) {
   var buf = "";

   buf += apply_indent(indent) + "signal "
      + this.signal_name
      + print_valued_signal(this.machine.get_signal(this.signal_name))
      + " in\n";
   buf += this.go_in.stmt_out.esterel_code(indent + INDENT_LEVEL);
   buf += "\n" + apply_indent(indent) + "end signal";

   return buf;
}
