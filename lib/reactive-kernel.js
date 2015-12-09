"use hopscript"

var ast = require("./ast.js");

var DEBUG_NONE = 0;
var DEBUG_EMIT = 1;
var DEBUG_PAUSE = 1 << 1;
var DEBUG_PRESENT = 1 << 2;
var DEBUG_SEQUENCE = 1 << 3;
var DEBUG_LOOP = 1 << 4;
var DEBUG_ABORT = 1 << 5;
var DEBUG_HALT = 1 << 6;
var DEBUG_AWAIT = 1 << 7;
var DEBUG_PARALLEL = 1 << 8;
var DEBUG_SUSPEND = 1 << 9;
var DEBUG_REACT = 1 << 10;
var DEBUG_TRAP = 1 << 11;
var DEBUG_IF = 1 << 12;
var DEBUG_ALL = 0xFFFFFFFF;
var DEBUG_FLAGS = DEBUG_NONE;

// DEBUG_FLAGS |= DEBUG_REACT;
// DEBUG_FLAGS |= DEBUG_PARALLEL;
// DEBUG_FLAGS |= DEBUG_ABORT;
// DEBUG_FLAGS |= DEBUG_AWAIT;
// DEBUG_FLAGS |= DEBUG_LOOP;
// DEBUG_FLAGS |= DEBUG_PRESENT;
// DEBUG_FLAGS |= DEBUG_PAUSE;
// DEBUG_FLAGS |= DEBUG_HALT;
// DEBUG_FLAGS |= DEBUG_SUSPEND;
// DEBUG_FLAGS |= DEBUG_SEQUENCE;
// DEBUG_FLAGS |= DEBUG_TRAP;

var COMBINED_VALUED_TYPES = { "number": [ "+", "*" ],
			      "boolean": [ "and", "or" ] };
var current_control = {};

function Signal(name, machine=undefined) {
   this.name = name;
   this.set = false;
   this.pre_set = false;
   this.machine = machine;

   /* Must stay empty for input/local signals */
   this.react_functions = [];
}

Signal.prototype.reset = function() {
   this.pre_set = this.set;
   this.set = false;
}

Signal.prototype.will_change_in_react = function() {
   var emitters = this.machine.signals_emitters[this.name];
   return emitters == undefined ? false : emitters > 0;
}

Signal.prototype.decr_emitters = function() {
   if (this.machine.signals_emitters[this.name] == undefined)
      this.machine.signals_emitters[this.name] = 1;
   this.machine.signals_emitters[this.name]--;
}

Signal.prototype.is_set_ready = function(pre) {
   return pre || this.set || !this.will_change_in_react();
}

Signal.prototype.get_set = function(pre=false) {
   if (pre)
      return this.pre_set;

   if (!this.is_set_ready(false))
      fatal_error("Causality error on Signal::set " + this.name,
		  current_control.loc);
   return this.set;
}

Signal.prototype.get_pre = function() {
   return this.get_set(true)
}

Signal.prototype.set_set = function() {
   this.set = true;
}

/* Actually usefull only for output signal (and mabye input/output signals) */
Signal.prototype.apply_react_functions = function() {
   this.react_functions.forEach(function(func, id, arr) {
      func.call(this, { machine: this.machine.machine_name,
		        signal: this.name });
   }, this)
}

function ValuedSignal(name,
		      type,
		      init_value,
		      combine_with,
		      machine) {
   if ((init_value != undefined || combine_with != undefined)
       && type == undefined)
      fatal_error("Signal " + signal_name + " must be typed.",
		  current_control.loc);

   Signal.call(this, name, machine);
   this.value = init_value;
   this.is_value_init = init_value != undefined;
   this.pre_value = init_value;
   this.is_pre_value_init = init_value != undefined;
   this.type = type;
   this.combine_with = combine_with; /* undefined if single */
   this.has_init_value = init_value != undefined;
   this.init_value = init_value;
   this.single = combine_with == undefined; /* only one write by react */
   this.set_value_in_current_react = false;
   this.check_definition();
   if (this.has_init_value)
      this.check_type(init_value);
}

ValuedSignal.prototype = new Signal(undefined, undefined);

ValuedSignal.prototype.is_value_ready = function(pre) {
   return (pre
	   || (this.set && !this.will_change_in_react)
	   || this.will_change_in_react);
}

ValuedSignal.prototype.get_value = function(pre=false) {
   if (pre) {
      if (!this.is_pre_value_init)
	 fatal_error("Signal " + this.name + " is not initialized when reading "
		     + "pre_value.", current_control.loc);
      return this.pre_value;
   }

   if (!this.is_value_init)
      fatal_error("Signal " + this.name + " is not initialized when reading.",
		  current_control.loc);
   if (!this.is_value_ready(false))
      fatal_error("Causality error on ValuedSignal::value " + this.name,
		  current_control.loc);
   return this.value;
}

ValuedSignal.prototype.get_pre_value = function() {
   return this.get_value(true);
}

ValuedSignal.prototype.set_value = function(value) {
   if (this.single && this.set_value_in_current_react)
      fatal_error("Multiple writes on single signal " + this.name,
		  current_control.loc);

   this.check_type(value);
   this.is_value_init = true;
   if (this.single || !this.set_value_in_current_react) {
      this.value = value;
   } else {
      var combine = this.combine_with;

      if (combine == "and")
	 combine = "&&"
      else if (combine == "or")
	 combine = "||"

      var eval_buff = this.value + combine + value;
      this.value = eval(eval_buff);
   }
   this.set_value_in_current_react = true;
   this.set_set();
}

ValuedSignal.prototype.reset = function() {
   Signal.prototype.reset.call(this);
   this.pre_value = this.value;
   this.is_pre_value_init = true;
   this.set_value_in_current_react = false;
}

ValuedSignal.prototype.check_type = function(value) {
   if (typeof(value) != this.type)
      fatal_error("Wrong type of value given to signal " + this.name
		  + " [ expected:" + this.type
		  + " given:" + typeof(value) + " ]",
		  current_control.loc);
}

ValuedSignal.prototype.check_definition = function() {
   if (this.combine_with != undefined)
      check_valued_signal_definition(this.type, this.combine_with, this.name);
}

/* Actually usefull only for output signal (and mabye input/output signals) */
ValuedSignal.prototype.apply_react_functions = function() {
   this.react_functions.forEach(function(func, id, arr) {
      func.call(this, { machine: this.machine.machine_name,
		        signal: this.name,
		        value: this.get_value() });
   }, this)
}

/* It can be use in ast.js, when the local signal is not created yet */

function check_valued_signal_definition(type, combine_with, name) {
   if (COMBINED_VALUED_TYPES[type] == undefined)
      fatal_error("Wrong type on valued signal " + name);

   if (combine_with != undefined)
      if (COMBINED_VALUED_TYPES[type].indexOf(combine_with) == -1)
	 fatal_error("Wrong combinaison function on valued signal "
		     + name);
}


/* A wire connect two statements.
   The `set` attribute, contains the status (1 or 0) of the wire */

function Wire(stmt_in, stmt_out) {
   this.stmt_in = stmt_in;
   this.stmt_out = stmt_out;
   this.set = false;
}

/* Root class of any kernel statement. Theses properties representes the
   connections to others circuits */

function Statement(machine, loc, name) {
   this.name = name;
   this.debug_code;
   this.loc = loc;
   this.machine = machine;
   this.go = null;
   this.res = null;
   this.susp = null;
   this.kill = null;
   this.sel = null;

   /* Any statement has at least two terminaison branch: K0 and K1 */
   this.k = [null, null];
}

/* Standard terminaison of run(): true
   Blocked on signal test: false */

Statement.prototype.run = function() {
   current_control = this;
   return true;
}

/* Generic debug function can be called after the execution of a statement */

Statement.prototype.debug = function() {
   var return_codes = "";

   for (var i in this.k) {
      return_codes += "K" + i + ":" + this.k[i].set;
      if (i - 1 < this.k.length)
	 return_codes += " ";
   }

   console.log("*** DEBUG", this.name, "at", this.loc, "*** \n   ",
	       "GO:" + this.go.set,
	       "RES:" + this.res.set,
	       "SUSP:" + this.susp.set,
	       "KILL:" + this.kill.set,
	       "SEL:" + this.sel.set,
	       return_codes);
}

/* Visitor pattern for some stuff (init signals at the end of
   computation, sorting, etc) */

Statement.prototype.accept = function(visitor) {
   visitor.visit(this);
}

Statement.prototype.assert_completion_code = function() {
   var set = false;

   for (var i in this.k)
      if (set && this.k[i].set)
	 fatal_error("more that one completion code in " + this.name,
		     this.loc);
      else if (this.k[i].set)
	 set = true;
}

/* Return a blank ast node (not attached to any reactive machine, without
   any compilation task make on it).
   Usefull for print AST of program, and for program composition (RUN) */

Statement.prototype.get_ast_node = function() {
   fatal_error("get_ast_node must be implemented", this.loc);
}

/* Root class of any circuit (construction with statements, or others
   circuits.
   `X_in` represent the connections of the circuit with subcircuit.
   The relations between in/out wires (booleans doors, etc.) which are
   specifics to the circuit, are represented in the code of `run` functions. */

function Circuit(machine, loc, name, subcircuit) {
   Statement.call(this, machine, loc, name);

   if (subcircuit != undefined && subcircuit != null)
      this.build_wires(subcircuit);
}

Circuit.prototype = new Statement(undefined, undefined, undefined);

Circuit.prototype.accept = function(visitor) {
   visitor.visit(this);
   this.go_in.stmt_out.accept(visitor);
}

Circuit.prototype.build_wires = function(circuit) {
   this.build_in_wires(circuit);
   this.build_out_wires(circuit);
}

Circuit.prototype.build_in_wires = function(circuit) {
   this.go_in = circuit.go = new Wire(this, circuit);
   this.res_in = circuit.res = new Wire(this, circuit);
   this.susp_in = circuit.susp = new Wire(this, circuit);
   this.kill_in = circuit.kill = new Wire(this, circuit);
}

Circuit.prototype.build_out_wires = function(circuit) {
   this.sel_in = circuit.sel = new Wire(circuit, this);
   this.k_in = [];
   for (var i in circuit.k) {
      if (this.k[i] == undefined)
	 this.k[i] = null;
      this.k_in[i] = circuit.k[i] = new Wire(circuit, this);
   }
}

Circuit.prototype.run = function() {
   this.set_subcircuit_in();
   if (!this.go_in.stmt_out.run())
      return false;
   this.set_subcircuit_out();
   if (DEBUG_FLAGS & this.debug_code)
      this.debug();
   this.assert_completion_code();
   return true;
}

Circuit.prototype.set_subcircuit_in = function() {
   this.go_in.set = this.go.set;
   this.res_in.set = this.res.set;
   this.susp.set = this.susp.set;
   this.kill_in.set = this.kill.set;
}

Circuit.prototype.set_subcircuit_out = function() {
   this.sel.set = this.sel_in.set;
   for (var i in this.k)
      this.k[i].set = this.k_in[i].set;
}

/* Circuits with more than one nested subcircuit */

function MultipleCircuit(machine, loc, name, subcircuits) {
   Circuit.call(this, machine, loc, name, subcircuits);
}

MultipleCircuit.prototype = new Circuit(undefined, undefined, undefined,
					undefined);

MultipleCircuit.prototype.build_wires = function(subcircuits) {
   this.go_in = [];
   this.res_in = [];
   this.susp_in = [];
   this.kill_in = [];
   this.sel_in = [];
   this.k_in = [];

   for (var i in subcircuits) {
      this.build_in_wires(subcircuits[i], i);
      this.build_out_wires(subcircuits[i], i);
   }
}

MultipleCircuit.prototype.build_in_wires = function(circuit, i) {
   this.go_in[i] = circuit.go = new Wire(this, circuit);
   this.res_in[i] = circuit.res = new Wire(this, circuit);
   this.susp_in[i] = circuit.susp = new Wire(this, circuit);
   this.kill_in[i] = circuit.kill = new Wire(this, circuit);
}

MultipleCircuit.prototype.build_out_wires = function(circuit, j) {
   this.sel_in[j] = circuit.sel = new Wire(circuit, this);
   for (var i in circuit.k) {
      if (this.k_in[i] == undefined)
	 this.k_in[i] = [];
      if (this.k[i] == undefined)
	 this.k[i] = null;
      this.k_in[i][j] = circuit.k[i] = new Wire(circuit, this);
   }
}

MultipleCircuit.prototype.accept = function(visitor) {
   visitor.visit(this);
   for (var i in this.go_in)
      this.go_in[i].stmt_out.accept(visitor);
}

function ReactiveMachine(loc, machine_name, debug) {
   Circuit.call(this, null, loc, "REACTIVE_MACHINE", null);
   this.seq = -1;
   this.react_in_progress;
   this.boot_reg = true;
   this.machine_name = machine_name;
   this.reincarnation_lvl = 0;
   this.local_signals = {};
   this.input_signals = {};
   this.output_signals = {};
   this.debug_input_list = "";

   /* number of emitters of a signal for the current reaction */
   this.signals_emitters = {};

   /* null if no auto reaction enabled, otherwise, _idleTimeout is the
      interval between two reactions (in milliseconds) */
   this.auto_react = null;

   if (debug)
      DEBUG_FLAGS |= DEBUG_REACT;
}

ReactiveMachine.prototype = new Circuit(undefined, undefined, undefined,
					undefined);

ReactiveMachine.prototype.react = function(seq) {
   var go = false;

   if (seq <= this.seq || this.react_in_progress)
      return;
   this.react_in_progress = true;

   if (this.boot_reg) {
      this.go_in.stmt_out.accept(new ResetRegisterVisitor());
      go = this.boot_reg;
      this.boot_reg = false;
   }
   this.go_in.stmt_out.accept(new CountSignalEmitters(this));

   this.go_in.set = go;
   this.res_in.set = true;
   this.susp_in.set = false;
   this.kill_in.set = false;

   if (!this.go_in.stmt_out.run())
      fatal_error("sequential causality", current_control.loc);

   if (DEBUG_FLAGS & DEBUG_REACT) {
      var buf_in = this.machine_name + ">";
      var buf_out = "--- Output:";

      if (this.debug_input_list != "") {
	 buf_in += this.debug_input_list + ";";
	 this.debug_input_list = "";
      } else {
	 buf_in += " ;";
      }

      for (var i in this.output_signals) {
	 var sig = this.output_signals[i];

	 if (sig.set) {
	    buf_out += " " + sig.name;
	    if (sig instanceof ValuedSignal)
	       buf_out += "(" + sig.value + ")";
	 }
      }
      console.log(buf_in);
      console.log(buf_out);
   }

   for (var i in this.input_signals)
      this.input_signals[i].reset();

   for (var i in this.output_signals) {
      var sig = this.output_signals[i];

      if (sig.get_set())
	 sig.apply_react_functions()
      sig.reset();
   }

   for (var i in this.local_signals)
      for (var j in this.local_signals[i])
	 this.local_signals[i][j].reset();

   this.seq++;
   this.react_in_progress = false;
   this.reset_react = false;
}

ReactiveMachine.prototype.reset = function() {
   this.boot_reg = true;

   if (DEBUG_FLAGS & DEBUG_REACT) {
      console.log(this.machine_name + "> !reset;");
      console.log("--- Automaton", this.machine_name, "reset");
   }
}

ReactiveMachine.prototype.run = function() {
   fatal_error("call run() on ReactiveMachine", this.loc);
}

ReactiveMachine.prototype.get_signal = function(name) {
   if (this.local_signals[name]) {
      var i = this.reincarnation_lvl > this.local_signals[name].length - 1 ?
	  this.local_signals[name].length - 1 : this.reincarnation_lvl;
      return this.local_signals[name][i];
   }
   if (this.input_signals[name])
      return this.input_signals[name];
   if (this.output_signals[name])
      return this.output_signals[name];
   fatal_error("Unkown signal " + name, current_control.loc);
}

ReactiveMachine.prototype.halt = function() {
   if (this.auto_react == null)
      return;
   clearTimeout(this.auto_react);
   this.auto_react = null;
}

ReactiveMachine.prototype.auto_start = function(raw_ms) {
   var ms = parseInt(raw_ms);

   if (isNaN(ms) || ms <= 0 || this.auto_react != null)
      return;
   this.auto_start_routine(ms);
}

ReactiveMachine.prototype.auto_start_routine = function(ms) {
   this.halt();
   this.auto_react = setTimeout(function(machine){
      machine.react(machine.seq + 1);
      machine.auto_start_routine(ms)
   }, ms, this);
}

ReactiveMachine.prototype.set_input = function(name, value=undefined) {
   var sig = this.input_signals[name];
   var buf_debug = " ";

   if (this.react_in_progress)
      return;
   if (sig == undefined)
      fatal_error("Can't find input signal named " + name);
   sig.set_set();
   buf_debug += name;
   if (sig instanceof ValuedSignal) {
      if (value != undefined) {
	 sig.set_value(value);
	 buf_debug += "(" + value + ")";
      }
      else if (!sig.is_value_init)
	 fatal_error("Can't set non initialized valued signal "
		     + name + " without value");
   }
   if (this.debug)
      this.debug_input_list += buf_debug;
}

/* Return a JSON object of the internal state of the machine between two
   reactions. This object can be reuse later (on new execution of the global
   JS program), giving it the restore method */

function SaveRestoreRegisterVisitor(restore, state_list) {
   this.restore = restore
   this.state_list = state_list;
}

SaveRestoreRegisterVisitor.prototype.visit = function(stmt) {
   if (stmt instanceof Pause) {
      if (this.restore)
	 stmt.reg = this.state_list.pop()
      else
	 this.state_list.push(stmt.reg);
   }
}

ReactiveMachine.prototype.save = function() {
   function save_signal(sig) {
      var ret = {};

      ret.pre_set = sig.pre_set;
      if (sig instanceof ValuedSignal) {
	 ret.valued = true;
	 ret.value = sig.value;
	 ret.is_value_init = sig.is_value_init;
	 ret.pre_value = sig.pre_value;
	 ret.is_pre_value_init = sig.is_pre_value_init;
      }
      return ret;
   }

   var state = { boot_reg: false,
		 registers: [],
		 signals: [] };

   for (var s in this.input_signals)
      state.signals[s] = save_signal(this.input_signals[s]);
   for (var s in this.output_signals)
      state.signals[s] = save_signal(this.output_signals[s]);
   for (var s in this.local_signals) {
      state.signals[s] = [];
      for (var l in this.local_signals[s])
	 state.signals[s][l] = save_signal(this.local_signals[s][l]);
   }
   this.go_in.stmt_out.accept(new SaveRestoreRegisterVisitor(false,
							     state.registers));
   state.registers.reverse();
   state.boot_reg = this.boot_reg;
   return state;
}

ReactiveMachine.prototype.restore = function(state) {
   function restore_signal(sig, init) {
      sig.pre_set = init.pre_set;
      if (init.valued) {
	 sig.value = init.pre_value;
	 sig.is_value_init = init.is_value_init;
	 sig.pre_value = init.pre_value;
	 sig.is_pre_value_init = init.is_pre_value_init;
      }
   }

   for (var s in this.input_signals)
      restore_signal(this.input_signals[s], state.signals[s]);
   for (var s in this.output_signals)
      restore_signal(this.output_signals[s], state.signals[s]);
   for (var s in this.local_signals)
      for (var l in this.local_signals[s])
	 restore_signal(this.local_signals[s][l], state.signals[s][l]);
   this.go_in.stmt_out.accept(new SaveRestoreRegisterVisitor(true,
							     state.registers));
   this.boot_reg = state.boot_reg;
}

ReactiveMachine.prototype.addEventListener = function(sig, callback) {
   var signal;

   if (!(callback instanceof Function))
      fatal_error("ReactiveMachine.addEventListener: listener argument "
		  + "must be a function.");
   signal = this.output_signals[sig];
   if (signal == undefined)
      fatal_error("ReactiveMachine.addEventListener: output signal "
		  + sig + " not found.");
   if (signal.react_functions.indexOf(callback) == -1)
      signal.react_functions.push(callback);
}

ReactiveMachine.prototype.removeEventListener = function(sig, callback) {
   var signal = this.output_signals[sig];

   if (signal != undefined) {
      var arr = signal.react_functions;
      var i = arr.indexOf(callback);

      if (i > -1)
	 arr.splice(i, 1);
   } else
      fatal_error("ReactiveMachine.removeEventListener: output signal "
		  + sig + " not found.");
}

/* Usefull for Emit and If statements
   Return an array of arguments, with values if it's a signal accessors, false
   if a signal is not ready */

function get_expr_list(raw_exprs) {
   function get_expr(expr) {
      var ret = {
	 ready: true,
	 value: null
      };

      if (expr instanceof SignalAccessor) {
	 if (!expr.get())
	    ret.ready = false;
	 else
	    ret.value = expr.value;
      } else {
	 ret.value = expr;
      }

      return ret;
   }

   var args = [];
   var arg;

   for (var e in raw_exprs) {
      arg = get_expr(raw_exprs[e]);
      if (!arg.ready)
	 return false;
      args.push(arg.value)
   }
   return args;
}

/* Emit - Figure 11.4 page 116 */

function Emit(machine, loc, signal_name, func=undefined, exprs=undefined) {
   Statement.call(this, machine, loc, "EMIT");
   this.debug_code = DEBUG_EMIT;
   this.signal_name = signal_name;
   this.func = func;
   this.exprs = exprs;
   this.blocked = false;

   if (func != undefined) {
      if (!(func instanceof Function))
	 fatal_error("func attribute of Emit must be a function.", loc);
      if (exprs.length != func.length)
	 fatal_error("Arity error [func:" + func.length + " exprs:"
		     + exprs.length + "]", loc);
   }
}

Emit.prototype = new Statement(undefined, undefined, undefined);

Emit.prototype.run = function() {
   var signal = this.machine.get_signal(this.signal_name);

   if (!this.blocked)
      signal.decr_emitters();
   else
      this.blocked = false;

   this.k[0].set = this.go.set;
   if (this.go.set) {
      var args = get_expr_list(this.exprs);

      /* With JS, [] == false.................. well done! So, use === */
      if (args === false) {
	 this.blocked = true;
	 return false;
      }

      if (this.func != undefined) {
	 signal.set_value(this.func.apply(this, args));
      } else if (args.length == 1) {
	 signal.set_value(args[0]);
      }

      signal.set_set();
   }

   if (DEBUG_FLAGS & DEBUG_EMIT)
      this.debug();
   return true;
}



Emit.prototype.get_ast_node = function() {
   return new ast.Emit(this.loc, this.signal_name, this.func, this.exprs);
}

/* Pause - Figure 11.3 page 115 */

function Pause(machine, loc) {
   Statement.call(this, machine, loc, "PAUSE");
   this.debug_code = DEBUG_PAUSE;
   this.reg = false;
   this.k0_on_depth = false;
}

Pause.prototype = new Statement(undefined, undefined, undefined)

Pause.prototype.run = function() {
   this.k[0].set = this.reg && this.res.set && !this.kill.set;
   this.k[1].set = this.go.set;
   this.reg = (this.go.set || (this.susp.set && this.reg)) && !this.kill.set;
   this.sel.set = this.reg;

   if (this.k0_on_depth && this.k[0].set)
      this.machine.reincarnation_lvl++;

   if (DEBUG_FLAGS & DEBUG_PAUSE)
      this.debug();
   this.assert_completion_code();
   return true;
}

Pause.prototype.get_ast_node = function() {
   return new ast.Pause(this.loc)
}

/* Present test - Figure 11.5 page 117
   X_in[0] represent X_in of then branch
   X_in[1] represent X_in of else branch
   It's allowed to have only a then branch */

function Present(machine,
		 loc,
		 signal_name,
		 test_pre,
		 then_branch,
		 else_branch) {
   /* should be removed now, since it's done at ast level */
   if (!(else_branch instanceof Statement))
      else_branch = new Nothing();

   MultipleCircuit.call(this, machine, loc, "PRESENT",
			[then_branch, else_branch]);
   this.debug_code = DEBUG_PRESENT;
   this.signal_name = signal_name;
   this.test_pre = test_pre;

   /* set to 0 or 1 is the branch 0|1 was blocked on signal test */
   this.blocked = -1;
}

Present.prototype = new MultipleCircuit(undefined, undefined, undefined,
				       undefined);

Present.prototype.run = function() {
   var sig_name = this.signal_name;
   var branch = 0;
   var signal = this.machine.get_signal(sig_name);
   var signal_set = false;

   if (this.blocked == -1) {
      if (this.go.set) {
	 if (!signal.is_set_ready(this.test_pre))
	    return false;
	 else
	    signal_set = signal.get_set(this.test_pre);
      }

      this.go_in[0].set = this.go.set && signal_set;
      this.go_in[1].set = this.go.set && !signal_set;

      /* initialize states of k outputs of present from the previous reaction */
      for (var i in this.k)
	 this.k[i].set = false;
   } else {
      branch = this.blocked;
      this.blocked = -1;
   }

   for (; branch < 2; branch++) {
      this.res_in[branch].set = this.res.set;
      this.susp_in[branch].set = this.susp.set;
      this.kill_in[branch].set = this.kill.set;

      if (!this.go_in[branch].stmt_out.run()) {
	 this.blocked = branch;
	 return false;
      }

      this.sel.set = this.sel.set || this.sel_in[branch].set;
      for (var i in this.k_in)
	 this.k[i].set = (this.k[i].set ||
			  (this.k_in[i][branch] == undefined ?
			   false : this.k_in[i][branch].set));
   }

   if (DEBUG_FLAGS & DEBUG_PRESENT)
      this.debug();
   return true;
}

Present.prototype.get_ast_node = function() {
   return new ast.Present(this.loc,
			  this.signal_name,
			  this.test_pre,
			  [ this.go_in[0].stmt_out.get_ast_node(),
			    this.go_in[1].stmt_out.get_ast_node() ]);
}

function If(machine, loc, func, exprs, then_branch, else_branch) {
   MultipleCircuit.call(this, machine, loc, "IF", [then_branch, else_branch]);
   this.debug_code = DEBUG_IF;
   this.func = func;
   this.exprs = exprs;

   if (func != undefined) {
      if (!(func instanceof Function))
	 fatal_error("func attribute of If must be a function.", loc);
      if (exprs.length != func.length)
	 fatal_error("Arity error [func:" + func.length + " exprs:"
		     + exprs.length + "]", loc);
   }

   /* set to 0 or 1 is the branch 0|1 was blocked on signal test */
   this.blocked = -1;
}

If.prototype = new MultipleCircuit(undefined, undefined, undefined, undefined);

If.prototype.run = function() {
   var branch = 0;

   if (this.blocked == -1) {
      if (this.go.set) {
	 var exprs = get_expr_list(this.exprs)
	 if (exprs === false) {
	    return false;
	 } else {
	    var res;

	    if (this.func != undefined)
	       res = this.func.apply(this, exprs);
	    else
	       res = exprs[0]
	    if (typeof(res) != "boolean")
	       fatal_error("If statement expression must return a boolean.",
			   current_control.loc);
	 }
      }

      this.go_in[0].set = this.go.set && res && !this.not;
      this.go_in[1].set = this.go.set
	 &&((!res && !this.not) || (res && this.not));

      /* initialize states of k outputs of if from the previous reaction */
      for (var i in this.k)
	 this.k[i].set = false;
   } else {
      branch = this.blocked;
      this.blocked = -1;
   }

   for (; branch < 2; branch++) {
      this.res_in[branch].set = this.res.set;
      this.susp_in[branch].set = this.susp.set;
      this.kill_in[branch].set = this.kill.set;

      if (!this.go_in[branch].stmt_out.run()) {
	 this.blocked = branch;
	 return false;
      }

      this.sel.set = this.sel.set || this.sel_in[branch].set;
      for (var i in this.k_in)
	 this.k[i].set = (this.k[i].set ||
			  (this.k_in[i][branch] == undefined ?
			   false : this.k_in[i][branch].set));
   }

   if (DEBUG_FLAGS & DEBUG_IF)
      this.debug();
   return true;
}

If.get_ast_node = function() {
   return new ast.If(this.loc, this.not, this.func, this.exprs,
		     [ this.go_in[0].stmt_out.get_ast_node(),
		       this.go_in[1].stmt_out.get_ast_node() ]);
}

/* Sequence - Figure 11.8 page 120
   It can take either a variable list of argument, or only one argument
   which is an array of statements */

function Sequence(machine, loc, subcircuits) {
   this.seq_len = subcircuits.length;
   this.blocked = -1 /* same semantic that present blocked attribute */
   MultipleCircuit.call(this, machine, loc, "SEQUENCE", subcircuits);
   this.debug_code = DEBUG_SEQUENCE;
}

Sequence.prototype = new MultipleCircuit(undefined, undefined, undefined,
					 undefined);

Sequence.prototype.build_wires = function(subcircuits) {
   this.go_in = [];
   this.res_in = [];
   this.susp_in = [];
   this.kill_in = [];
   this.sel_in = [];
   this.k_in = [[], []];

   for (var i = 0; i < this.seq_len; i++) {
      var circuit_cur = subcircuits[i];

      if (i == 0) {
   	 this.go_in[i] = circuit_cur.go = new Wire(this, circuit_cur);
      } else {
   	 var w = new Wire(subcircuits[i - 1], circuit_cur);

   	 this.go_in[i] = w;
	 this.k_in[0][i - 1] = w;
   	 subcircuits[i - 1].k[0] = w;
   	 circuit_cur.go = w;
      }
      this.res_in[i] = circuit_cur.res = new Wire(this, circuit_cur);
      this.susp_in[i] = circuit_cur.susp = new Wire(this, circuit_cur);
      this.kill_in[i] = circuit_cur.kill = new Wire(this, circuit_cur);
      this.sel_in[i] = circuit_cur.sel = new Wire(circuit_cur, this);

      for (var j = 1; j < circuit_cur.k.length; j++) {
   	 if (this.k_in[j] == undefined) {
   	    this.k_in[j] = [];
   	    this.k[j] = null;
   	 }
   	 this.k_in[j][i] = circuit_cur.k[j] = new Wire(circuit_cur, this);
      }
   }

   var last_id = this.seq_len -1;
   this.k_in[0][last_id] = subcircuits[last_id].k[0] =
      new Wire(subcircuits[last_id], this);
}

Sequence.prototype.run = function() {
   var s = 0;

   if (this.blocked == -1) {
      /* init circuits outputs */
      this.sel.set = false;
      for (var i in this.k)
	 this.k[i].set = false;
   } else {
      s = this.blocked;
      this.blocked = -1;
   }

   for (; s < this.seq_len; s++) {
      /* init subcircuits inputs */
      this.go_in[s].set = s == 0 ? this.go.set : this.k_in[0][s - 1].set;
      this.res_in[s].set = this.res.set;
      this.susp_in[s].set = this.susp.set;
      this.kill_in[s].set = this.kill.set;

      if (!this.go_in[s].stmt_out.run()) {
	 this.blocked = s;
	 return false;
      }
   }

   /* boolean OR of return codes > 0 and sel
      `i` is an id of statement
      `j` is an id of return code */
   for (var i = 0; i < this.seq_len; i++) {
      this.sel.set = this.sel.set || this.sel_in[i].set;
      for (var j = 1; j < this.k_in.length; j++) {
	 if (this.k_in[j][i] != undefined)
	    this.k[j].set = this.k[j].set || this.k_in[j][i].set;
      }
   }

   this.k[0].set = this.k_in[0][this.seq_len - 1].set;

   if (DEBUG_FLAGS & DEBUG_SEQUENCE)
      this.debug();
   return true;
}

Sequence.prototype.get_ast_node = function() {
   var subcircuits = [];

   for (var i in this.go_in)
      subcircuits[i] = this.go_in[i].stmt_out.get_ast_node();
   return new ast.Sequence(this.loc, subcircuits);
}

/* Loop - Figure 11.9 page 121 */

function Loop(machine, loc, circuit) {
   Circuit.call(this, machine, loc, "LOOP", circuit);
   this.debug_code = DEBUG_LOOP;
}

Loop.prototype = new Circuit(undefined, undefined, undefined,
			     undefined);

Loop.prototype.run = function() {
   var stop = false;

   this.res_in.set = this.res.set;
   this.susp_in.set = this.susp.set;
   this.kill_in.set = this.kill.set;

   while (!stop) {
      this.go_in.set = this.go.set || this.k_in[0].set;
      if (!this.go_in.stmt_out.run())
	 return false;
      stop = !this.k_in[0].set;

      if (!stop && this.machine.reincarnation_lvl > 0) {
	 this.machine.reincarnation_lvl--;
	 this.accept(new ResetLocalSignalVisitor());
      }
   }

   this.sel.set = this.sel_in.set;
   this.k[0].set = false;
   for (var i = 1; i < this.k_in.length; i++)
      this.k[i].set = this.k_in[i].set;

   if (DEBUG_FLAGS & DEBUG_LOOP)
      this.debug();

   return true;
}

Loop.prototype.get_ast_node = function() {
   return new ast.Loop(this.loc, this.go_in.stmt_out.get_ast_node());
}

/* LoopEach */

function LoopEach(a,b,c,d,e,f) {}

/* Abort - Figure 11.7 page 120 */

function Abort(machine, loc, circuit, signal_name, test_pre, count) {
   Circuit.call(this, machine, loc, "ABORT", circuit);
   this.count = count;
   this.current_count = 0;
   this.debug_code = DEBUG_ABORT;
   this.signal_name = signal_name;
   this.test_pre = test_pre;
}

Abort.prototype = new Circuit(undefined, undefined, undefined,
			      undefined);

Abort.prototype.run = function() {
   var sig_name = this.signal_name;
   var signal = this.machine.get_signal(sig_name);
   var signal_set;

   if (!signal.is_set_ready(this.test_pre))
      return false;

   signal_set = signal.get_set(this.test_pre);
   if (signal_set) {
      this.current_count++;
      if (this.current_count < this.count) {
	 signal_set = false;
      } else {
	 this.current_count = -1;
      }
   }

   this.go_in.set = this.go.set;
   this.res_in.set = this.res.set && this.sel.set && !signal_set;
   this.susp_in.set = this.susp.set;
   this.kill_in.set = this.kill.set;

   if (!this.go_in.stmt_out.run())
      return false;

   var new_sel = this.sel_in.set;

   this.k[0].set = ((this.res.set &&
		     this.sel.set &&
		     signal_set) ||
		    this.k_in[0].set);
   this.sel.set = new_sel;
   for (var i = 1; i < this.k_in.length; i++)
      this.k[i].set = this.k_in[i].set;

   if (DEBUG_FLAGS & DEBUG_ABORT)
      this.debug();
   this.assert_completion_code();
   return true;
}

Abort.prototype.get_ast_node = function() {
   return new ast.Abort(this.loc,
			this.signal_name,
			this.test_pre,
			this.count,
			this.go_in.stmt_out.get_ast_node());
}

/* Await */

function Await(machine, loc, signal_name, test_pre, count) {
   this.signal_name = signal_name;
   this.count = count;
   var abort = new Abort(machine,
			 loc,
			 new Halt(machine, loc),
			 this.signal_name,
			 this.test_pre,
			 this.count);
   Circuit.call(this, machine, loc, "AWAIT", abort);
   this.debug_code = DEBUG_AWAIT;
}

Await.prototype = new Circuit(undefined, undefined, undefined,
			      undefined);

Await.prototype.get_ast_node = function() {
   return new ast.Await(this.loc, this.signal_name, this.test_pre, this.count)
}

/* Halt */

function Halt(machine, loc) {
   var halt = new Loop(machine, loc, new Pause(machine, loc));
   Circuit.call(this, machine, loc, "HALT", halt);
   this.debug_code = DEBUG_HALT;
}

Halt.prototype = new Circuit(undefined, undefined, undefined,
			     undefined);

Halt.prototype.get_ast_node = function() {
   return new ast.Halt(this.loc);
}

/* Parallel - Figure 11.10 page 122 */

function Parallel(machine, loc, branch1, branch2) {
   MultipleCircuit.call(this, machine, loc, "PARALLEL", [branch1, branch2]);
   this.debug_code = DEBUG_PARALLEL;
}

Parallel.prototype = new MultipleCircuit(undefined, undefined, undefined,
					 undefined);

Parallel.prototype.run = function() {
   var lend = false;
   var rend = false;

   this.go_in[0].set = this.go_in[1].set = this.go.set;
   this.res_in[0].set = this.res_in[1].set = this.res.set;
   this.susp_in[0].set = this.susp_in[1].set = this.susp.set;
   this.kill_in[0].set = this.kill_in[1].set = this.kill.set;

   while (!lend || !rend) {
      if (!lend)
	 lend = this.go_in[0].stmt_out.run();
      if (!rend)
      	 rend = this.go_in[1].stmt_out.run();
   }

   this.sel.set = this.sel_in[0].set || this.sel_in[1].set;

   var max_code = -1;
   for (var i in this.k) {
      if (this.k_in[i][0] != undefined) {
	 if (this.k_in[i][1] != undefined) {
	    if (this.k_in[i][0].set || this.k_in[i][1].set)
   	       max_code = parseInt(i);
	 } else {
	    if (this.k_in[i][0].set)
	       max_code = parseInt(i);
	 }
      } else {
	 if (this.k_in[i][1].set)
	    max_code = parseInt(i);
      }
      this.k[i].set = false;
   }

   if (max_code > -1)
      this.k[max_code].set = true;

   /* propage kill on branches */
   if (max_code > 1) {
      var reset_register = new ResetRegisterVisitor();
      this.go_in[0].stmt_out.accept(reset_register);
      this.go_in[1].stmt_out.accept(reset_register);
   }

   if (DEBUG_FLAGS & DEBUG_PARALLEL)
      this.debug();
   this.assert_completion_code();
   return true;
}

Parallel.prototype.get_ast_node = function() {
   return new ast.Parallel(this.loc,
			   [ this.go_in[0].stmt_out.get_ast_node(),
			     this.go_in[1].stmt_out.get_ast_node() ]);
}

/* Nothing statement */

function Nothing (machine, loc) {
   Statement.call(this, machine, loc, "NOTHING");
}

Nothing.prototype = new Statement(undefined, undefined, undefined);

Nothing.prototype.run = function() {
   this.k[0].set = this.go.set;
   return true;
}

Nothing.prototype.get_ast_node = function() {
   return new ast.Nothing(this.loc);
}

function remove_duplicates(arr) {
   var seen = {};
   var out = [];
   for (var i = 0; i < arr.length; i++)
      if (seen[arr[i]] != 1) {
	 seen[arr[i]] = 1;
	 out.push(arr[i]);
      }
   return out;
}

/* Atom - execute an host function with no arguments */

function Atom(machine, loc, func) {
   Statement.call(this, machine, loc, "ATOM");
   this.func = func;
}

Atom.prototype = new Statement(undefined, undefined, undefined);

Atom.prototype.run = function() {
   this.k[0].set = this.go.set;
   if (this.go.set)
      this.func();
   return true;
}

Atom.prototype.get_ast_node = function() {
   return new ast.Atom(this.loc, this.func);
}

/* Suspend - Figure 11.6 */

function Suspend(machine, loc, circuit, signal_name, test_pre) {
   Circuit.call(this, machine, loc, "SUSPEND", circuit);
   this.debug_code = DEBUG_SUSPEND;
   this.signal_name = signal_name;
   this.test_pre = test_pre;
}

Suspend.prototype = new Circuit(undefined, undefined, undefined,
				undefined);

Suspend.prototype.run = function() {
   var sig_name = this.signal_name;
   var signal = this.machine.get_signal(sig_name);
   var signal_set;

   if (!signal.is_set_ready(this.test_pre))
      return false;

   signal_set = signal.get_set(this.test_pre);
   this.go_in.set = this.go.set;
   this.res_in.set = this.res.set && !signal_set;
   this.susp_in.set = this.susp.set || (this.res.set &&
					this.sel.set &&
					signal_set);
   this.kill_in.set = this.kill.set;

   if (!this.go_in.stmt_out.run())
      return false;

   this.sel.set = this.sel_in.set;
   this.k[0].set = this.k_in[0].set;
   this.k[1].set = ((this.res.set &&
		     this.sel.set &&
		     signal_set) ||
		    this.k_in[1].set);
   for (var i = 2; i < this.k_in.length; i++)
      this.k[i].set = this.k_in[i].set;

   if (DEBUG_FLAGS & DEBUG_SUSPEND)
      this.debug();
   this.assert_completion_code();
   return true;
}

Suspend.prototype.get_ast_node = function() {
   return new ast.Suspend(this.loc,
			  this.signal_name,
			  this.test_pre,
			  this.go_in.stmt_out.get_ast_node());
}

/* Trap/Shift - Figure 11.12/11.13 page 124 */

function Trap(machine, loc, circuit, trap_name) {
   this.trap_name = trap_name;
   Circuit.call(this, machine, loc, "TRAP", circuit);
   this.debug_code = DEBUG_TRAP;
}

Trap.prototype = new Circuit(undefined, undefined, undefined,
			     undefined);

Trap.prototype.build_out_wires = function(circuit) {
   this.sel_in = circuit.sel = new Wire(circuit, this);
   this.k_in = [];
   this.k_in[0] = circuit.k[0] = new Wire(circuit, this);
   this.k_in[1] = circuit.k[1] = new Wire(circuit, this);
   this.k_in[2] = circuit.k[2] = new Wire(circuit, this);
   for (var i = 3; i < circuit.k.length; i++) {
      if (this.k[i - 1] == undefined)
	 this.k[i - 1] = null;
      this.k_in[i] = circuit.k[i] = new Wire(circuit, this);
   }
}

Trap.prototype.run = function() {
   this.go_in.set = this.go.set;
   this.res_in.set = this.res.set;
   this.susp_in.set = this.susp.set;
   this.kill_in.set = this.kill.set

   this.go_in.stmt_out.run();

   this.sel.set = this.sel_in.set;
   this.k[0].set = this.k_in[0].set || this.k_in[2].set;
   this.k[1].set = this.k_in[1].set;
   for (var i = 2; i < this.k.length; i++)
      this.k[i].set = this.k_in[i + 1].set;

   if (DEBUG_FLAGS & DEBUG_TRAP)
      this.debug();
   this.assert_completion_code();
   return true;
}

Trap.prototype.get_ast_node = function() {
   return new ast.Trap(this.loc,
		       this.trap_name,
		       this.go_in.stmt_out.get_ast_node());
}

/* Exit of a trap */

function Exit(machine, loc, trap_name, return_code) {
   Statement.call(this, machine, loc, "EXIT");
   this.trap_name = trap_name;
   this.return_code = return_code;

   for (var i = 2; i <= return_code; i++)
      this.k[i] = null;
}

Exit.prototype = new Statement(undefined, undefined, undefined);

Exit.prototype.run = function() {
   this.k[0].set = false;
   this.k[1].set = false;
   this.k[this.return_code].set = this.go.set;
   return true;
}

Exit.prototype.get_ast_node = function() {
   return new ast.Exit(this.loc, this.trap_name);
}

/* Local signal idenfifier (not instances) which embeded circutis */

function LocalSignalIdentifier(machine,
			       loc,
			       subcircuit,
			       signal_name,
			       type,
			       init_value,
			       combine_with) {
   Circuit.call(this, machine, loc, "LOCALSIGNALIDENTIFIER", subcircuit);
   this.signal_name = signal_name;
   this.type = type;
   this.init_value = init_value;
   this.combine_with = combine_with;
}

LocalSignalIdentifier.prototype = new Circuit(undefined, undefined, undefined,
					      undefined);

LocalSignalIdentifier.prototype.get_ast_node = function() {
   return new ast.LocalSignal(this.loc,
			      this.signal_name,
			      this.go_in.stmt_out.get_ast_node(),
			      this.type,
			      this.init_value,
			      this.combine_with);
}

/* Run statement directly give control to its embedded circuit.
   It's useful to pretty printer and synbolic debugging */

function Run(machine, loc, sigs_assoc, subcircuit) {
   Circuit.call(this, machine, loc, "RUN", subcircuit);
   this.sigs_assoc = sigs_assoc;
}

Run.prototype = new Circuit(undefined, undefined, undefined, undefined);

Run.prototype.get_ast_node = function() {
   return new ast.Run(this.loc,
		      this.go_in.stmt_out.get_ast_node(),
		      this.sigs_assoc);
}

function ResetRegisterVisitor() {
}

ResetRegisterVisitor.prototype.visit = function(stmt) {
   if (stmt instanceof Pause) {
      stmt.reg = false;
   }

   /* The SEL wire of Abort could be setted by a Pause for the next reaction
      (the new value given by the register, on next clock), so we must
      reset it */
   if (stmt instanceof Abort) {
      stmt.sel.set = false;
   }
}

/* This visitor reset localsignal in nested loop, and erase the pre value */

function ResetLocalSignalVisitor() {
}

ResetLocalSignalVisitor.prototype.visit = function(stmt) {
   if (stmt instanceof LocalSignalIdentifier) {
      var sig = stmt.machine.get_signal(stmt.signal_name);

      if (sig instanceof ValuedSignal) {
	 sig.reset();
   	 if (sig.has_init_value) {
   	    sig.pre_value = sig.init_value;
   	    sig.value = sig.init_value;
   	 } else {
   	    sig.pre_value = undefined;
   	    sig.value = undefined;
   	    sig.is_value_init = false;
   	 }
      }
   }
}


function CountSignalEmitters(machine) {
   this.stop_visit = false;
   this.machine = machine;
   this.machine.signals_emitters = {};
}

CountSignalEmitters.prototype.visit = function(stmt) {
   if (this.stop_visit)
      return;

   if (stmt instanceof Pause && !stmt.sel.set) {
      this.stop_visit = true;
      return;
   }

   if (stmt instanceof Emit) {
      this.machine.signals_emitters[stmt.signal_name] == undefined
	 ? this.machine.signals_emitters[stmt.signal_name] = 1
	 : this.machine.signals_emitters[stmt.signal_name]++;
      return;
   }
}

function fatal_error(msg, loc=undefined) {
   var pretty_loc = loc == undefined ? "" : "at " + loc;
   console.error("*** FATAL ERROR", pretty_loc);
   console.error("***", msg);
   process.exit(1);
}

function catchable_error(msg, loc=undefined) {
   var pretty_loc = loc == undefined ? "" : "at " + loc;
   var log = "*** ERROR " + pretty_loc + "\n***" + msg;
   throw log;
}

/* Tools to get the presence/value of a signal inside an expression.
   SignalAccessor classes are hidden from user, and we use it here to make
   difference with a user type (of an object given to the expression), and
   a signal */

function SignalAccessor(machine, signame, pre) {
   this.machine = machine;
   this.signame = signame;
   this.pre = pre;
   this.value = null;

   /* When we need to get the value/presence of a signal, we must call `get`
      function before. If it returns true, the internal attribute `value`
      is updated with the new value, and we can use it. If it returns false,
      we can't read value/presence of a signal yet */
}

SignalAccessor.prototype.get = function() {
   var sig = this.machine.get_signal(this.signame);

   if (this.pre)
      this.value = sig.get_set(true)
   else if (sig.is_set_ready(false))
      this.value = sig.get_set(false);
   else
      return false;
   return true;
}

SignalAccessor.prototype._toString = function() {
   return this.signame
}

SignalAccessor.prototype.toString = function() {
   var buf = this._toString();

   if (this.pre)
      buf = "pre(" + buf + ")";
   return buf;
}

function SignalAccessorValue(machine, signame, pre) {
   SignalAccessor.call(this, machine, signame, pre);
}
SignalAccessorValue.prototype = new SignalAccessor(undefined, undefined,
						   undefined);
SignalAccessorValue.prototype.get = function() {
   var sig = this.machine.get_signal(this.signame);

   if (this.pre)
      this.value = sig.get_value(true);
   else if (sig.is_value_ready(false))
      this.value = sig.get_value(false);
   else
      return false;
   return true;
}

SignalAccessorValue.prototype._toString = function() {
   return "*" + this.signame;
}

function present(signame) {
   return new SignalAccessor(null, signame, false);
}

function prePresent(signame) {
   return new SignalAccessor(null, signame, true);
}

function value(signame) {
   return new SignalAccessorValue(null, signame, false);
}

function preValue(signame) {
   return new SignalAccessorValue(null, signame, true);
}

exports.Signal = Signal;
exports.ValuedSignal = ValuedSignal;
exports.Emit = Emit;
exports.Pause = Pause;
exports.Present = Present;
exports.Sequence = Sequence;
exports.Loop = Loop;
exports.LoopEach = LoopEach;
exports.Abort = Abort;
exports.Await = Await;
exports.Halt = Halt;
exports.Parallel = Parallel;
exports.Nothing = Nothing;
exports.Atom = Atom;
exports.Suspend = Suspend;
exports.ReactiveMachine = ReactiveMachine;
exports.Statement = Statement;
exports.Trap = Trap;
exports.Exit = Exit;
exports.If = If;
exports.LocalSignalIdentifier = LocalSignalIdentifier;
exports.check_valued_signal_definition = check_valued_signal_definition;
exports.present = present;
exports.prePresent = prePresent;
exports.value = value;
exports.preValue = preValue;
exports.SignalAccessor = SignalAccessor;
exports.SignalAccessorValue = SignalAccessorValue;
exports.fatal_error = fatal_error;
exports.catchable_error = catchable_error;
exports.Run = Run;
