"use hopscript"

var reactive = require("./reactive-kernel.js");

function Context() {
   this.machine = new reactive.ReactiveMachine();
   this.incarnation_lvl = 0;
}

Context.prototype.assert_free_signal_name = function(signal_name, attrs) {
   if (this.machine.local_signals[signal_name] != undefined
       || this.machine.input_signals[signal_name] != undefined
       || this.machine.output_signals[signal_name] != undefined)
      fatal("Name " + signal_name + " already used.", attrs);
}

Context.prototype.assert_signal_bounded = function(signal_name, attrs) {
   if (typeof(signal_name) != 'string')
      fatal("signal_name not a string.", attrs);
   if (this.machine.local_signals[signal_name] == undefined
       && this.machine.input_signals[signal_name] == undefined
       && this.machine.output_signals[signal_name] == undefined)
      fatal("Signal " + signal_name + " is unknown.", attrs);
}

Context.prototype.assert_free_trap_name = function(trap_name, attrs) {
   if (typeof(trap_name != 'string'))
      fatal("trap_name not a string.", attrs);
   if (this.machine.traps[trap_name] != undefined)
      fatal("Trap " + trap_name + " already used.", attrs);
}

Context.prototype.assert_trap_bounded = function(trap_name, attrs) {
   if (typeof(trap_name != 'string'))
      fatal("trap_name not a string.", attrs);
   if (this.machine.traps[trap_name] == undefined)
      fatal("Trap " + trap_name + " is unknown.", attrs);
}

var compile_context = new Context();


function format_loc(attrs) {
   return attrs["%location"].filename + ":" + attrs["%location"].pos;
}

function get_children(args) {
   var children = [];
   var raw_children = Array.prototype.slice.call(args, 1, args.length);

   for (var i in raw_children)
      if (typeof(raw_children[i]) == 'object') /*instanceof reactive.Statement*/
	 children.push(raw_children[i]);
   return children;
}

function fatal(msg, attrs) {
   console.log("*** ERROR at", format_loc(attrs), "***");
   console.log("   ", msg);
   process.exit(1);
}

function REACTIVEMACHINE(attrs) {
   var children = get_children(arguments);
   var len = children.length;
   var machine = null;

   if (!(children[len - 1] instanceof Statement))
      fatal("ReactiveMachime last child must be a statement", attrs);

   for (var i = 0; i < len - 2; i++)
      if (!((children[i] instanceof INPUTSIGNAL)
	    || (children[i] instanceof OUTPUTSIGNAL)))
	 fatal("ReactiveMachine child " + i
	       + " is not an input or output signal.", attrs);

   machine = compile_context.machine;
   machine.build_wires(children[len - 1]);
   machine.loc = format_loc(attrs);
   machine.machine_name = attrs.name;
   compile_context = new Context();
   return machine;
}

function EMIT(machine, attrs) {
   var signal_name = attrs.signal_name;

   compile_context.assert_signal_bounded(signal_name, attrs);
   return new reactive.Emit(machine, format_loc, attrs.signal_name);
}

function NOTHING(attrs) {
   return new reactive.Nothing(compile_context.machine, format_loc(attrs));
}

function PAUSE(attrs) {
   return new reactive.Pause(compile_context.machine, format_loc(attrs));
}

function HALT(attrs) {
   return new reactive.Halt(compile_context.machine, format_loc(attrs));
}

function PRESENT(attrs) {
   var children = get_children(arguments);
   var signal_name = attrs.signal_name;
   var present = null;

   compile_context.assert_signal_bounded(signal_name, attrs);
   if (children.length < 1)
      fatal("Present must have at least one child.", attrs);
   return new reactive.Present(compile_context.machine,
			       format_loc(attrs),
			       signal_name,
			       children[0],
			       children[1]);
}

function AWAIT(attrs) {
   var signal_name = attrs.signal_name;
   var await = null;

   compile_context.assert_signal_bounded(signal_name, attrs);
   return new reactive.Await(compile_context.machine,
			     format_loc(attrs),
			     signal_name);
}

function PARALLEL(attrs) {
   var children = get_children(arguments);

   if (children.length != 2)
      fatal("Parallel must have exactly two children.", attrs);
   return new reactive.Parallel(compile_context.machine,
				format_loc(attrs),
				children[0],
				children[1]);
}

function ABORT(attrs) {
   var children = get_children(arguments);
   var signal_name = attrs.signal_name;

   compile_context.assert_signal_bounded(signal_name, attrs);
   if (children.length != 1)
      fatal("Abort must have exactly one child.", attrs);
   return new reactive.Abort(compile_context.machine,
			     format_loc(attrs),
			     children[0],
			     signal_name);
}

function SUSPEND(attrs) {
   var children = get_children(arguments);
   var signal_name = attrs.signal_name;

   compile_context.assert_signal_bounded(signal_name, attrs);
   if (children.length != 1)
      fatal("Suspend must have exactly one child.", attrs);
   return new reactive.Suspend(compile_context.machime,
			       format_loc(attrs),
			       children[0],
			       signal);
}

function LOOP(attrs) {
   var children = get_children(arguments);

   if (children.length != 1)
      fatal("Loop must have exaclty one child.", attrs);
   return new reactive.Loop(compile_context.machine,
			    format_loc(attrs),
			    children[0]);
}

function SEQUENCE(attrs) {
   var children = get_children(arguments);

   if (children.length < 2)
      fatal("Sequence must have at least two children.", attrs);
   return new reactive.Sequence(compile_context.machine,
				format_loc(attrs),
				children);
}

function ATOM(attrs) {
   var func = attrs.func;

   if (!(func instanceof Function))
      fatal("Atom must have a func attribute which is a function.", attrs);
   return new reactive.Atom(compile_context.machine,
			    format_loc(attrs),
			    attrs.func);
}

function TRAP(attrs) {
   var children = get_children(arguments);
   var trap_name = attrs.trap_name;
   var trap = null;

   if (children.length != 1)
      fatal("Trap must embeded one child.", attrs);
   compile_context.assert_free_trap_name(trap_name, attrs);
   trap = new reactive.Trap(compile_context.machine,
			    format_loc(attrs),
			    children[0],
			    trap_name);
   compile_context.traps[trap_name] = trap;
   return trap;
}

function EXIT(attrs) {
   var trap_name = attrs.trap_name;

   compile_context.assert_trap_bounded(trap_name, attrs);
   return new reactive.Exit(compile_context.machine,
			    format_loc(attrs),
			    trap_name);
}

function INPUTSIGNAL(attrs) {
   var ref = attrs.ref;

   if (!(ref instanceof reactive.Signal))
      fatal("InputSignal must had a ref argument as signal.", attrs);
   compile_context.assert_free_signal_name(ref.name, attrs);
   compile_context.used_signal_names.push(ref.name);
   compile_context.input_signals[ref.name] = ref;
}

function OUTPUTSIGNAL(attrs) {
   var ref = attrs.ref;

   if (!(ref instanceof reactive.Signal))
      fatal("OutputSignal must had a ref argument as signal.", attrs);
   compile_context.assert_free_signal_name(ref.name, attrs);
   compile_context.used_signal_names.push(ref.name);
   compile_context.output_signals[ref.name] = ref;
}

function LOCALSIGNAL(attrs) {
   var name = attrs.name;
   var sigs = [];

   if (typeof(name) != 'string')
      fatal("LocalSignal must had a name argument as string.", attrs);
   compile_context.assert_free_signal_name(name, attrs);
   compile_context.used_signal_names.push(name);
   compile_context.local_signals[name] = sigs;
   for (var i = 0; i <= compile_context.incarnation_lvl; i++)
      sigs[i] = new reactive.Signal(name, null);
}

exports.REACTIVEMACHINE = REACTIVEMACHINE;
exports.EMIT = EMIT;
exports.NOTHING = NOTHING;
exports.PAUSE = PAUSE;
exports.HALT = HALT;
exports.PRESENT = PRESENT;
exports.AWAIT = AWAIT;
exports.PARALLEL = PARALLEL;
exports.ABORT = ABORT;
exports.LOOP = LOOP;
exports.SEQUENCE = SEQUENCE;
exports.ATOM = ATOM;
exports.SUSPEND = SUSPEND;
exports.TRAP = TRAP;
exports.EXIT = EXIT;
exports.LOCALSIGNAL = LOCALSIGNAL;
exports.INPUTSIGNAL = INPUTSIGNAL;
exports.OUTPUTSIGNAL = OUTPUTSIGNAL;
