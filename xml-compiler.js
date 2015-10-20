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

function EMIT(attrs) {
   var signal_name = attrs.signal_name;
   var signal = null;
   var emit = null;

   compile_context.assert_signal_bounded(signal_name, attrs);
   signal = compile_context.machine.get_signal
   emit = new reactive.Emit(attrs.signal_name);
   emit.loc = format_loc(attrs);
   emit.machine = compile_context.machine;
   return emit;

//      -   signal.emitters++;
//-   signal.waiting = signal.emitters;

}

function NOTHING(attrs) {
   var nothing = new reactive.Nothing();
   nothing.loc = format_loc(attrs);
   return nothing;
}

function PAUSE(attrs) {
   var pause = new reactive.Pause();
   pause.loc = format_loc(attrs);
   return pause;
}

function HALT(attrs) {
   var halt = new reactive.Halt();
   halt.loc = format_loc(attrs);
   return halt;
}

function PRESENT(attrs) {
   var children = get_children(arguments);
   var signal_name = attrs.signal_name;
   var present = null;

   compile_context.assert_signal_bounded(signal_name, attrs);
   if (children.length < 1)
      fatal("Present must have at least one child.", attrs);
   present = new reactive.Present(signal_name, children[0], children[1]);
   present.loc = format_loc(attrs);
   return present;
}

function AWAIT(attrs) {
   var signal_name = attrs.signal_name;
   var await = null;

   compile_context.assert_signal_bounded(signal_name, attrs);
   await = new reactive.Await(signal_name);
   await.loc = format_loc(attrs);
   return await;
}

function PARALLEL(attrs) {
   var children = get_children(arguments);
   var parallel = null;

   if (children.length != 2)
      fatal("Parallel must have exactly two children.", attrs);
   parallel = new reactive.Parallel(children[0], children[1]);
   parallel.loc = format_loc(attrs);
   return parallel;
}

function ABORT(attrs) {
   var children = get_children(arguments);
   var signal_name = attrs.signal_name;
   var abort = null;

   compile_context.assert_signal_bounded(signal_name, attrs);
   if (children.length != 1)
      fatal("Abort must have exactly one child.", attrs);
   abort = new reactive.Abort(children[0], signal_name);
   abort.loc = format_loc(attrs);
   return abort;
}

function SUSPEND(attrs) {
   var children = get_children(arguments);
   var signal_name = attrs.signal_name;
   var suspend = null;

   compile_context.assert_signal_bounded(signal_name, attrs);
   if (children.length != 1)
      fatal("Suspend must have exactly one child.", attrs);
   suspend = new reactive.Suspend(children[0], signal);
   suspend.loc = format_loc(attrs);
   return suspend;
}

function LOOP(attrs) {
   var children = get_children(arguments);
   var loop = null;

   if (children.length != 1)
      fatal("Loop must have exaclty one child.", attrs);
   loop = new reactive.Loop(children[0]);
   loop.loc = format_loc(attrs);
   return loop;
}

function SEQUENCE(attrs) {
   var children = get_children(arguments);
   var sequence = null;

   if (children.length < 2)
      fatal("Sequence must have at least two children.", attrs);
   sequence = new reactive.Sequence(children);
   sequence.loc = format_loc(attrs);
   return sequence;
}

function ATOM(attrs) {
   var func = attrs.func;
   var atom = null;

   if (!(func instanceof Function))
      fatal("Atom must have a func attribute which is a function.", attrs);
   atom = new reactive.Atom(attrs.func);
   atom.loc = format_loc(attrs);
   return atom;
}

function TRAP(attrs) {
   var children = get_children(arguments);
   var trap_name = attrs.trap_name;
   var trap = null;

   if (children.length != 1)
      fatal("Trap must embeded one child.", attrs);
   compile_context.assert_free_trap_name(trap_name, attrs);
   trap = new reactive.Trap(children[0], trap_name);
   trap.loc = format_loc(attrs);
   compile_context.traps[trap_name] = trap;
   return trap;
}

function EXIT(attrs) {
   var trap_name = attrs.trap_name;
   var exit = null;

   compile_context.assert_trap_bounded(trap_name, attrs);
   exit = new reactive.Exit(trap_name);
   exit.loc = format_loc(attrs);
   return exit;
}

function RUN(attrs) {
   var machine = attrs.machine;
   var children = get_children(arguments);
   var run = null;
   var sig_list_caller = [];
   var sig_list_callee = [];

   for (var i in children) {
      var child = children[i];

      if (!(child.caller instanceof reactive.Signal)
	  || !(child.callee instanceof reactive.Signal))
	 fatal("MergeSignal must had caller and callee arguments as signal.",
	       attrs);

      sig_list_caller[i] = child.caller;
      sig_list_callee[i] = child.callee;
   }

   if (!(machine instanceof reactive.ReactiveMachine))
      fatal("Run must had machine attribute.", attrs);
   run = new reactive.Run(machine, sig_list_caller, sig_list_callee);
   run.loc = format_loc(attrs);
   return run;
}

function MERGESIGNAL(attrs) {
   return attrs;
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
exports.RUN = RUN;
exports.MERGESIGNAL = MERGESIGNAL;
exports.LOCALSIGNAL = LOCALSIGNAL;
exports.INPUTSIGNAL = INPUTSIGNAL;
exports.OUTPUTSIGNAL = OUTPUTSIGNAL;
