var reactive = require("./reactive-kernel.js");

function format_loc(loc) {
   return loc.filename + ":" + loc.pos;
}

function get_childs(args) {
   return Array.prototype.slice.call(args, 1, args.length);
}

function check_signal(signal) {
   return signal != undefined && signal instanceof reactive.Signal;
}

function fatal(msg, attrs) {
   console.log("*** ERROR at", format_loc(attrs["%location"]), "***");
   console.log("   ", msg);
   process.exit(1);
}

function REACTIVEMACHINE(attrs, raw_childs) {
   console.log(raw_childs);
   console.log(attrs);
   var childs = get_childs(raw_childs);
   var machine = null;

   console.log(childs);
   if (childs.length != 1)
      fatal("ReactiveMachine must have exactly one child.", attrs);
   machine = new reactive.ReactiveMachine(child[0]);
   machine.loc = format_loc(attrs["%location"]);
   return machine;
}

function EMIT(attrs) {
   var signal = attrs.signal;
   var emit = null

   if (!check_signal(signal))
      fatal("Emit must have a signal argument.", attrs);
   emit = new reactive.Emit(attrs.signal);
   emit.loc = format_loc(attrs["%location"]);
   return emit;
}

function NOTHING(attrs) {
   var nothing = new reactive.Nothing();
   nothing.loc = format_loc(attrs["%location"]);
   return nothing;
}

function PAUSE(attrs) {
   var pause = new reactive.Pause();
   pause.loc = format_loc(attrs["%location"]);
   return pause;
}

function HALT(attrs) {
   var halt = new reactive.Halt();
   halt.loc = format_loc(attrs["%location"]);
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
   present.loc = format_loc(attrs["%location"]);
   return present;
}

function AWAIT(attrs) {
   var signal = attrs.signal;
   var await = null;

   if (!check_signal(signal))
      fatal("Await must have a signal argument.", attrs);
   await = new reactive.Await(signal);
   await.loc = format_loc(attrs["%location"]);
   return await;
}

function PARALLEL(attrs, raw_childs) {
   var childs = get_childs(raw_childs);
   var parallel = null;

   if (childs != 2)
      fatal("Parallel must have exactly two childs.", attrs);
   parallel = new reactive.Parallel(childs[0], child[1]);
   parallel.loc = format_loc(attrs["%location"]);
   return parallel;
}

function ABORT(attrs, raw_childs) {
   var childs = get_childs(raw_childs);
   var signal = attrs.signal;
   var abort = null;

   if (!check_signal(signal))
      fatal("Abort must have a signal argument.", attrs);
   if (childs.length < 1)
      fatal("Abort must have exactly one child.", attrs);
   abort = new reactive.Abort(signal, childs[0]);
   abort.loc = format_loc(attrs["%location"]);
   return abort;
}

function LOOP(attrs, raw_childs) {
}

function SEQUENCE(attrs, raw_childs) {
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
