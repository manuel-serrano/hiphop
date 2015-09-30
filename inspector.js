"use strict"

var reactive = require("./reactive-kernel.js");
var fs = require("fs");

var CMD_EXIT = "exit";
var CMD_UP = "up";
var CMD_REACT = "react";

/* set the value of a signal to true / false */
var CMD_TOOGLE = "toogle";

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
   this.read_properties();
}

Inspector.prototype.read_properties = function() {
   this.properties = [];

   for (var prop in this) {
      var p = {	name: prop,
		value: this.stmt[prop] };
      this.properties.push(p);
   }
}

Inspector.print_properties = function() {
   var prop_buffer = "";

   for (var prop in this.properties) {
      var p = this.properties[prop];
      console.log("    [" + prop + "]    " + p.name + "  =>  " + p.value);
   }
}

Inspector.prototype.prompt = function() {
   var input = "";
   var buffer = new Buffer(32);
   var read_sz = 0;

   print_tiny_separator();
   print_properties();
   console.log("Usage: UP   EXIT   REACT (on reactive machine only)" +
	       "   TOOGLE prop attr)" +
	       "   <propertie id>");
   console.log("[" + this.level + "]> ");

   read_sz = fs.readSync(0, buffer, 0, 32);
   input = buffer.toString("utf8", 0, read_sz);

   if (is_integer(input)) {
      if (input < 0 || input >= this.properties.length)
	 console.log("ERROR: out of bounds propertie access");
      else
	 return input;
   } else {
      input = input.toLowerCase();

      if (input == CMD_EXIT ||
	  input == CMD_UP ||
	  input == CMD_REACT)
	 return input;
      else {
	 input = input.split(" ");

	 if (input[0] == CMD_TOOGLE) {
	    if ((input[1] == "this" &&
		 typeof(this.stmt[input[2]]) == "boolean")) {
	       this.stmt[input[2]] == !this.stmt[input[2]];
	       this.read_properties();
	    } else if (this.stmt[input[1]] != undefined &&
		       typeof(this.stmt[input[1]][input[2]]) == "boolean") {
	       this.stmt[input[1]][input[2]] =
		  !this.stmt[input[1]][input[2]];
	       this.read_properties();
	    } else
	       console.log("ERROR: invalid toogle syntax");
	 } else
	    console.log("ERROR: invalid command");
      }
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
