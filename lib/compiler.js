"use hopscript"

var ast = require("./ast.js");

function IncarnationVisitor() {
   this.in_loop = 0;
   this.lvl = 0;
   this.down_at_loop_out = 0;
}

IncarnationVisitor.prototype.visit = function(node) {
   var node_instanceof_loop = node instanceof ast.Loop;
   var node_instanceof_parallel = node instanceof ast.Parallel;

   if (node_instanceof_parallel && this.in_loop > 0) {
      this.lvl++;
   } else if (node_instanceof_loop) {
      this.in_loop++;
   } else if (node instanceof ast.LocalSignal && this.in_loop > 0) {
      this.lvl++;
      this.down_at_loop_out++;
   } else if (node instanceof ast.Pause && this.lvl > 0) {
      node.new_incarnation_on_k0 = true;
   }

   node.incarnation = this.lvl;
   for (var i in node.children)
      node.children[i].accept(this);

   if (node_instanceof_loop) {
      node.in_loop--;
      this.lvl -= this.down_at_loop_out;
      this.down_at_loop_out = 0;
   } else if (node_instanceof_parallel && this.in_loop > 0) {
      this.lvl--;
   }
}

function PrintTreeVisitor() {
   this.indent = "+-- ";
   this.INDENT_UNIT = "   ";
}

PrintTreeVisitor.prototype.visit = function(node) {
   var buf = this.indent + node.name;
   var buf_parent = node.parent == null ? "N/A" : node.parent.name;

   if (node instanceof ast.Emit
       || node instanceof ast.Await
       || node instanceof ast.Abort
       || node instanceof ast.Suspend
       || node instanceof ast.Present
       || node instanceof ast.Signal)
      buf = buf + " " + node.signal_name;
   else if (node instanceof ast.Trap)
      buf = buf + " " + node.trap_name;
   else if (node instanceof ast.Exit)
      buf = buf + " " + node.trap_name + " " + node.return_code;

   console.log(buf
	       + " [parent: "
	       + buf_parent
	       + " / lvl: "
	       + node.incarnation + "]");

   var prev_indent = this.indent;

   this.indent = this.INDENT_UNIT + this.indent;
   for (var i in node.children)
      node.children[i].accept(this);
   this.indent = prev_indent;
}

function compile(machine, ast) {
   ast.accept(new IncarnationVisitor());
   ast.accept(new PrintTreeVisitor());
}

exports.compile = compile;
