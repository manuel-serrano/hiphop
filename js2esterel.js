"use strict"

var reactive = require("./reactive-kernel.js");

var INDENT_LEVEL = 4;

function apply_indent(indent) {
   var buf = "";

   for (var i = 0; i < indent; i++)
      buf += " ";

   return buf;
}

String.prototype.replace_char = function(index, chr) {
   return this.substr(0, index) + chr + this.substr(index + 1);
}

reactive._Statement.prototype.esterel_code = function(indent) {
   return apply_indent(indent) + this.name + " NYI";
}

reactive.ReactiveMachine.prototype.esterel_code = function(indent) {
   return this.go_in.stmt_out.esterel_code(0);
}

reactive.Emit.prototype.esterel_code = function(indent) {
   return apply_indent(indent) + "emit " + this.signal.name;
}

reactive.Pause.prototype.esterel_code = function(indent) {
   return apply_indent(indent) + "pause";
}

reactive.Present.prototype.esterel_code = function(indent) {
   var buf = "";

   buf += apply_indent(indent) + "if " + this.signal.name + " then\n";
   buf += this.go_in[0].stmt_out.esterel_code(indent + INDENT_LEVEL);

   if (!(this.go_in[1].stmt_out instanceof reactive.Nothing)) {
      buf += "\n" + apply_indent(indent) + "else\n";
      buf += this.go_in[1].stmt_out.esterel_code(indent + INDENT_LEVEL);
   }
   buf += "\n" + apply_indent(indent) + "end if";

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
   buf += "\n" + apply_indent(indent) + "when " + this.signal.name;

   return buf;
}

reactive.Suspend.prototype.esterel_code = function(indent) {
   var buf = "";

   buf += apply_indent(indent) + "suspend\n";
   buf += this.go_in.stmt_out.esterel_code(indent + INDENT_LEVEL);
   buf += "\n" + apply_indent(indent) + "when " + this.signal.name;

   return buf;
}

reactive.Await.prototype.esterel_code = function(indent) {
   return apply_indent(indent) + "await " + this.signal.name;
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
   return apply_indent(indent) + "exit " + this.trapid.name;
}

reactive.Trap.prototype.esterel_code = function(indent) {
   var buf = "";

   buf += apply_indent(indent) + "trap " + this.trapid.name + " in\n";
   buf += this.go_in.stmt_out.esterel_code(indent + INDENT_LEVEL);
   buf += "\n" + apply_indent(indent) + "end trap";

   return buf;
}
