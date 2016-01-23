"use hopscript"

var compiler = require("./compile.js");
var error = require("./error.js");

function ReactiveMachine(ast, name) {
   this.ast = ast;
   this.name = name;
   this.nets = [];
   this.known_nets = [];
   this.pauses = [];
   this.boot = true;

   compiler.compile(this, ast);
}

exports.ReactiveMachine = ReactiveMachine;

ReactiveMachine.prototype.react() {
   var n_nets = this.nets.length;

   for (let i in this.nets)
      this.nets[i].reset(this.boot);

   if (!this.boot)
      this.known_nets = this.known_nets.concat(this.pauses);
   this.pauses = [];
   this.boot = false;

   while (this.known_nets.length > 0) {
      this.known_nets.pop().power();
      n_nets--;
   }

   if (n_nets > 0)
      throw new error.CausalityError();
}
