"use hopscript"

var reactive = require("./reactive-kernel.js");

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

function check_signal(signal) {
   return signal != undefined && signal instanceof reactive.Signal;
}

function fatal(msg, attrs) {
   console.log("*** ERROR at", format_loc(attrs), "***");
   console.log("   ", msg);
   process.exit(1);
}

function REACTIVEMACHINE(attrs) {
   var children = get_children(arguments);
   var machine = null;

   if (children.length != 1)
      fatal("ReactiveMachime must have exactly one child.", attrs);
   machine = new reactive.ReactiveMachine(children[0]);
   machine.loc = format_loc(attrs);
   machine.machine_name = attrs.name;
   machine.catch_signals();
   return machine;
}

function EMIT(attrs) {
   var signal = attrs.signal;
   var emit = null

   if (!check_signal(signal))
      fatal("Emit must have a signal argument.", attrs);
   emit = new reactive.Emit(attrs.signal);
   emit.loc = format_loc(attrs);
   return emit;
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
   var signal = attrs.signal;
   var present = null;

   if (!check_signal(signal))
      fatal("Present must have a signal argument.", attrs);
   if (children.length < 1)
      fatal("Present must have at least one child.", attrs);
   present = new reactive.Present(signal, children[0], children[1]);
   present.loc = format_loc(attrs);
   return present;
}

function AWAIT(attrs) {
   var signal = attrs.signal;
   var await = null;

   if (!check_signal(signal))
      fatal("Await must have a signal argument.", attrs);
   await = new reactive.Await(signal);
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
   var signal = attrs.signal;
   var abort = null;

   if (!check_signal(signal))
      fatal("Abort must have a signal argument.", attrs);
   if (children.length != 1)
      fatal("Abort must have exactly one child.", attrs);
   abort = new reactive.Abort(children[0], signal);
   abort.loc = format_loc(attrs);
   return abort;
}

function SUSPEND(attrs) {
   var children = get_children(arguments);
   var signal = attrs.signal;
   var suspend = null;

   if (!check_signal(signal))
      fatal("Suspend must have a signal argument.", attrs);
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
