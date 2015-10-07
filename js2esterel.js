"use strict"

var reactive = require("./reactive-kernel.js");

var INDENT_LEVEL = 4;

function apply_indent(indent, stmt) {
   var buf = "\n";

   for (var i = 0; i < indent; i++)
      buf += " ";
   buf += stmt;

   return buf;
}

reactive._Statement.prototype.esterel_code = function(indent) {
   return apply_indent(indent, this.name + " NYI");
}

reactive.ReactiveMachine.prototype.esterel_code = function(indent) {
   return this.go_in.stmt_out.esterel_code(0);
}

reactive.Emit.prototype.esterel_code = function(indent) {
   return apply_indent(indent, "emit " + this.signal.name + ";");
}

reactive.Pause.prototype.esterel_code = function(indent) {
   return apply_indent(indent, "pause;");
}

reactive.Present.prototype.esterel_code = function(indent) {
   var buf = "";

   buf += apply_indent(indent, "if " + this.signal.name + " then");
   buf += this.go_in[0].stmt_out.esterel_code(indent + INDENT_LEVEL);

   if (!(this.go_in[1].stmt_out instanceof reactive.Nothing)) {
      buf += apply_indent(indent, "else");
      buf += this.go_in[1].stmt_out.esterel_code(indent + INDENT_LEVEL);
   }
   buf += apply_indent(indent, "end if;");

   return buf;
}

reactive.Sequence.prototype.esterel_code = function(indent) {
   var buf = "";

   for (var i in this.go_in)
      buf += this.go_in[i].stmt_out.esterel_code(indent);

   return buf;
}

reactive.Loop.prototype.esterel_code = function(indent) {
   var buf = "";

   buf += apply_indent(indent, "loop");
   buf += this.go_in.stmt_out.esterel_code(indent + INDENT_LEVEL);
   buf += apply_indent(indent, "end loop;");

   return buf;
}

reactive.Abort.prototype.esterel_code = function(indent) {
   var buf = "";

   buf += apply_indent(indent, "abort");
   buf += this.go_in.stmt_out.esterel_code(indent + INDENT_LEVEL);
   buf += apply_indent(indent, "when " + this.signal.name + ";");

   return buf;
}

reactive.Await.prototype.esterel_code = function(indent) {
   return apply_indent(indent, "await " + this.signal.name + ";");
}

reactive.Halt.prototype.esterel_code = function(indent) {
   return apply_indent(indent, "halt;");
}

reactive.Parallel.prototype.esterel_code = function(indent) {
   var buf = "";
   var branch_indent = indent + INDENT_LEVEL;
   var branch_seq = false;

   if (this.go_in[0].stmt_out instanceof reactive.Sequence) {
      buf += apply_indent(indent + INDENT_LEVEL, "[ ");
      branch_indent += 2;
      branch_seq = true;
   }

   buf += this.go_in[0].stmt_out.esterel_code(branch_indent);
   if (branch_seq) {
      buf += " ]";
      branch_indent = indent + INDENT_LEVEL;
      branch_seq = false;
   }

   buf += apply_indent(indent, "||");

   if (this.go_in[1].stmt_out instanceof reactive.Sequence) {
      buf += apply_indent(indent + INDENT_LEVEL, "[ ");
      branch_indent += 2;
      branch_seq = true;
   }

   buf += this.go_in[1].stmt_out.esterel_code(indent + INDENT_LEVEL);
   if (branch_seq)
      buf += " ]";

   return buf;
}

reactive.Nothing.prototype.esterel_code = function(indent) {
   return apply_indent(indent, "nothing;");
}

reactive.Atom.prototype.esterel_code = function(indent) {
   return apply_indent(indent, "atom " + this.func.name + ";");
}
