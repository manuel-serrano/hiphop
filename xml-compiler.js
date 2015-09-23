var reactive = require("./reactive-kernel.js");

function format_loc(attrs) {
   return attrs["%location"].filename + ":" + attrs["%location"].pos;
}

function get_childs(args) {
   var childs = [];
   var raw_childs = Array.prototype.slice.call(args, 1, args.length);

   for (var i in raw_childs)
       if (typeof(raw_childs[i]) == 'object') /* `instanceof Object` */
	 childs.push(raw_childs[i]);
   return childs;
}

function check_signal(signal) {
   return signal != undefined && signal instanceof reactive.Signal;
}

function fatal(msg, attrs) {
   console.log("*** ERROR at", format_loc(attrs), "***");
   console.log("   ", msg);
   process.exit(1);
}

function REACTIVEMACHINE(attrs, raw_childs) {
   var childs = get_childs(raw_childs);
   var machine = null;

   if (childs.length != 1)
      fatal("ReactiveMachime must have exactly one child.", attrs);
   machine = new reactive.ReactiveMachine(childs[0]);
   machine.loc = format_loc(attrs);
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

function PRESENT(attrs, raw_childs) {
   var childs = get_childs(raw_childs);
   var signal = attrs.signal;
   var present = null;

   if (!check_signal(signal))
      fatal("Present must have a signal argument.", attrs);
   if (childs.length < 1)
      fatal("Present must have at least one child.", attrs);
   present = new reactive.Present(signal, childs[0], childs[1]);
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

function PARALLEL(attrs, raw_childs) {
   var childs = get_childs(raw_childs);
   var parallel = null;

   if (childs != 2)
      fatal("Parallel must have exactly two childs.", attrs);
   parallel = new reactive.Parallel(childs[0], child[1]);
   parallel.loc = format_loc(attrs);
   return parallel;
}

function ABORT(attrs, raw_childs) {
   var childs = get_childs(raw_childs);
   var signal = attrs.signal;
   var abort = null;

   if (!check_signal(signal))
      fatal("Abort must have a signal argument.", attrs);
   if (childs.length != 1)
      fatal("Abort must have exactly one child.", attrs);
   abort = new reactive.Abort(signal, childs[0]);
   abort.loc = format_loc(attrs);
   return abort;
}

function LOOP(attrs, raw_childs) {
   var childs = get_childs(raw_childs);
   var loop = null;

   if (childs.length != 1)
      fatal("Loop must have exaclty one child.", attrs);
   loop = new reactive.Loop(childs[0]);
   loop.loc = format_loc(attrs);
   return loop;
}

function SEQUENCE(attrs, raw_childs) {
   var childs = get_childs(raw_childs);
   var sequence = null;

   if (childs.length < 2)
      fatal("Sequence must have at least two childs.", attrs);
   sequence = new reactive.Sequence(childs);
   sequence.loc = format_loc(attrs);
   return sequence;
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
