"use hopscript"

var rk = require("./reactive-kernel.js");

var INDENT_LVL = 3;

function indent_cursor(indent) {
   var buf = "";

   for (var i = 0; i < indent; i++)
      buf += " ";

   return buf;
}

function generic_stmt(indent, buf) {
   return indent_cursor(indent) + buf + ";";
}

rk.Statement.prototype.pretty_print = function(indent) {
   return indent_cursor(indent) + this.name + " NYI";
}

rk.ReactiveMachine.prototype.pretty_print = function(indent=0) {
   var buf = "reactivemachine " + this.machine_name + " {\n";
   var sig;

   for (var i in this.input_signals) {
      sig = this.input_signals[i];
      buf += indent_cursor(INDENT_LVL) +"input ";
      buf += sig.name + ";\n";
   }

   for (var i in this.output_signals) {
      sig = this.output_signals[i];
      buf += indent_cursor(INDENT_LVL) + "output ";
      buf += sig.name + ";\n";
   }

   buf += this.go_in.stmt_out.pretty_print(INDENT_LVL);

   return buf + "\n}";
}

rk.Emit.prototype.pretty_print = function(indent) {
   return generic_stmt(indent, "emit " + this.signal_name);
}

rk.Pause.prototype.pretty_print = function(indent) {
   return generic_stmt(indent, "pause");
}

rk.Await.prototype.pretty_print = function(indent) {
   return generic_stmt(indent, "await " + this.signal_name);
}

rk.Halt.prototype.pretty_print = function(indent) {
   return generic_stmt(indent, "halt");
}

rk.Nothing.prototype.pretty_print = function(indent) {
   return generic_stmt(indent, "nothing");
}

rk.Atom.prototype.pretty_print = function(indent) {
   return generic_stmt(indent, "atom(func_name, param1, paramX)");
}

rk.Trap.prototype.pretty_print = function(indent) {
   return indent_cursor(indent) + "trap " + this.trap_name + " {\n"
      + this.go_in.stmt_out.pretty_print(indent + INDENT_LVL)
      + "\n" + indent_cursor(indent) + "}";
}

rk.Exit.prototype.pretty_print = function(indent) {
   return generic_stmt(indent, "exit " + this.trap_name);
}

rk.LocalSignalIdentifier.prototype.pretty_print = function(indent) {
   return indent_cursor(indent) + "signal " + this.signal_name + " {\n"
      + this.go_in.stmt_out.pretty_print(indent + INDENT_LVL)
      + "\n" + indent_cursor(indent) + "}";
}

rk.Sequence.prototype.pretty_print = function(indent) {
   var len = this.go_in.length;
   var buf = "";

   this.go_in.forEach(function(wire, i, go_in) {
      buf += wire.stmt_out.pretty_print(indent);
      if (i < len - 1)
	      buf += "\n";
   })

   return buf;
}

rk.Suspend.prototype.pretty_print = function(indent) {
   return indent_cursor(indent) + "suspend {\n"
      + this.go_in.stmt_out.pretty_print(indent + INDENT_LVL)
      + "\n" + indent_cursor(indent) + "} when " + this.signal_name + ";";
}

rk.Abort.prototype.pretty_print = function(indent) {
   return indent_cursor(indent) + "abort {\n"
      + this.go_in.stmt_out.pretty_print(indent + INDENT_LVL)
      + "\n" + indent_cursor(indent) + "} when " + this.signal_name + ";";
}

rk.Loop.prototype.pretty_print = function(indent) {
   return indent_cursor(indent) + "loop {\n"
      + this.go_in.stmt_out.pretty_print(indent + INDENT_LVL)
      + "\n" + indent_cursor(indent) + "}";
}

rk.Present.prototype.pretty_print = function(indent) {
   var buf = indent_cursor(indent) + "present " + this.signal_name;
   var then_is_seq = this.go_in[0].stmt_out instanceof rk.Sequence;
   var else_is_seq = this.go_in[1].stmt_out instanceof rk.Sequence;

   if (then_is_seq)
      buf += " {";
   buf += "\n";
   buf += this.go_in[0].stmt_out.pretty_print(indent + INDENT_LVL);
   if (!(this.go_in[1].stmt_out instanceof rk.Nothing)) {
      buf += "\n";
      if (then_is_seq)
	 buf += indent_cursor(indent) + "} else";
      else
	 buf += indent_cursor(indent) + "else";

      if (else_is_seq)
	 buf += " {";
      buf += "\n";
      buf += this.go_in[1].stmt_out.pretty_print(indent + INDENT_LVL);
      if (else_is_seq)
	 buf += "\n" + indent_cursor(indent) + "}";
   } else if (then_is_seq)
      buf += "\n" + indent_cursor(indent) + "}";

   return buf;
}

rk.Parallel.prototype.pretty_print = function(indent) {
   return indent_cursor(indent) + "fork {\n"
      + this.go_in[0].stmt_out.pretty_print(indent + INDENT_LVL)
      + "\n" + indent_cursor(indent) + "} par {\n"
      + this.go_in[1].stmt_out.pretty_print(indent + INDENT_LVL)
      + "\n" + indent_cursor(indent) + "}";
}
