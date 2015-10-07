"use strict"

var reactive = require("reactive-kernel.js");

var INDENT_LEVEL = 4;

function apply_indent(indent, stnt) {
   var buf = "\n";

   for (var i in indent)
      buf += " ";
   buf += stmt

   return buf;
}

ReactiveMachine.prototype.esterel_code = function(indent) {
   return this.go_in.stmt_out.esterel_code(0);
}

Emit.prototype.esterel_code = function(indent) {
   return apply_indent(indent, "emit " + this.signal.name + ";");
}

Pause.prototype.esterel_code = function(indent) {
   return apply_indent(indent, "pause;");
}

Present.prototype.esterel_code = function(indent) {
   var buf = "";

   buf += apply_indent(indent, "if " + this.signal.name + " then");
   buf += this.go_in[0].stmt_out.esterel_code(indent + INDENT_LEVEL);
   buf += apply_indent(indent, "else");
   buf += this.go_in[1].stmt_out.esterel_code(indent + INDENT_LEVEL);
   buf += apply_indent(indent, "end if;");

   return buf;
}

Sequence.prototype.esterel_code = function(indent) {
   var buf = "";

   for (var i in this.go_in)
      buf += this.go_in[i].stmt_out.esterel_code(indent + INDENT_LEVEL);

   return buf;
}

Loop.prototype.esterel_code = function(indent) {
   var buf = "";

   buf += apply_indent(indent, "loop");
   buf += this.go_in.stmt_out.esterel_code(indent + INDENT_LEVEL);
   buf += apply_indent(indent, "end loop;");

   return buf;
}

Abort.prototype.esterel_code = function(indent) {
   var buf = "";

   buf += apply_indent(indent, "abort");
   buf += this.go_in.stmt_out.esterel_code(indent + INDENT_LEVEL);
   buf += apply_indent(indent, "when " + this.signal.name + ";");

   return buf;
}

Await.prototype.esterel_code = function(indent) {
   return apply_indent(indent, "await " + this.signal.name + ";");
}

Halt.prototype.esterel_code = function(indent) {
   return apply_indent(indent, "halt;");
}

// penser à mettre [] dans par si sequence

Nothing.prototype.esterel_code = function(indent) {
   return apply_indent(indent, "nothing;");
}

Atom.prototype.esterel_code = function(indent) {
   return apply_indent(indent, "atom;"); // todo give host function name
}
