"use strict"
"use hopscript"

const st = require("./inheritance.js");
const error = require("./error.js");
const lang = require("./lang.js");

function ASTNode(id, loc, nodebug, children) {
   if (!children)
      children = [];
   else if (children instanceof ASTNode)
      children = [ children ];
   else if (!(children instanceof Array))
      throw new error.InternalError("Building AST error", loc);

   this.loc = loc;
   this.machine = null;
   this.children = children;
   this.depth = 0;
   this.id = id;

   //
   // unset here, use in compiler to store circuit interface on make
   // circuit phase, and connect on others circuit on connect circuit
   // phase
   //
   this.cinterface = null;
   this.register_list = null;
   this.net_list = [];

   //
   // Fields used to give a stable id on register that can be created
   // when translating this ast node. Each times a registed is created
   // inside this node, we assign as unique id the value "" +
   // this.instr_depth + this.instr_seq + this.next_register_id++
   //
   this.instr_seq = 0;
   this.next_register_id = 0;

   //
   // Tell if the branch is dynamically added since last compilation
   // and if this branch is embedded on a selected parallel. If true
   // the compiler can add a one shot register to 1. Nobody should
   // refers to this variable: the compiler will override it after the
   // compilation that will follow appendChild()
   //
   this.dynamically_added_in_sel = false;

   //
   // Tell the debugger / pretty printer of the program to not display
   // this instruction. If children exists, they will be displayed.
   //
   this.nodebug = nodebug ? true : false;

   //
   // Map of modules instances of the program. Keys are module
   // instance identifier, value is the root module instruction
   // (Module or Let).
   //
   this.module_instance_map = {};
}
exports.ASTNode = ASTNode;

ASTNode.prototype.accept = function(visitor) {
   visitor.visit(this);
}

ASTNode.prototype.accept_auto = function(visitor) {
   visitor.visit(this);
   for (let i in this.children) {
      this.children[i].accept_auto(visitor);
   }
}

ASTNode.prototype.clone = function() {
   throw new error.InternalError("`clone` must be implemented", this.loc);
}

ASTNode.prototype.clone_children = function() {
   var cloned = [];

   for (let i in this.children)
      cloned.push(this.children[i].clone());
   return cloned;
}

ASTNode.prototype._dump = function(dump_ctx, indent) {
   let new_indent = indent;

   if (!this.nodebug) {
      new_indent += 3;
      dump_ctx.modules[dump_ctx.idx] +=
	 dump_ctx.format(this, this._dump_param(), indent);
   }

   for (let i in this.children)
      this.children[i]._dump(dump_ctx, new_indent);
}

ASTNode.prototype._dump_param = function() {
   let args = [];

   function make_arg(body, hilight) {
      return { hilight: hilight, body: body }
   }
   args.add = function(body, hilight=false) {
      args.push(make_arg(body, hilight));
   }
   args.add_at = function(pos, body, hilight=false) {
      args.splice(pos, 0, make_arg(body, hilight));
   }

   let sel = false;
   for (let i in this.register_list) {
      if (this.register_list[i].value) {
	 sel = true;
	 break;
      }
   }

   args.add(this.constructor.name, sel);
   return args;
}

function ActionNode(id, loc, nodebug, children, func, accessor_list) {
   ASTNode.call(this, id, loc, nodebug, children);

   this.func = func;
   this.accessor_list = accessor_list;
}
st.___DEFINE_INHERITANCE___(ASTNode, ActionNode);
exports.ActionNode = ActionNode;

const dump_action_node_args = function(func, accessor_list, args) {
   let acc_list_len = accessor_list.length;

   if (func)
      args.add("CALL" + (func.name ? " " + func.name : ""));

   if (func && acc_list_len > 0)
      args.add("USING");

   if (accessor_list.length > 0) {
      for (let i in accessor_list) {
	 let buf;
	 let acc = accessor_list[i];

	 if (acc.get_value)
	    buf = acc.get_pre ? "pre value" : "value";
	 else
	    buf = acc.get_pre ? "pre present" : "present";
	 buf += " " + acc.signal_name;
	 args.add(buf);
      }
   }

   return args;
}

ActionNode.prototype._dump_param = function() {
   return dump_action_node_args(this.func, this.accessor_list,
				ASTNode.prototype._dump_param.call(this));
}


//
// ExpressionNode have same attributes than ActionNode, but implements
// different compilation methods
//
function ExpressionNode(id, loc, nodebug, children, func, accessor_list,
			immediate) {
   ActionNode.call(this, id, loc, nodebug, children, func, accessor_list);

   this.immediate = immediate;
}
st.___DEFINE_INHERITANCE___(ActionNode, ExpressionNode);
exports.ExpressionNode = ExpressionNode;

function CountExpressionNode(id, loc, nodebug, children, func, accessor_list,
			     immediate, func_count, accessor_list_count ) {
   ExpressionNode.call(this, id, loc, nodebug, children, func, accessor_list,
		       immediate);

   this.func_count = func_count;

   //
   // WARNING: accessor_list_count is undefined if no accessor are
   // provided (as contrary to accessor_list which always exists - and
   // can be empty)
   //
   this.accessor_list_count = accessor_list_count;
}
st.___DEFINE_INHERITANCE___(ExpressionNode, CountExpressionNode);
exports.CountExpressionNode = CountExpressionNode;

function Emit(id, loc, nodebug, signal_name_list, func, accessor_list, if_func,
	      if_accessor_list) {
   ActionNode.call(this, id, loc, nodebug, undefined, func, accessor_list);
   //
   // signal_name_list does not need to be cloned when the AST is
   // cloned since it is never modified.
   //
   this.signal_name_list = signal_name_list;
   this.if_func = if_func;
   this.if_accessor_list = if_accessor_list;
}
st.___DEFINE_INHERITANCE___(ActionNode, Emit);
exports.Emit = Emit;

Emit.prototype.clone = function() {
   return new Emit(this.id, this.loc, this.nodebug, this.signal_name_list,
		   this.func, clone_list(this.accessor_list),
		   this.if_func, clone_list(this.if_accessor_list));
}

Emit.prototype._dump_param = function() {
   let args = ASTNode.prototype._dump_param.call(this);

   for (let i = 0; i < this.signal_name_list.length; i++)
      args.add_at(i + 1, this.signal_name_list[i]);

   if (this.if_func) {
      args.add("If");
      dump_action_node_args(this.if_func, this.if_accessor_list, args);
   }
   return args;
}

function Sustain(id, loc, nodebug, signal_name_list, func, accessor_list,
		 if_func, if_accessor_list) {
   Emit.call(this, id, loc, nodebug, signal_name_list, func, accessor_list,
	     if_func, if_accessor_list);
}
st.___DEFINE_INHERITANCE___(Emit, Sustain);
exports.Sustain = Sustain;

Sustain.prototype.clone = function() {
   return new Sustain(this.id, this.loc, this.nodebug, this.signal_name_list,
		      this.func, clone_list(this.accessor_list),
		      this.if_func, clone_list(this.if_accessor_list));
}

function Nothing(id, loc, nodebug) {
   ASTNode.call(this, id, loc, nodebug, undefined);
}
st.___DEFINE_INHERITANCE___(ASTNode, Nothing);
exports.Nothing = Nothing;

Nothing.prototype.clone = function() {
   return new Nothing(this.id, this.loc, this.nodebug);
}

function Pause(id, loc, nodebug) {
   ASTNode.call(this, id, loc, nodebug, undefined);
}
st.___DEFINE_INHERITANCE___(ASTNode, Pause);
exports.Pause = Pause;

Pause.prototype.clone = function() {
   return new Pause(this.id, this.loc, this.nodebug);
}

function Trap(id, loc, nodebug, trap_name, children) {
   ASTNode.call(this, id, loc, nodebug, children);
   this.trap_name = trap_name;
}
st.___DEFINE_INHERITANCE___(ASTNode, Trap);
exports.Trap = Trap;

Trap.prototype.clone = function() {
   return new Trap(this.id, this.loc, this.nodebug, this.trap_name,
		   this.clone_children());
}

Trap.prototype._dump_param = function() {
   let args = ASTNode.prototype._dump_param.call(this);

   args.add(this.trap_name);
   return args;
}

function Exit(id, loc, nodebug, trap_name) {
   ASTNode.call(this, id, loc, nodebug, undefined);
   this.trap_name = trap_name;
   this.return_code = 2;
}
st.___DEFINE_INHERITANCE___(ASTNode, Exit);
exports.Exit = Exit;

Exit.prototype.clone = function() {
   return new Exit(this.id, this.loc, this.nodebug, this.trap_name);
}

Exit.prototype._dump_param = function() {
   let args = ASTNode.prototype._dump_param.call(this);

   args.add(this.trap_name + "(" + this.return_code + ")");
   return args;
}

function Halt(id, loc, nodebug) {
   ASTNode.call(this, id, loc, nodebug, undefined);
}
st.___DEFINE_INHERITANCE___(ASTNode, Halt);
exports.Halt = Halt;

Halt.prototype.clone = function() {
   return new Halt(this.id, this.loc, this.nodebug);
}

function Atom(id, loc, nodebug, func, accessor_list) {
   ActionNode.call(this, id, loc, nodebug, undefined, func, accessor_list);
}
st.___DEFINE_INHERITANCE___(ActionNode, Atom);
exports.Atom = Atom;

Atom.prototype.clone = function() {
   return new Atom(this.id, this.loc, this.nodebug, this.func,
		   clone_list(this.accessor_list));
}

function Await(id, loc, nodebug, func, accessor_list, immediate,
	       func_count, accessor_list_count) {
   CountExpressionNode.call(this, id, loc, nodebug, undefined, func,
			    accessor_list, immediate, func_count,
			    accessor_list_count);
}
st.___DEFINE_INHERITANCE___(CountExpressionNode, Await);
exports.Await = Await;

Await.prototype.clone = function() {
   return new Await(this.id, this.loc, this.nodebug, this.func,
		    clone_list(this.accessor_list),
		    this.immediate, this.func_count,
		    clone_list(this.accessor_list_count));
}

function Module(id, loc, signal_declaration_list, children) {
   ASTNode.call(this, id, loc, false, children);
   this.signal_declaration_list = signal_declaration_list;
   this.module_instance_id = null;
}
st.___DEFINE_INHERITANCE___(ASTNode, Module)
exports.Module = Module;

Module.prototype.clone = function() {
   return new Module(this.id, this.loc,
		     clone_list(this.signal_declaration_list),
		     this.clone_children());
}

Module.prototype.dump = function(format=null) {
   function default_format(ast_node, args, indent) {
      let buf = "";

      for (let i = 0; i < indent; i++)
      	 buf += " ";

      args.forEach(function(arg, idx, arr) {
	 buf += " " + arg.body;
	 if (arg.hilight)
	    buf += "*";
      })

      buf += "\n";
      return buf;
   }

   let dump_ctx = {
      format: format ? format : default_format,
      idx: 0,
      //
      // Each index matches to a module instance identifier. The index
      // 0 is always the module instance 0, which is the main module.
      //
      modules: [""]
   }

   this._dump(dump_ctx, 0);
   return dump_ctx;
}

Module.prototype._dump_param = function() {
   let args = ASTNode.prototype._dump_param.call(this);

   dump_args_signal_decl_list(args, this.signal_declaration_list);
   return args;
}

function Abort(id, loc, nodebug, func, accessor_list, immediate,
	       func_count, accessor_list_count, children) {
   CountExpressionNode.call(this, id, loc, nodebug, children, func,
			    accessor_list, immediate, func_count,
			    accessor_list_count);
}
st.___DEFINE_INHERITANCE___(CountExpressionNode, Abort);
exports.Abort = Abort;

Abort.prototype.clone = function() {
   return new Abort(this.id, this.loc, this.nodebug, this.func,
		    clone_list(this.accessor_list), this.immediate,
		    this.func_count, clone_list(this.accessor_list_count),
		    this.clone_children());
}


function WeakAbort(id, loc, nodebug, func, accessor_list, immediate,
		   func_count, accessor_list_count, children) {
   CountExpressionNode.call(this, id, loc, nodebug, children, func,
			    accessor_list, immediate,
			    func_count, accessor_list_count);
}
st.___DEFINE_INHERITANCE___(CountExpressionNode, WeakAbort);
exports.WeakAbort = WeakAbort;

WeakAbort.prototype.clone = function() {
   return new WeakAbort(this.id, this.loc, this.nodebug, this.func,
			clone_list(this.accessor_list), this.immediate,
			this.func_count, clone_list(this.accessor_list_count),
			this.clone_children());
}

function Loop(id, loc, nodebug, children) {
   ASTNode.call(this, id, loc, nodebug, children);
}
st.___DEFINE_INHERITANCE___(ASTNode, Loop);
exports.Loop = Loop;

Loop.prototype.clone = function() {
   return new Loop(this.id, this.loc, this.nodebug, this.clone_children());
}

function LoopEach(id, loc, nodebug, children, func, accessor_list, func_count,
		  accessor_list_count) {
   CountExpressionNode.call(this, id, loc, nodebug, children, func,
			    accessor_list, false, func_count,
			    accessor_list_count);
}
st.___DEFINE_INHERITANCE___(CountExpressionNode, LoopEach);
exports.LoopEach = LoopEach;

LoopEach.prototype.clone = function() {
   return new LoopEach(this.id, this.loc, this.nodebug, this.clone_children(),
		       this.func, clone_list(this.accessor_list),
		       this.func_count, clone_list(this.accessor_list_count));
}

function Every(id, loc, nodebug, children, func, accessor_list, immediate,
	       func_count, accessor_list_count) {
   CountExpressionNode.call(this, id, loc, nodebug, children, func,
			    accessor_list, immediate, func_count,
			    accessor_list_count);
}
st.___DEFINE_INHERITANCE___(CountExpressionNode, Every);
exports.Every = Every;

Every.prototype.clone = function() {
   return new Every(this.id, this.loc, this.nodebug, this.clone_children(),
		    this.func, clone_list(this.accessor_list), this.immediate,
		    this.func_count, clone_list(this.accessor_list_count));
}

function Suspend(id, loc, nodebug, children, func, accessor_list, immediate) {
   ExpressionNode.call(this, id, loc, nodebug, children, func, accessor_list,
		       immediate);
}
st.___DEFINE_INHERITANCE___(ExpressionNode, Suspend);
exports.Suspend = Suspend;

Suspend.prototype.clone = function() {
   return new Suspend(this.id, this.loc, this.nodebug, this.clone_children(),
		      this.func, clone_list(this.accessor_list),
		      this.immediate);
}

function Parallel(id, loc, nodebug, children) {
   ASTNode.call(this, id, loc, nodebug, children);
}
st.___DEFINE_INHERITANCE___(ASTNode, Parallel);
exports.Parallel = Parallel;

Parallel.prototype.clone = function() {
   return new Parallel(this.id, this.loc, this.nodebug, this.clone_children());
}

Parallel.prototype.appendChild = function(ast_node, oneshot_reg=true) {
   if (!(ast_node instanceof ASTNode))
      throw new error.SyntaxError("Child is not an Hiphop.js instruction",
				  this.loc);

   if (ast_node instanceof Module)
      throw new error.SyntaxError("Child can't be a Module.",
				  + " (you may want use RUN?)", this.loc);

   this.children.push(ast_node);
   this.machine.lazy_compile = true;
   if (this.cinterface.sel && this.cinterface.sel.value == true &&
       oneshot_reg == true)
      ast_node.dynamically_added_in_sel = true;
}

Parallel.prototype.removeChild = function(ast_node) {
   //
   // We replace the removed branch by a nothing branch. Otherwise, it
   // could be a shift in the unique stable id of registers, and
   // restoration can restore values to wrong registers
   //
   let index = this.children.indexOf(ast_node);

   if (index > -1) {
      this.children[index] = new Nothing(null, this.children[index].loc, true);

      //
      // Then, we just defers removal of all nets of the branch
      // (recompilation is not mandatory).
      //
      this.machine.lazy_branch_removal_list.push(ast_node);
   }
}

function If(id, loc, nodebug, children, not, func, accessor_list) {
   if (children[1] == undefined)
      children[1] = new Nothing(null, loc, false);

   ExpressionNode.call(this, id, loc, nodebug, children, func, accessor_list,
		       false);

   this.not = not;
}
st.___DEFINE_INHERITANCE___(ExpressionNode, If);
exports.If = If;

If.prototype.clone = function() {
   return new If(this.id, this.loc, this.nodebug, this.clone_children(),
		 this.not, this.func, clone_list(this.accessor_list))
}

function Sequence(id, loc, nodebug, children) {
   ASTNode.call(this, id, loc, nodebug, children);
}
st.___DEFINE_INHERITANCE___(ASTNode, Sequence);
exports.Sequence = Sequence;

Sequence.prototype.clone = function() {
   return new Sequence(this.id, this.loc, this.nodebug, this.clone_children());
}

//
// Run node has no runtime semantics, but it is usefull for the
// debugger: it permits to the debugger to split the main program into
// several instanciated modules.
//
function Run(id, loc, nodebug, body) {
   ASTNode.call(this, id, loc, nodebug, body);
   this.module_instance_id = null;
}
st.___DEFINE_INHERITANCE___(ASTNode, Run);
exports.Run = Run;

Run.prototype.clone = function() {
   return new Run(this.id, this.loc, this.nodebug, this.clone_children());
}

Run.prototype._dump_param = function() {
   let args = ASTNode.prototype._dump_param.call(this);

   args.add("MODULE" + this.module_instance_id);

   //
   // Run has always 1 children, and it is a Let statement.
   //
   let signal_declaration_list = this.children[0].signal_declaration_list;
   for (let i in this.children[0].signal_declaration_list) {
      let sigdecl = this.children[0].signal_declaration_list[i];
      let sig = sigdecl.signal;

      if (sigdecl.name != sig.name) {
	 let present = false;

	 for (let j = 0; j < sig.gate_list.length && !present; j++) {
      	    let gate = sig.gate_list[j];

      	    if (gate.value)
      	       present = true;
	 }

	 args.add(sig.name + "=" + sigdecl.name, present);
      }
   }
   return args;
}

Run.prototype._dump = function(dump_ctx, indent) {
   if (!this.nodebug) {
      dump_ctx.modules[dump_ctx.idx] +=
	 dump_ctx.format(this, this._dump_param(), indent);
   }

   let old_idx = dump_ctx.idx;

   dump_ctx.idx = this.module_instance_id;;
   dump_ctx.modules[dump_ctx.idx] = "";
   this.children[0]._dump(dump_ctx, 0);
   dump_ctx.idx = old_idx;
}

function Let(id, loc, nodebug, signal_declaration_list, children) {
   ASTNode.call(this, id, loc, nodebug, children);
   this.signal_declaration_list = signal_declaration_list;
   //
   // Tell if the Let is a child of a RUN intruction. Used for
   // debugger.
   //
   this.in_run_context = false;
   this.module_instance_id = null; // always null if not in run context.
}
st.___DEFINE_INHERITANCE___(ASTNode, Let);
exports.Let = Let

//
// signal_declaration_list must not be cloned if the Let instruction
// is from a run_context: in that case, the list is already cloned
// before, in the RUN construct builder.
//
Let.prototype.clone = function() {
   let clone = new Let(this.id, this.loc, this.nodebug,
		       (this.in_run_context ?
			this.signal_declaration_list :
			clone_list(this.signal_declaration_list)),
		       this.clone_children());
   clone.in_run_context = this.in_run_context;
   return clone;
}

Let.prototype._dump_param = function() {
   let args = ASTNode.prototype._dump_param.call(this);

   //
   // Called modules in RUN are translated into Let. So, we must
   // display module in order to avoid mismatch with the original
   // code.
   //
   if (this.in_run_context)
      args[0].body = "Module";

   dump_args_signal_decl_list(args, this.signal_declaration_list);
   return args;
}

function Exec(id, loc, nodebug, signal_name, func_start,
	      func_start_accessor_list, func_res, func_susp, func_kill) {
   ASTNode.call(this, id, loc, nodebug, undefined);
   this.func = func_start;
   this.accessor_list = func_start_accessor_list;
   this.func_res = func_res;
   this.func_susp = func_susp;
   this.func_kill = func_kill;
   this.signal_name = signal_name;
}
st.___DEFINE_INHERITANCE___(ASTNode, Exec);
exports.Exec = Exec;

Exec.prototype.clone = function() {
   return new Exec(this.id, this.loc, this.nodebug, this.signal_name, this.func,
		   clone_list(this.accessor_list), this.func_res,
		   this.func_susp, this.func_kill);
}

//
// Signal accessors. Exports for building them in lang.hs
//
function SignalAccessor(signal_name, get_pre, get_value) {
   this.signal_name = signal_name;
   this.get_pre = get_pre;
   this.get_value = get_value;
}
exports.SignalAccessor = SignalAccessor;

SignalAccessor.prototype.clone = function() {
   return new SignalAccessor(this.signal_name, this.get_pre, this.get_value);
}

//
// Properties of a signal. Exports for building them in lang.js
//
function SignalProperties(name, acc, init_func, init_accessor_list,
			  reinit_func, reinit_accessor_list, combine, bound) {
   this.name = name;
   this.accessibility = acc ? acc : lang.INOUT;
   this.init_func = init_func;
   this.init_accessor_list = init_accessor_list;
   this.reinit_func = reinit_func;
   this.reinit_accessor_list = reinit_accessor_list;
   this.combine_func = combine;
   this.bound = bound;
}
exports.SignalProperties = SignalProperties;

SignalProperties.prototype.clone = function() {
   return new SignalProperties(this.name, this.accessibility, this.init_func,
			       clone_list(this.init_accessor_list),
			       this.reinit_func,
			       clone_list(this.reinit_accessor_list),
			       this.combine_func, this.bound);
}

//
// Generic function for cloning signal accessor and signal properties.
//
const clone_list = function(lst) {
   return lst.map(function(el, i, arr) {
      return el.clone();
   });
}

//
// Helper function which generate the arguments list of signal
// declaration in mpdule and let statement for pretty printer.
//
const dump_args_signal_decl_list = function(args, signal_declaration_list) {
   for (let i in signal_declaration_list) {
      let sigdecl = signal_declaration_list[i];
      let sig = sigdecl.signal;
      let present = false;

      for (let j = 0; j < sig.gate_list.length && !present; j++) {
	 let gate = sig.gate_list[j];

	 if (gate.value == true)
	    present = true;
      }

      args.add(sigdecl.name, present);
   }
}
