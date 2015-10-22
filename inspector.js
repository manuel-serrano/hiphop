"use hopscript"

var reactive = require("./reactive-kernel.js");
var fs = require("fs");

var CMD_EXIT = "exit";
var CMD_UP = "up";
var CMD_TOP = "top";
var CMD_REACT = "react";

/* set the value of a signal to true / false */
var CMD_TOOGLE = "toogle";

function print_separator() {
   console.log("------------------------------------------------------------");
}

function is_integer(i) {
   return typeof(i) == "number" && (i % 1 == 0);
}

function print_no_newline(buf) {
   var buffer = new Buffer(buf.length);
   buffer.write(buf);
   fs.writeSync(1, buffer, 0, buf.length);
   fs.fsyncSync(1);
}

function Inspector(stmt, level = 0) {
   this.level = level;
   this.stmt = stmt;
   this.properties = null;
   this.read_properties();

   if (this.level == 0) {
      console.log("Usage: UP\n" +
		  "       TOP\n" +
		  "       EXIT\n" +
		  "       REACT (on reactive machine only)\n" +
		  "       TOOGLE <prop> <attr>\n" +
		  "       <propertie id>");
   }
}

Inspector.prototype.read_properties = function() {
   this.properties = [];

   for (var prop in this.stmt) {
      var p = {	name: prop,
		value: this.stmt[prop] };
      this.properties.push(p);
   }
}

Inspector.prototype.print_properties = function() {
   var prop_buffer = "";

   for (var prop in this.properties) {
      var p = this.properties[prop];

      if (p.value instanceof Function)
	 prop_buffer = "\x1b[31m[Function]\x1b[0m";
      else if (p.value instanceof Object)
	 prop_buffer = "\x1b[32m" + p.value + "\x1b[0m";
      else if (typeof(p.value) == "boolean")
	 prop_buffer = "\x1b[33m" + p.value + "\x1b[0m";
      else
	 prop_buffer = "\x1b[31m" + p.value + "\x1b[0m";
      console.log("  [" + prop + "]\t" + p.name + "  =>  " + prop_buffer);
   }
}

Inspector.prototype.prompt = function() {
   var input = "";
   var buffer = new Buffer(32);
   var read_sz = 0;

   print_separator();

   print_no_newline("[\x1b[1m" + this.level + "\x1b[0m]> ");

   read_sz = fs.readSync(0, buffer, 0, 32);
   input = buffer.toString("utf8", 0, read_sz - 1); /* - 1 to avoid \n */

   if (is_integer(parseInt(input))) {
      input = parseInt(input);
      if (input < 0 || input >= this.properties.length)
	 console.log("ERROR: out of bounds propertie access.");
      else
	 return input;
   } else {
      input = input.toLowerCase();

      if (input == CMD_EXIT ||
	  input == CMD_UP ||
	  input == CMD_TOP ||
	  input == CMD_REACT)
	 return input;
      else {
	 input = input.split(" ");

	 if (input[0] == CMD_TOOGLE) {
	    if ((input[1] == "this" &&
		 typeof(this.stmt[input[2]]) == "boolean")) {
	       this.stmt[input[2]] = !this.stmt[input[2]];
	       this.read_properties();
	    } else if (this.stmt[input[1]] != undefined &&
		       typeof(this.stmt[input[1]][input[2]]) == "boolean") {
	       this.stmt[input[1]][input[2]] =
		  !this.stmt[input[1]][input[2]];
	       this.read_properties();
	    } else
	       console.log("ERROR: invalid toogle syntax.");
	 } else
	    console.log("ERROR: invalid command.");
      }
   }
}

Inspector.prototype.inspect = function() {
   var cmd = "";

   while (1) {
      if (cmd == CMD_REACT) {
	 if (this.stmt instanceof reactive.ReactiveMachine) {
	    this.stmt.react(this.stmt.seq + 1);
	    this.read_properties();
	 } else {
	    console.log("ERROR: "
			+ "can't react on non reactive machine statement.");
	 }
      } else if (cmd == CMD_UP || cmd == CMD_TOP) {
	 if (this.level == 0)
	    console.log("ERROR: already on top level.");
	 else
	    return cmd;
      } else if (cmd == CMD_EXIT) {
	 return CMD_EXIT;
      } else if (is_integer(cmd)) {
	 /* bounds of cmd are already been checked here */
	 if (!(this.properties[cmd].value instanceof Object)) {
	    console.log("ERROR: can't inspect non object values.");
	    cmd = "";
	 } else {
	    cmd = (new Inspector(this.properties[cmd].value,
				 this.level + 1).inspect());
	    if (cmd == CMD_EXIT)
	       return CMD_EXIT;
	    else if (cmd == CMD_TOP && this.level > 0)
	       return CMD_TOP;
	 }
      }

      console.log("");
      print_separator();
      this.print_properties();
      cmd = this.prompt();
   }
}

exports.Inspector = Inspector;
