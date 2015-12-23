"use hopscript"

var ast = require("./ast.js");
var compiler = require("./compiler.js");

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

var INSERT_MODE = {
   APPEND: 1,
   BEFORE: 2,
   AFTER: 3,
   valid: function(i) {
      return this.APPEND == i || this.BEFORE == i || this.AFTER == i
   }
};

var current_control = {};

function Signal(name, machine) {
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

Signal.prototype.get_set = function(pre) {
   if (pre)
      return this.pre_set;

   if (!this.is_set_ready(false))
      catchable_error("Causality error on Signal::set " + this.name,
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
   if (this.has_init_value && type != undefined)
      this.check_type(init_value);
}

ValuedSignal.prototype = new Signal(undefined, undefined);

ValuedSignal.prototype.is_value_ready = function(pre) {
   return (pre
	   || (this.set && !this.will_change_in_react)
	   || this.will_change_in_react);
}

ValuedSignal.prototype.get_value = function(pre) {
   if (pre) {
      if (!this.is_pre_value_init)
	 catchable_error("Signal " + this.name
			 + " is not initialized when reading "
			 + "pre_value.", current_control.loc);
      return this.pre_value;
   }

   if (!this.is_value_init)
      catchable_error("Signal "
		      + this.name + " is not initialized when reading.",
		      current_control.loc);
   if (!this.is_value_ready(false))
      catchable_error("Causality error on ValuedSignal::value " + this.name,
		      current_control.loc);
   return this.value;
}

ValuedSignal.prototype.get_pre_value = function() {
   return this.get_value(true);
}

ValuedSignal.prototype.set_value = function(value) {
   if (this.single && this.set_value_in_current_react)
      catchable_error("Multiple writes on single signal " + this.name,
		      current_control.loc);

   if (this.type != undefined)
      this.check_type(value);
   this.is_value_init = true;
   if (this.single || !this.set_value_in_current_react) {
      this.value = value;
   } else {
      var combine = this.combine_with;

      if (!(combine instanceof Function))
	 catchable_error("The combine_with attribute is not a function.",
			 this.loc);
      if (combine.length != 2)
	 catchable_error("The combine function of " + this.name + " must take"
			 + " two arguments.", this.loc);

      this.value = combine.call(undefined, this.value, value);
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
   var wrong_type = false;

   if (typeof(value) == "object") {
      if (!(value instanceof this.type))
	 wrong_type = true;
   } else if (typeof(value) != this.type)
      wrong_type = true;

   if (wrong_type) {
      var expected = this.type;
      var given = typeof(value);

      if (this.type instanceof Function)
	 expected = this.type.name;
      else if (this.type instanceof Object)
	 expected = this.type.constructor.name;
      if (value instanceof Object)
	 given = value.constructor.name;

      catchable_error("Wrong type of value given to signal " + this.name
		      + " [ expected:" + expected
		      + " given:" + given + " ]",
		      current_control.loc);
   }
}

/* Actually usefull only for output signal (and mabye input/output signals) */
ValuedSignal.prototype.apply_react_functions = function() {
   this.react_functions.forEach(function(func, id, arr) {
      func.call(this, { machine: this.machine.machine_name,
		        signal: this.name,
		        value: this.get_value(false) });
   }, this)
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

function Statement(machine, id, loc, name) {
   this.name = name;
   this.id = id;
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

Statement.prototype.accept_auto = function(visitor) {
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

function Circuit(machine, id, loc, name, subcircuit) {
   Statement.call(this, machine, id, loc, name);

   if (subcircuit != undefined && subcircuit != null)
      this.build_wires(subcircuit);
}

Circuit.prototype = new Statement(undefined, undefined, undefined, undefined);

Circuit.prototype.accept_auto = function(visitor) {
   visitor.visit(this);
   this.go_in.stmt_out.accept_auto(visitor);
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
   Statement.prototype.run.call(this);
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

function MultipleCircuit(machine, id, loc, name, subcircuits) {
   Circuit.call(this, machine, id, loc, name, subcircuits);
}

MultipleCircuit.prototype = new Circuit(undefined, undefined, undefined,
					undefined, undefined);

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

MultipleCircuit.prototype.accept_auto = function(visitor) {
   visitor.visit(this);
   for (var i in this.go_in)
      this.go_in[i].stmt_out.accept_auto(visitor);
}

function ReactiveMachine(loc, machine_name, debug) {
   Circuit.call(this, null, undefined, loc, "REACTIVE_MACHINE", null);
   this.react_in_progress;
   this.boot_reg = true;
   this.machine_name = machine_name;
   this.reincarnation_lvl = 0;
   this.local_signals = {};
   this.input_signals = {};
   this.output_signals = {};
   this.debug_input_list = "";
   this.debug = debug;
   this.ast = null;

   /* number of emitters of a signal for the current reaction */
   this.signals_emitters = {};

   if (debug)
      DEBUG_FLAGS |= DEBUG_REACT;
}

ReactiveMachine.prototype = new Circuit(undefined, undefined, undefined,
					undefined, undefined);

ReactiveMachine.prototype.react = function() {
   var go = false;

   if (this.react_in_progress)
      return;
   this.react_in_progress = true;

   if (this.boot_reg) {
      this.go_in.stmt_out.accept_auto(new ResetRegisterVisitor());
      go = this.boot_reg;
      this.boot_reg = false;
   }
   this.go_in.stmt_out.accept_auto(new CountSignalEmitters(this));

   this.go_in.set = go;
   this.res_in.set = true;
   this.susp_in.set = false;
   this.kill_in.set = false;

   if (!this.go_in.stmt_out.run())
      catchable_error("sequential causality", current_control.loc);

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
	       buf_out += "(" + JSON.stringify(sig.value) + ")";
	 }
      }
      console.log(buf_in);
      console.log(buf_out);
   }

   for (var i in this.input_signals)
      this.input_signals[i].reset();

   for (var i in this.output_signals) {
      var sig = this.output_signals[i];

      if (sig.get_set(false))
	 sig.apply_react_functions()
      sig.reset();
   }

   for (var i in this.local_signals) {
      var sig = this.get_signal(i);

      if (sig.value != undefined) {
	 for (var j in this.local_signals[i]) {
	    this.local_signals[i][j].value = sig.value;
	    this.local_signals[i][j].is_value_init = sig.value;
	 }
      }
      for (var j in this.local_signals[i])
	 this.local_signals[i][j].reset();
   }

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
   catchable_error("Unkown signal " + name, current_control.loc);
}

ReactiveMachine.prototype.insertSignal = function(signal_ast) {
   var sig = signal_ast.signal_ref;

   if (!(signal_ast instanceof ast.Signal))
      catchable_error("Can't insert signal, given object is not a signal",
		      undefined);

   if (this.input_signals[sig.name] != undefined
       || this.output_signals[sig.name] != undefined
       || this.local_signals[sig.name] != undefined)
      catchable_error("Can't insert signal " + sig.name
		      + ", the name is already used.", signal_ast.loc);

   if (signal_ast instanceof ast.InputSignal)
      this.input_signals[sig.name] = sig;
   else
      this.output_signals[sig.name] = sig;
   sig.machine = this;
}

ReactiveMachine.prototype._insertStatement = function(neighbor, stmt, mode) {
   if (!INSERT_MODE.valid(mode))
      catchable_error("Can't insert statement, invalid mode.", undefined);

   if (mode == INSERT_MODE.APPEND)
      if (!(neighbor instanceof ast.Parallel)
	  || !(neighbor instanceof ast.Sequence))
	 catchable_error("Can't insert statement, can append statement "
			 + "only on Parallel or Sequence statement.",
			 undefined);

   if (!(stmt instanceof ast.Statement))
      catchable_error("Can't insert statement, the statement to is not "
		      + "a regular AST node.", undefined);

   if (!(neighbor instanceof ast.Statement))
      catchable_error("Can't insert statement, the element beside the "
		      + "statement to insert is not a regular AST node.",
		      undefined);

    if (neighbor.parent == null)
      catchable_error("Can't find parent of neighbor node.", stmt_ast.loc);

   var parent = neighbor.parent;
   var neighbor_index = parent.subcircuit.indexOf(neighbor);

   stmt.machine = this;
   stmt.parent = neighbor.parent;

   if (mode == INSERT_MODE.APPEND) {
      neighbor.subcircuit.push(stmt);
   } else {
      var seq;
      var seq_order;

      if (mode == INSERT_MODE.BEFORE)
	 seq_order = [ stmt, neighbor ]
      else
 	 seq_order = [ neighbor, stmt ]

      seq = new ast.Sequence(undefined, neighbor.loc, seq_order);
      seq.parent = parent;
      parent.subcircuit[neighbor_index] = seq;
   }

   /* TODO : copie profonde de l'AST, pour le restorer après compilation
      (le compileur casse totalelent l'AST).
      Il est nécessaire de garder l'AST valide, car les utilisateurs
      qui font fait getElementById doivent garder un nœud valie  */
   try {
    //  var state = this.save();
      compiler.compile(this.get_ast_node(), this);
   } catch (e) {
      /* TODO : ROLLBACK sur modifs AST/RUNTIME qui ont étés faites */
      catchable_error("Can't insert statement, compile error : "
		      + e.message, undefined);
   }
   //this.restore(state);
   this.boot_reg = true;
}

ReactiveMachine.prototype.getElementById = function(id) {
   var getter = new GetNodeFromIdVisitor(id);
   var ast_machine = this.get_ast_node();

   ast_machine.accept(new compiler.BuildTreeVisitor(ast_machine));
   ast_machine.accept_auto(getter);
   return getter.node;
}

ReactiveMachine.prototype.appendChild = function(parent, child) {
   this._insertStatement(parent, child, INSERT_MODE.APPEND);
}

ReactiveMachine.prototype.insertBefore = function(neighbor, stmt_ast) {
   this._insertStatement(neighbor, stmt_ast, INSERT_MODE.BEFORE);
}

ReactiveMachine.prototype.insertAfter = function(neighbor, stmt_ast) {
   this._insertStatement(neighbor, stmt_ast, INSERT_MODE.AFTER);
}

ReactiveMachine.prototype.inputAndReact = function(name, value) {
   this.setInput(name, value);
   this.react();
}

ReactiveMachine.prototype.setInput = function(name, value) {
   var sig = this.input_signals[name];
   var buf_debug = " ";

   if (this.react_in_progress)
      return;
   if (sig == undefined)
      catchable_error("Can't find input signal named " + name, undefined);
   sig.set_set();
   buf_debug += name;
   if (sig instanceof ValuedSignal) {
      if (value != undefined) {
	 sig.set_value(value);
	 buf_debug += "(" + value + ")";
      }
      else if (!sig.is_value_init)
	 catchable_error("Can't set non initialized valued signal "
			 + name + " without value", undefined);
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
   } else if (stmt instanceof Abort) {
      if (this.restore)
	 stmt.current_count = this.state_list.pop()
      else
	 this.state_list.push(stmt.current_count)
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
		 reincarnation_lvl:0,
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
   this.go_in.stmt_out.accept_auto(
      new SaveRestoreRegisterVisitor(false, state.registers));
   state.registers.reverse();
   state.boot_reg = this.boot_reg;
   state.reincarnation_lvl = this.reincarnation_lvl;
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
   this.go_in.stmt_out.accept_auto(
      new SaveRestoreRegisterVisitor(true, state.registers));
   this.boot_reg = state.boot_reg;
   this.reincarnation_lvl = state.reincarnation_lvl;
}

ReactiveMachine.prototype.addEventListener = function(sig, callback) {
   var signal;

   if (!(callback instanceof Function))
      fatal_error("ReactiveMachine.addEventListener: listener argument "
		  + "must be a function.", undefined);
   signal = this.output_signals[sig];
   if (signal == undefined)
      fatal_error("ReactiveMachine.addEventListener: output signal "
		  + sig + " not found.", undefined);
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
		  + sig + " not found.", undefined);
}

ReactiveMachine.prototype.get_ast_node = function() {
   if (this.ast == null) {
      var sig;
      var inputs = [];
      var outputs = [];

      for (var name in this.input_signals) {
	 sig = this.input_signals[name];
	 inputs.push(new ast.InputSignal(sig.loc, sig))
      }

      for (var name in this.output_signals) {
	 sig = this.output_signals[name];
	 outputs.push(new ast.OutputSignal(sig.loc, sig, sig.react_functions))
      }

      this.ast = new ast.ReactiveMachine(this.loc,
					 this.machine_name,
					 this.debug,
					 inputs,
					 outputs,
					 this.go_in.stmt_out.get_ast_node());
   }

   return this.ast;
}

/* Usefull for Emit, If, Atom statements
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

   var args = new Array(raw_exprs.length);
   var arg;

   var i = 0;
   for (var e in raw_exprs) {
      arg = get_expr(raw_exprs[e]);
      if (!arg.ready)
	 return false;
      args[i] = arg.value;
      i++;
   }
   return args;
}

/* Emit - Figure 11.4 page 116 */

function Emit(machine, id, loc, signal_name, func, exprs) {
   Statement.call(this, machine, id, loc, "EMIT");
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

Emit.prototype = new Statement(undefined, undefined, undefined, undefined);

Emit.prototype.run = function() {
   current_control = this;
   var signal = this.machine.get_signal(this.signal_name);

   if (!this.blocked)
      signal.decr_emitters();
   else
      this.blocked = false;

   this.k[0].set = this.go.set;
   if (this.go.set) {
      var args = get_expr_list(this.exprs);

      if (args === false) {
	 this.blocked = true;
	 return false;
      }

      if (this.func != undefined) {
	 signal.set_value(this.func.apply(this, args));
      } else if (args.length == 1) {
	 if (!(signal instanceof ValuedSignal))
	    catchable_error("Signal " + signal.name + " is not valued.",
			    current_control.loc);
	 signal.set_value(args[0]);
      }

      signal.set_set();
   }

   if (DEBUG_FLAGS & DEBUG_EMIT)
      this.debug();
   return true;
}



Emit.prototype.get_ast_node = function() {
   return new ast.Emit(this.id, this.loc, this.signal_name, this.func,
		       this.exprs);
}

/* Pause - Figure 11.3 page 115 */

function Pause(machine, id, loc) {
   Statement.call(this, machine, id, loc, "PAUSE");
   this.debug_code = DEBUG_PAUSE;
   this.reg = false;
   this.k0_on_depth = false;
}

Pause.prototype = new Statement(undefined, undefined, undefined, undefined)

Pause.prototype.run = function() {
   current_control = this;
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
   return new ast.Pause(this.id, this.loc)
}

/* Present test - Figure 11.5 page 117
   X_in[0] represent X_in of then branch
   X_in[1] represent X_in of else branch
   It's allowed to have only a then branch */

function Present(machine,
		 id,
		 loc,
		 signal_name,
		 test_pre,
		 then_branch,
		 else_branch) {
   /* should be removed now, since it's done at ast level */
   if (!(else_branch instanceof Statement))
      else_branch = new Nothing();

   MultipleCircuit.call(this, machine, id, loc, "PRESENT",
			[then_branch, else_branch]);
   this.debug_code = DEBUG_PRESENT;
   this.signal_name = signal_name;
   this.test_pre = test_pre;

   /* set to 0 or 1 is the branch 0|1 was blocked on signal test */
   this.blocked = -1;
}

Present.prototype = new MultipleCircuit(undefined, undefined, undefined,
					undefined, undefined);

Present.prototype.run = function() {
   current_control = this;
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
   return new ast.Present(this.id,
			  this.loc,
			  this.signal_name,
			  this.test_pre,
			  [ this.go_in[0].stmt_out.get_ast_node(),
			    this.go_in[1].stmt_out.get_ast_node() ]);
}

function If(machine, id, loc, func, exprs, then_branch, else_branch) {
   MultipleCircuit.call(this, machine, id, loc, "IF",
			[then_branch, else_branch]);
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

If.prototype = new MultipleCircuit(undefined, undefined, undefined, undefined,
				   undefined);

If.prototype.run = function() {
   current_control = this;
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
   return new ast.If(this.id, this.loc, this.not, this.func, this.exprs,
		     [ this.go_in[0].stmt_out.get_ast_node(),
		       this.go_in[1].stmt_out.get_ast_node() ]);
}

/* Sequence - Figure 11.8 page 120
   It can take either a variable list of argument, or only one argument
   which is an array of statements */

function Sequence(machine, id, loc, subcircuits) {
   this.seq_len = subcircuits.length;
   this.blocked = -1 /* same semantic that present blocked attribute */
   MultipleCircuit.call(this, machine, id, loc, "SEQUENCE", subcircuits);
   this.debug_code = DEBUG_SEQUENCE;
}

Sequence.prototype = new MultipleCircuit(undefined, undefined, undefined,
					 undefined, undefined);

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
   current_control = this;
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
   return new ast.Sequence(this.id, this.loc, subcircuits);
}

/* Loop - Figure 11.9 page 121 */

function Loop(machine, id, loc, circuit) {
   Circuit.call(this, machine, id, loc, "LOOP", circuit);
   this.debug_code = DEBUG_LOOP;
}

Loop.prototype = new Circuit(undefined, undefined, undefined, undefined,
			     undefined);

Loop.prototype.run = function() {
   current_control = this;
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
	 this.accept_auto(new ResetLocalSignalVisitor());
      }

      if (this.go.set && this.k_in[0].set)
	 catchable_error("Instantaneous loop", this.loc);
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
   return new ast.Loop(this.id, this.loc, this.go_in.stmt_out.get_ast_node());
}

/* LoopEach */

function LoopEach(machine, id, loc, circuit, signal_name, test_pre, count) {
   this.circuit = circuit;
   this.signal_name = signal_name;
   this.count = count;
   this.test_pre = test_pre;
   var sub_seq = new Sequence(machine, undefined, loc,
			      [circuit, new Halt(machine, undefined, loc)]);
   var sub_ab = new Abort(machine, undefined, loc, sub_seq, signal_name,
			  test_pre, false, count);

   Circuit.call(this, machine, id, loc, "LOOPEACH",
		new Loop(machine, undefined, loc, sub_ab));
}

LoopEach.prototype = new Circuit(undefined, undefined, undefined, undefined,
				 undefined);

LoopEach.prototype.get_ast_node = function() {
   return new ast.LoopEach(this.id,
			   this.loc,
			   this.circuit.get_ast_node(),
			   this.signal_name,
			   this.test_pre,
			   this.count);
}

/* Sustain */

function Sustain(machine, id, loc, signal_name, func, exprs) {
   this.signal_name = signal_name;
   this.func = func;
   this.exprs = exprs;
   var sub_seq_internal = [ new Emit(machine, undefined, loc, signal_name,
				     func, exprs),
			    new Pause(machine, undefined, loc) ];
   var sub_seq = new Sequence(machine, undefined, loc, sub_seq_internal);

   Circuit.call(this, machine, id, loc, "SUSTAIN",
		new Loop(machine, undefined, loc, sub_seq));
}

Sustain.prototype = new Circuit(undefined, undefined, undefined, undefined,
				undefined);

Sustain.prototype.get_ast_node = function() {
   return new ast.Sustain(this.id, this.loc, this.signal_name, this.func,
			  this.exprs);
}

/* Every */

function Every(machine, id, loc, circuit, signal_name, count, immediate) {
   this.circuit = circuit;
   this.signal_name = signal_name;
   this.count = count;
   this.immediate = immediate;

   var sub_await = new Await(machine, undefined, loc, signal_name, false,
			     immediate, count);
   var sub_loopeach = new LoopEach(machine, undefined, loc, circuit,
				   signal_name, false, count);

   Circuit.call(this, machine, id, loc, "EVERY",
		new Sequence(machine, undefined, loc,
			     [sub_await, sub_loopeach]));
}

Every.prototype = new Circuit(undefined, undefined, undefined, undefined,
			      undefined);

Every.prototype.get_ast_node = function() {
   return new ast.Every(this.id,
			this.loc,
			this.circuit.get_ast_node(),
			this.signal_name,
			this.count,
			this.immediate);
}

/* Abort - Figure 11.7 page 120 */

function Abort(machine,
	       id,
	       loc,
	       circuit,
	       signal_name,
	       test_pre,
	       immediate,
	       count) {
   Circuit.call(this, machine, id, loc, "ABORT", circuit);
   this.count = count;
   this.current_count = -1;
   this.debug_code = DEBUG_ABORT;
   this.signal_name = signal_name;
   this.test_pre = test_pre;
   this.immediate = immediate;
   this.blocked = false;

   if (immediate && count > 0)
      fatal_error("`immediate` can't be used with `count` delay.", loc)
}

Abort.prototype = new Circuit(undefined, undefined, undefined, undefined,
			      undefined);

Abort.prototype.run = function() {
   current_control = this;
   var sig_name = this.signal_name;
   var signal = this.machine.get_signal(sig_name);
   var signal_set;

   if (!signal.is_set_ready(this.test_pre))
      return false;

   signal_set = signal.get_set(this.test_pre);
   if (!this.blocked && (this.go.set || this.res.set)) {
      if (signal_set) {
	 this.current_count++;
	 if (this.current_count < this.count) {
	    signal_set = false;
	 } else {
	    this.current_count = -1;
	 }
      } else if (this.current_count == -1) {
	 this.current_count++;
      }
   }

   this.go_in.set = this.go.set && !(this.immediate && signal_set);
   this.res_in.set = this.res.set && this.sel.set && !signal_set;
   this.susp_in.set = this.susp.set;
   this.kill_in.set = this.kill.set;

   if (!this.go_in.stmt_out.run()) {
      this.blocked = true;
      return false;
   }
   this.blocked = false;

   var new_sel = this.sel_in.set;

   this.k[0].set = ((this.res.set &&
		     this.sel.set &&
		     signal_set)
		    || this.k_in[0].set
		    || (this.immediate && signal_set && this.go.set));
   this.sel.set = new_sel;
   for (var i = 1; i < this.k_in.length; i++)
      this.k[i].set = this.k_in[i].set;

   if (DEBUG_FLAGS & DEBUG_ABORT)
      this.debug();
   this.assert_completion_code();
   this.first_react = false;
   return true;
}

Abort.prototype.get_ast_node = function() {
   return new ast.Abort(this.id,
			this.loc,
			this.signal_name,
			this.test_pre,
			this.immediate,
			this.count,
			this.go_in.stmt_out.get_ast_node());
}

/* Await */

function Await(machine, id, loc, signal_name, test_pre, immediate, count) {
   this.signal_name = signal_name;
   this.count = count;
   this.test_pre = test_pre;
   this.immediate = immediate;
   var abort = new Abort(machine,
			 id,
			 loc,
			 new Halt(machine, undefined, loc),
			 this.signal_name,
			 this.test_pre,
			 this.immediate,
			 this.count);
   Circuit.call(this, machine, undefined, loc, "AWAIT", abort);
   this.debug_code = DEBUG_AWAIT;
}

Await.prototype = new Circuit(undefined, undefined, undefined, undefined,
			      undefined);

Await.prototype.get_ast_node = function() {
   return new ast.Await(this.id,
			this.loc,
			this.signal_name,
			this.test_pre,
			this.immediate,
			this.count)
}

/* Halt */

function Halt(machine, id, loc) {
   var halt = new Loop(machine, id, loc, new Pause(machine, undefined, loc));
   Circuit.call(this, machine, id, loc, "HALT", halt);
   this.debug_code = DEBUG_HALT;
}

Halt.prototype = new Circuit(undefined, undefined, undefined, undefined,
			     undefined);

Halt.prototype.get_ast_node = function() {
   return new ast.Halt(this.id, this.loc);
}

/* Parallel - Figure 11.10 page 122 */

function Parallel(machine, id, loc, branches) {
   MultipleCircuit.call(this, machine, id, loc, "PARALLEL", branches);
   this.debug_code = DEBUG_PARALLEL;
}

Parallel.prototype = new MultipleCircuit(undefined, undefined, undefined,
					 undefined, undefined);

Parallel.prototype.run = function() {
   current_control = this
   function get_return_code(k_in, code) {
      /* Tell if a specific return code is set in any of a branch */
      for (var i in k_in[code]) {
	 if (k_in[code][i] != undefined)
	    if (k_in[code][i].set)
	       return true;
      }
      return false;
   }

   var n_par = this.go_in.length;
   var ended = [];

   for (var i = 0; i < this.go_in.length; i++) {
      ended[i] = false;
      this.go_in[i].set = this.go.set;
      this.res_in[i].set = this.res.set;
      this.susp_in[i].set = this.susp.set;
      this.kill_in[i].set = this.kill.set;
   }

   while (n_par > 0) {
      this.go_in.forEach(function(el, i, arr) {
      	 if (!ended[i]) {
      	    ended[i] = el.stmt_out.run();
      	    if (ended[i])
      	       n_par--;
      	 }
      });
   }

   var sel_union = false;
   this.go_in.forEach(function(el, i, arr) {
      sel_union |= el.stmt_out.sel.set;
   });
   this.sel.set = sel_union;

   var max_code = -1;
   for (var i in this.k) {
      if (get_return_code(this.k_in, i))
	 max_code = parseInt(i);
      this.k[i].set = false;
   }

   if (max_code > -1)
      this.k[max_code].set = true;

   /* propage kill on branches */
   if (max_code > 1) {
      var reset_register = new ResetRegisterVisitor();

      this.go_in.forEach(function(el, i, arr) {
      	 el.stmt_out.accept_auto(reset_register)
      });
   }

   if (DEBUG_FLAGS & DEBUG_PARALLEL)
      this.debug();
   this.assert_completion_code();
   return true;
}

Parallel.prototype.get_ast_node = function() {
   var subcircuits = [];

   for (var i in this.go_in)
      subcircuits[i] = this.go_in[i].stmt_out.get_ast_node();
   return new ast.Parallel(this.id, this.loc, subcircuits);
}

/* Nothing statement */

function Nothing (machine, id, loc) {
   Statement.call(this, machine, id, loc, "NOTHING");
}

Nothing.prototype = new Statement(undefined, undefined, undefined, undefined);

Nothing.prototype.run = function() {
   this.k[0].set = this.go.set;
   return true;
}

Nothing.prototype.get_ast_node = function() {
   return new ast.Nothing(this.id, this.loc);
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

function Atom(machine, id, loc, func, exprs) {
   Statement.call(this, machine, id, loc, "ATOM");
   this.func = func;
   this.exprs = exprs;
}

Atom.prototype = new Statement(undefined, undefined, undefined, undefined);

Atom.prototype.run = function() {
   current_control = this;
   this.k[0].set = this.go.set;
   if (this.go.set) {
      var args = get_expr_list(this.exprs);

      if (args === false)
	 return false;
      this.func.apply(this, args);
   }
   return true;
}

Atom.prototype.get_ast_node = function() {
   return new ast.Atom(this.id, this.loc, this.func, this.exprs);
}

/* Suspend - Figure 11.6 */

function Suspend(machine, id, loc, circuit, signal_name, test_pre) {
   Circuit.call(this, machine, id, loc, "SUSPEND", circuit);
   this.debug_code = DEBUG_SUSPEND;
   this.signal_name = signal_name;
   this.test_pre = test_pre;
}

Suspend.prototype = new Circuit(undefined, undefined, undefined, undefined,
				undefined);

Suspend.prototype.run = function() {
   current_control = this;
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
   return new ast.Suspend(this.id,
			  this.loc,
			  this.signal_name,
			  this.test_pre,
			  this.go_in.stmt_out.get_ast_node());
}

/* Trap/Shift - Figure 11.12/11.13 page 124 */

function Trap(machine, id, loc, circuit, trap_name) {
   this.trap_name = trap_name;
   Circuit.call(this, machine, id, loc, "TRAP", circuit);
   this.debug_code = DEBUG_TRAP;
}

Trap.prototype = new Circuit(undefined, undefined, undefined, undefined,
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
   current_control = this;
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
   return new ast.Trap(this.id,
		       this.loc,
		       this.trap_name,
		       this.go_in.stmt_out.get_ast_node());
}

/* Exit of a trap */

function Exit(machine, id, loc, trap_name, return_code) {
   Statement.call(this, machine, id, loc, "EXIT");
   this.trap_name = trap_name;
   this.return_code = return_code;

   for (var i = 2; i <= return_code; i++)
      this.k[i] = null;
}

Exit.prototype = new Statement(undefined, undefined, undefined, undefined);

Exit.prototype.run = function() {
   this.k[0].set = false;
   this.k[1].set = false;
   this.k[this.return_code].set = this.go.set;
   return true;
}

Exit.prototype.get_ast_node = function() {
   return new ast.Exit(this.id, this.loc, this.trap_name);
}

/* Local signal idenfifier (not instances) which embeded circutis */

function LocalSignalIdentifier(machine,
			       id,
			       loc,
			       subcircuit,
			       signal_name,
			       type,
			       init_value,
			       combine_with,
			       valued) {
   Circuit.call(this, machine, id, loc, "LOCALSIGNALIDENTIFIER", subcircuit);
   this.signal_name = signal_name;
   this.type = type;
   this.init_value = init_value;
   this.combine_with = combine_with;
   this.valued = valued;
}

LocalSignalIdentifier.prototype = new Circuit(undefined, undefined, undefined,
					      undefined, undefined);

LocalSignalIdentifier.prototype.get_ast_node = function() {
   return new ast.LocalSignal(this.id,
			      this.loc,
			      this.signal_name,
			      this.go_in.stmt_out.get_ast_node(),
			      this.type,
			      this.init_value,
			      this.combine_with,
			      this.valued);
}

/* Run statement directly give control to its embedded circuit.
   It's useful to pretty printer and synbolic debugging */

function Run(machine, id, loc, sigs_assoc, subcircuit) {
   Circuit.call(this, machine, id, loc, "RUN", subcircuit);
   this.sigs_assoc = sigs_assoc;
}

Run.prototype = new Circuit(undefined, undefined, undefined, undefined,
			    undefined);

Run.prototype.get_ast_node = function() {
   return new ast.Run(this.id,
		      this.loc,
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
      sig.reset();
      if (sig instanceof ValuedSignal) {
	 //sig.reset();
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
   this.ignore_next_pause = false;
   this.machine.signals_emitters = {};
}

CountSignalEmitters.prototype.visit = function(stmt) {
   if (this.stop_visit)
      return;

   if (stmt instanceof Abort && stmt.immediate)
      this.ignore_next_pause = true;

   if (stmt instanceof Pause) {
      if (this.ignore_next_pause)
	 this.ignore_next_pause = false;
      else if (!stmt.sel.set) {
	 this.stop_visit = true;
	 return;
      }
   }

   if (stmt instanceof Emit) {
      this.machine.signals_emitters[stmt.signal_name] == undefined
	 ? this.machine.signals_emitters[stmt.signal_name] = 1
	 : this.machine.signals_emitters[stmt.signal_name]++;
      return;
   }
}


function GetNodeFromIdVisitor(id) {
   this.id = id;
   this.node = null;
}

GetNodeFromIdVisitor.prototype.visit = function(node) {
   if (this.node == null && node.id != undefined && node.id == this.id)
      this.node = node;
}

/* TODO: only one error method witch take error exception in parameter */

function fatal_error(msg, loc) {
   var pretty_loc = loc == undefined ? "" : "at " + loc;
   throw new Error("*** FATAL ERROR " + pretty_loc + "\n*** " + msg);
}

function catchable_error(msg, loc) {
   var pretty_loc = loc == undefined ? "" : "at " + loc;
   throw new EvalError("*** ERROR " + pretty_loc + "\n*** " + msg);
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
exports.Sustain = Sustain;
exports.Pause = Pause;
exports.Present = Present;
exports.Sequence = Sequence;
exports.Loop = Loop;
exports.LoopEach = LoopEach;
exports.Every = Every;
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
exports.present = present;
exports.prePresent = prePresent;
exports.value = value;
exports.preValue = preValue;
exports.SignalAccessor = SignalAccessor;
exports.SignalAccessorValue = SignalAccessorValue;
exports.fatal_error = fatal_error;
exports.catchable_error = catchable_error;
exports.Run = Run;
exports.Circuit = Circuit;
exports.MultipleCircuit = MultipleCircuit;
