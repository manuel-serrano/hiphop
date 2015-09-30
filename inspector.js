"use strict"

var reactive = require("./reactive-kernel.js");
var stdin = process.openStdin();

var CMD_EXIT = "exit";
var CMD_UP = "up";
var CMD_REACT = "react";

function print_separator() {
   console.log("------------------------------------------------------------");
}

function print_tiny_separator() {
   console.log("                 --------------------------                 ");
}

function is_integer(i) {
   return typeof(i) == "number" && (i % 1 == 0);
}

function Inspector(stmt, level) {
   this.level = level == undefined ? 0 : level;
   this.stmt = stmt;
   this.properties = null;
   this.max_prop_id = 0;
   this.read_properties();
}

Inspector.prototype.read_properties = function() {
   this.properties = [];

   for (var prop in this) {
      var p = {
		name: prop,
		value: this.stmt[prop] };

      if (p.value instanceof reactive.Statement)
	 p.id = this.max_prop_id++;
   }
}

Inspector.print_properties = function() {
   var prop_buffer = "";

   for (var prop in this.properties) {
      var p = this.properties[prop];
      prop_buffer = "    ";

      if (p.id != null)
	 prop_buffer += "[" + p.id + "]\t";
      else
	 prop_buffer += "\t";

      prop_buffer += p.name + "  =>  " + p.value;
      console.log(prop_buffer);
   }
}

Inspector.prototype.prompt = function() {
   var input = "";

   print_tiny_separator();
   print_properties();
   console.log("Usage: UP   EXIT   REACT (on reactive machine only)" +
	       "<propertie id>");
   console.log("[" + this.level + "]> ");
}

/* second part of the prompt function. no way to have a simpler (synchrone)
   access to stdin with nodejs... */

stdin.on("data", function(input) {
   if (is_integer(input)) {
      if (input < 0 || input >= this.max_prop_id)
	 console.log("ERROR: out of bounds propertie access");
   } else {
      var linput = input.toLowerCase();

      if (linput == CMD_EXIT ||
	  linput == CMD_UP ||
	  linput == CMD_REACT)
	 return linput;
      else
	 console.log("ERROR: invalid command");
   }
});

Inspector.prototype.inspect = function() {
   var cmd = "";

   while (1) {
      if (cmd == CMD_REACT) {
	 if (this.stmt instanceof reactive.ReactiveMachine) {
	    this.stmt.react();
	    read_properties();
	 } else {
	    console.log("ERROR: can't react of non reactive machine statement");
	 }
      } else if (cmd == CMD_UP || cmd == CMD_EXIT) {
	 return cmd;
      } else if (is_integer(cmd)) {
	 /* bounds of cmd are already been checked here */
	 cmd = (new Inspector(this.properties[cmd].value,
			      this.level + 1).inspect());

	 if (cmd == CMD_EXIT)
	    return CMD_EXIT;
      }

      console.log("");
      print_separator();
      print_properties();
      cmd = prompt();
   }
}

exports.Inspector = Inspector;
