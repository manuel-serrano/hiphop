"use hopscript";

const hh = require("./hiphop.js");
const ast = require("./ast.js");
const error = require("./error.js");
const dcommon = require("./debugger-common.js");
const lang = require("./lang.js");
const signal = require("./signal.js");

const DEFAULT_BG = "white";
const DEFAULT_FG = "black";
const DISP_FG_SIGNAL = test => test ? "red" : "blue";
const DISP_FG_SEL = test => test ? "brown" : DEFAULT_FG;
const DISP_BG_GO = test => test ? "#BBFFBB" : DEFAULT_BG;

if( hop.isServer ) {
   require( "./debugger-server.js" );
}
//
// ProgramTree, WindowDescriptor, Word and Instruction objects must
// not have any reference to the machine, the ast, the circuits or
// anything else because there are serialized to be send to another
// host if used in a Debugger.
//
// For same reasons (WindowDescriptor must be send to specific hosts),
// a ProgramTree must not reference any WindowDescriptor, and
// vice-versa.
//
function ProgramTree(debugger_name, name, module_instance_id, children) {
   this.url = "/hop/" + dcommon.svc_url(debugger_name, module_instance_id);
   this.module_instance_id = module_instance_id;
   this.children = children;

   //
   // The name of the module (undefined if not set in the module
   // code).
   //
   this.name = name;
}

function Word(body, fg_color, bg_color) {
   this.body = body;
   this.fg_color = fg_color;
   this.bg_color = bg_color;
}

function Instruction(word_list, indent, url=null) {
   if (!(word_list instanceof Array))
      throw new error.InternalError("`word_list` must be an array", null);
   this.word_list = word_list;
   this.indent = indent;
   this.url = url ? "/hop/" + url : url;
}

function WindowDescriptor(module_instance_id, name, program_tree=null) {
   this.module_instance_id = module_instance_id;
   this.program_tree = program_tree;
   this.instruction_list = [];

   //
   // The name of the module (undefined if not set in the module
   // code).
   //
   this.name = name;
}

//
// Diff between two WindowDescriptor, generate a change list filled by
// following objects:
//
// {type: "add", line: X, instr: [instruction obj]} add instr at line X
// {type: "del", line: X} delete instr at line X
// {type: "chg", line: X, column: Y, fg_color: "color", bg_color: "color"}
// set new fb and bg colors to the word at X:Y. Not that just
// fg_color or bg_color can be present
//
function make_diff(oldwd, newwd) {
   //
   // Return values:
   //
   //  - true = lines are diffrents
   //  - integer list = word to update color
   //  - fase = lines are identical
   //
   function diff_line(oldinstr, newinstr) {
      let len = oldinstr.word_list.length;
      if (len != newinstr.word_list.length)
	 return true;

      let oldwl = oldinstr.word_list;
      let newwl = newinstr.word_list;
      let change_color = [];

      for (let i = 0; i < len; i++) {
	 let oldw = oldwl[i];
	 let neww = newwl[i];

	 if (oldw.body != neww.body) {
	    return true;
	 } else {
	    let change = null;

	    if (oldw.fg_color != neww.fg_color) {
	       if (!change)
		  change = { column: i };
	       change.fg_color = neww.fg_color;
	    }

	    if (oldw.bg_color != neww.bg_color) {
	       if (!change)
		  change = { column: i };
	       change.bg_color = neww.bg_color;
	    }

	    if (oldw.signal_value != neww.signal_value) {
	       if (!change)
		  change = { column: i };
	       change.signal_value = neww.signal_value;
	    }

	    if (change)
	       change_color.push(change);
	 }
      }

      return change_color.length > 0 ? change_color : false;
   }

   function add(line, instr) {
      change_list.push({ type: "add", line: line, instr: instr });
   }

   function del(line) {
      change_list.push({ type: "del", line: line });
   }

   let change_list = [];
   let idiff = 0;
   let iold = 0;
   let inew = 0;
   let oldinstr_list = oldwd.instruction_list;
   let newinstr_list = newwd.instruction_list;
   let oldlen = oldinstr_list.length;
   let newlen = newinstr_list.length;

   while (iold < oldlen || inew < newlen) {
      if (!oldinstr_list[iold]) {
	 add(idiff, newinstr_list[inew]);
	 iold++;
	 inew++;
	 idiff++;
      } else if (!newinstr_list[inew]) {
	 del(idiff);
	 iold++;
      } else {
	 let cur_oldinstr = oldinstr_list[iold];
	 let cur_newinstr = newinstr_list[inew];
	 let c = diff_line(cur_oldinstr, cur_newinstr);

	 if (c === true) {
	    let next_oldinstr = oldinstr_list[iold + 1];
	    let next_newinstr = newinstr_list[inew + 1];

	    if (!next_oldinstr || !next_newinstr) {
	       del(idiff);
	       add(idiff, cur_newinstr);
	       iold++;
	       inew++;
	       idiff++;
	    } else if (diff_line(cur_oldinstr, next_newinstr) !== true) {
	       add(idiff, cur_newinstr);
	       inew++;
	       idiff++;
	    } else if (diff_line(next_oldinstr, cur_newinstr) !== true) {
	       del(idiff);
	       iold++;
	    } else {
	       del(idiff);
	       add(idiff, cur_newinstr);
	       iold++;
	       inew++;
	       idiff++;
	    }
	 } else if (c === false) {
	    iold++;
	    inew++;
	    idiff++;
	 } else {
	    for (let i in c) {
	       c[i].type = "chg";
	       c[i].line = idiff;
	       change_list.push(c[i]);
	    }
	    iold++;
	    inew++;
	    idiff++;
	 }
      }
   }
   return change_list;
}

//
// Generate a list of window descriptors on the program. Each window
// corresponds to a module. Each index correspond to the module
// instance id.
//
// If a program_tree is givem, the `program_tree` field is set for
// each window descriptor.
//
function make_wd_list(ast_node, d_name=null, program_tree=null) {
   if (!(ast_node instanceof ast.Module))
      throw new error.InternalError("`ast_node` is not Module", null);

   let dump_ctxt = {
      idx: ast_node.module_instance_id,
      wd_list: [new WindowDescriptor(0, ast_node.name, program_tree)],
      program_tree: program_tree,
      d_name: d_name
   }

   ast_node._dump(dump_ctxt, 0);
   return dump_ctxt.wd_list;
}
exports.make_wd_list = make_wd_list;

//
// AST visit methods to build window descriptor list
//
ast.ASTNode.prototype._dump = function(dump_ctx, indent) {
   let instr_list = dump_ctx.wd_list[dump_ctx.idx].instruction_list;
   let close_bracket = false;
   let isFork = this instanceof ast.Fork;
   let childrenLen = this.children.length;

   if (!this.nodebug) {
      let instr = new Instruction(this._dump_word_list(), indent);

      instr_list.push(instr);
      if (this.children.length > 0) {
	 instr.word_list.add("{");
	 close_bracket = true;
      }
   }

   for (let i in this.children) {
      let c = this.children[i];
      //
      // If a branch has been added and no reaction happend yet, the
      // branch cannot be displayed (it is not compiled yet).
      //
      if (!c.machine)
	 continue;
      if (isFork && !c.nodebug && i > 0) {
	 instr_list.push(new Instruction([new Word("}", DEFAULT_FG, DEFAULT_BG),
	 				  new Word("PAR", DEFAULT_FG, DEFAULT_BG),
	 				  new Word("{", DEFAULT_FG, DEFAULT_BG)],
	 				 indent));
      }
      c._dump(dump_ctx, indent + (this.nodebug ? 0 : 1));
   }

   if (close_bracket)
      instr_list.push(new Instruction([new Word("}", DEFAULT_FG, DEFAULT_BG)],
				      indent));
}

ast.ASTNode.prototype._dump_word_list = function() {
   let word_list = [];

   word_list.add = function(body, fg_color=DEFAULT_FG, bg_color=DEFAULT_BG) {
      let w = new Word(body, fg_color, bg_color);

      word_list.push(w);
      return w;
   }
   word_list.add_at = function(pos, body, fg_color=DEFAULT_FG,
			       bg_color=DEFAULT_BG) {
      let w = new Word(body, fg_color, bg_color);

      word_list.splice(pos, 0, w);
      return w;
   }

   let ci = this.circuit;
   let sel = ci.sel ? ci.sel.value == true : false;
   let go = ci.res ? ci.res.value == true && sel : false;

   if (!go) {
      for (let i in this.circuit.go_list) {
   	 if (this.circuit.go_list[i].value == true) {
   	    go = true;
   	    break;
   	 }
      }
   }

   if (go) {
      for (let i in this.circuit.kill_list) {
   	 if (this.circuit.kill_list[i].value == true) {
   	    go = false;
   	    break;
   	 }
      }
   }

   word_list.add(this.constructor.name.toUpperCase(),
		 DISP_FG_SEL(sel), DISP_BG_GO(go));

   if (this.immediate) {
      word_list.add("IMMEDIATE");
   }

   return word_list;
}

ast.Fork.prototype._dump_word_list = function() {
   let word_list = ast.ASTNode.prototype._dump_word_list.call(this);

   word_list[0].body = "FORK";
   return word_list;
}

ast.ActionNode.prototype._dump_word_list = function() {
   return dump_action_node_wd(
      this.func, this.accessor_list,
      ast.ASTNode.prototype._dump_word_list.call(this));
}

ast.Module.prototype._dump_word_list = function() {
   let word_list = ast.ASTNode.prototype._dump_word_list.call(this);

   dump_signal_decl_list_wd(word_list, this.signal_declaration_list);
   return word_list;
}

ast.Run.prototype._dump = function(dump_ctx, indent) {
   if (!this.nodebug)
      dump_ctx.wd_list[dump_ctx.idx].instruction_list.push(
	 new Instruction(this._dump_word_list(),
			 indent, dcommon.svc_url(dump_ctx.d_name,
						 this.module_instance_id)));

   let old_idx = dump_ctx.idx;
   let miid = this.module_instance_id;

   dump_ctx.idx = miid;
   dump_ctx.wd_list[dump_ctx.idx] = new WindowDescriptor(miid, this.name,
							 dump_ctx.program_tree);
   this.children[0]._dump(dump_ctx, 0);
   dump_ctx.idx = old_idx;
}

ast.Run.prototype._dump_word_list = function() {
   let word_list = ast.ASTNode.prototype._dump_word_list.call(this);

   word_list.add((this.name ? this.name : "MODULE") +
		 this.module_instance_id);

   //
   // Run has always 1 children, and it is a Local statement.
   //
   let signal_declaration_list = this.children[0].signal_declaration_list;
   for (let i in this.children[0].signal_declaration_list) {
      let sigdecl = this.children[0].signal_declaration_list[i];
      let sig = sigdecl.signal;

      if (sigdecl.name != sig.name) {
	 let present = false;

	 for (let j = 0; j < sig.gate_list.length && !present; j++) {
      	    let gate = sig.gate_list[j];

      	    if (gate.value == true)
      	       present = true;
	 }

	 let word = word_list.add(sigdecl.name + "=" + sig.name,
				  DISP_FG_SIGNAL(present));
	 let v = sig.value instanceof Object ? JSON.stringify(sig.value) : sig.value;
	 word.signal_value = v;
      }
   }
   return word_list;
}

ast.Local.prototype._dump_word_list = function() {
   let word_list = ast.ASTNode.prototype._dump_word_list.call(this);

   //
   // Called modules in RUN are translated into Local. So, we must
   // display module in order to avoid mismatch with the original
   // code.
   //
   if (this.in_run_context)
      word_list[0].body = "MODULE";

   dump_signal_decl_list_wd(word_list, this.signal_declaration_list);
   return word_list;
}

ast.Emit.prototype._dump_word_list = function() {
   let word_list = ast.ASTNode.prototype._dump_word_list.call(this);

   for (let i = 0; i < this.signame_list.length; i++) {
      let name = this.signame_list[i];
      let present = false;
      let sig = this.signal_map[name];
      let gate_list = sig.gate_list;

      for (let j in gate_list) {
	 if (gate_list[j].value == true) {
	    present = true;
	    break;
	 }
      }

      let v = sig.value;
      let w = word_list.add_at(i + 1, name, DISP_FG_SIGNAL(present));
      w.signal_value = v instanceof Object ? JSON.stringify(v) : v;
   }

   if (this.if_func) {
      word_list.add("If");
      dump_action_node_wd(this.if_func, this.if_accessor_list, word_list);
   }
   return word_list;
}

ast.Exec.prototype._dump_word_list = function() {
   let word_list = ast.ASTNode.prototype._dump_word_list.call(this);

   if (this.signal) {
      let present = false;

      for (let i in this.signal.gate_list) {
	 if (this.signal.gate_list[i].value == true) {
	    present = true;
	    break;
	 }
      }

      let v = this.signal.value;
      let w = word_list.add_at(1, this.signame, DISP_FG_SIGNAL(present));
      w.signal_value = v instanceof Object ? JSON.stringify(v) : v;
      dump_action_node_wd(this.func, this.accessor_list, word_list);
   }
   return word_list;
}

ast.Trap.prototype._dump_word_list = function() {
   let word_list = ast.ASTNode.prototype._dump_word_list.call(this);

   word_list.add(this.trapName);
   return word_list;
}

ast.Exit.prototype._dump_word_list = function() {
   let word_list = ast.ASTNode.prototype._dump_word_list.call(this);

   word_list.add(this.trapName + "(" + this.returnCode + ")");
   return word_list;
}

ast.CountExpressionNode.prototype._dump_word_list = function() {
   let word_list = ast.ExpressionNode.prototype._dump_word_list.call(this);

   if (this.func_count) {
      if (this.accessor_list_count.length == 0) {
        word_list.add_at(1, this.func_count());
      } else {
        word_list.add_at(1, "[Runtime count expression]");
      }
   }

   return word_list;
}

//
// Helper functions of the AST visit methods.
//
function dump_signal_decl_list_wd(word_list, signal_declaration_list) {
   for (let i in signal_declaration_list) {
      let sigdecl = signal_declaration_list[i];
      let sig = sigdecl.signal;
      let present = false;

      for (let j = 0; j < sig.gate_list.length && !present; j++) {
	 let gate = sig.gate_list[j];

	 if (gate.value == true) {
	    present = true;
	 }
      }

      let sigil;
      switch (sigdecl.accessibility) {
      case hh.IN:  sigil = 'IN '; break;
      case hh.OUT: sigil = 'OUT '; break;
      default:     sigil = 'INOUT ';  break;
      }

      let word = word_list.add(sigil + sigdecl.name, DISP_FG_SIGNAL(present));
      let v = sig.value;
      word.signal_value = v instanceof Object ? JSON.stringify(v) : v;
   }
}

function dump_action_node_wd(func, accessor_list, word_list) {
   let acc_list_len = accessor_list.length;

   //
   // See signal accessor in signal.js
   //
   function get_signal_status_and_value(signal) {
      let gate_list = signal.gate_list;
      let ret = {
	 status: false,
	 value: signal.value
      };

      for (let i in gate_list) {
	 if (gate_list[i].value == true) {
	    ret.status = true;
	    break;
	 }
      }
      return ret;
   }

   // if (func)
/*    //    word_list.add("CALL" + (func.name ? " " + func.   if (func && acc_list_len > 0) */
/*       word_list.add("USING");                                       */

   if (accessor_list.length > 0) {
      for (let i in accessor_list) {
	 let acc = accessor_list[i];
	 let s_status_value = get_signal_status_and_value(acc.signal);

	 if (acc.get_value) {
	    word_list.add(acc.get_pre ? "PREVAL" : "VAL");
	 } else {
	    word_list.add(acc.get_pre ? "PRE" : "NOW");
	 }
	 word_list.add("(");

	 let word = word_list.add(acc.signame,
				  s_status_value.status ? "red" : "blue");
	 word_list.add(")");
	 let v = s_status_value.value;
	 word.signal_value = v;

      }
   }

   return word_list;
}

//
// The part of the debugger which lives in the host running a reactive
// machine *only*.
//
function MachineDebugger(machine, name) {
   this.machine = machine;
   this.sdebugger_ws = null;
   this.watchpoint_func = null;
   this.stepper = false;
   this.stepper_update_queue = [];
   this.stepper_pending_reaction = 0;
   this.stepper_steps = 0;
   this.recv_seq = 0;
   this.recv_queue = [];
   this.send_seq = 0;
   this.send_queue = [];
   this.name = name;

   this.program_tree = (function make_node(ast_node) {
      function make_children(ast_node) {
	 let children = [];

	 for (let i in ast_node.children) {
	    let child = make_node(ast_node.children[i])

	    if (child)
	       children.push(child);
	    else
	       children = children.concat(make_children(ast_node.children[i]));
	 }
	 return children;
      }

      if (ast_node instanceof ast.Module || ast_node instanceof ast.Run) {
	 return new ProgramTree(name, ast_node.name,
				ast_node.module_instance_id,
				make_children(ast_node));
      }
   })(machine.ast);

   this.wd_list = make_wd_list(machine.ast, this.name, this.program_tree);

   let addr = !hop.isServer ? "localhost" : `localhost:${hop.port}`;
   this.sdebugger_ws = new WebSocket(`ws://${addr}/hop/${dcommon.SDEBUGGER_WS}`)

   this.sdebugger_ws.onmessage = evt => {
      let apply_msg = msg => {
	 this.recv_seq++;
	 switch(msg.type) {
	 case dcommon.STEPPER_NEXT:
	    this.stepper_next(msg.steps);
	    break;
	 case dcommon.STEPPER_ENABLE:
	    this.stepper_enable();
	    break;
	 case dcommon.STEPPER_DISABLE:
	    this.stepper_disable();
	    break;
	 case dcommon.DEBUGGER_OVERRIDEN:
	    console.log("Hiphop.js debugger: debugger name overriden.");
	    this.disable(true);
	    break;
	 case dcommon.WATCHPOINT_ENABLE:
	    this.watchpoint_enable(msg.watchpoint_expr);
	    break;
	 case dcommon.WATCHPOINT_DISABLE:
	    this.watchpoint_disable();
	    break;
	 }
      }

      let msg = dcommon.parse_data(evt);

      if (!msg) {
	 console.log("Hiphop.js debugger: receive empty message. Bug?");
      } else if (msg.seq <= this.recv_seq) {
	 console.log("Hiphop.js debugger: receive message seq <= recv_seq " +
		     " Bug?");
      } else if (msg.seq > this.recv_seq + 1) {
	 dcommon.insert_sort(this.recv_queue, msg);
      } else if (msg.seq == this.recv_seq + 1) {
	 apply_msg(msg);
      } else {
	 console.log("Hiphop.js debugger: receive message invalid seq. Bug?");
      }

      this.recv_queue.forEach((msg, i, q) => {
	 if (msg.seq == this.recv_seq + 1) {
	    q.splice(i, 1);
	    apply_msg(msg);
	 }
      });
   }

   this.sdebugger_ws.onopen = evt => {
      this.send_queue.forEach(msg => this.sdebugger_ws.send(msg));
      this.send_queue = null;
   }

   this.sdebugger_ws.onclose = evt => {
      if (!hop.isServer) {
	 console.log("Hiphop.js debugger: WS closed, disable debugger:\n\n" +
	       "   Server stopped.");
      } else {
	 //
	 // Should never happen
	 //
	 throw new TypeError( "Hiphop.js debugger/server-side: " +
			      "WS closed.", null );
      }
      this.disable(true);
   }

   this.send({ type: dcommon.DEBUGGER_ENABLE, wd_list: this.wd_list });
}
exports.MachineDebugger = MachineDebugger;

MachineDebugger.prototype.send = function(msg) {
   //
   // Hack until Hop.js supports standard WebSocket API
   //
   function is_open() {
      if (!hop.isServer)
	 return state == sd.OPEN;
      return state == 1;
   }

   function is_connecting() {
      if (!hop.isServer)
	 return state == sd.CONNECTING;
      return state == 0;
   }

   let sd = this.sdebugger_ws;
   let state = sd.readyState;

   if (msg) {
      msg.seq = ++this.send_seq;
      msg.d_name = this.name;
      msg = JSON.stringify(msg);
   } else {
      console.log("Hiphop.js debugger: can't send empty message. Bug?");
      return;
   }

   if (is_open()) {
      sd.send(msg);
   } else if (is_connecting()) {
      this.send_queue.push(msg);
   } else {
      if (!hop.isServer) {
	 console.log("Hiphop.js debugger: WS closed, disable debugger:\n\n" +
		     "   Missing require(\"hiphop\") on server?\n" +
		     "   Server stoppted?");
	 this.disable(true);
      } else {
	 //
	 // Should never happen
	 //
	 throw new TypeError( "Hiphop.js debugger/server-side: " +
			      "WS closing/closed.", null );
      }
   }
}

MachineDebugger.prototype.update = function() {
   let new_wd_list = make_wd_list(this.machine.ast, this.name,
				  this.program_tree);
   let diff_list = this.wd_list.map(function(old_wd, idx, arr) {
      return make_diff(old_wd, new_wd_list[idx])
   });

   this.wd_list = new_wd_list;
   this.send({ type: dcommon.DEBUGGER_UPDATE,  diff_list: diff_list });

   if (this.watchpoint_func) {
      let self = signal.generate_this(this.machine,
				      this.watchpoint_accessor_list, 0);

      try {
	 if (this.watchpoint_func.bind(self)()) {
	    this.send({ type: dcommon.WATCHPOINT_REACHED });
	    this.stepper_enable();
	    this.watchpoint_disable();
	 }
      } catch (e) {
	 this.send({ type: dcommon.WATCHPOINT_INVALID });
	 this.watchpoint_disable();
      }
   }
}

MachineDebugger.prototype.disable = function(err=false) {
   if (err)
      this.machine._debugger = null;
   else
      this.send({ type: dcommon.DEBUGGER_DISABLE });

   if (this.stepper)
      this.disable_stepper();
}

MachineDebugger.prototype.stepper_enable = function() {
   if (this.stepper)
      return;
   this.stepper = true;
   this.stepper_input_state = [];
   this.stepper_pending_reaction = 0;
   this.stepper_steps = 0;
   this.send({ type: dcommon.STEPPER_ENABLE });
}

MachineDebugger.prototype.stepper_disable = function() {
   if (!this.stepper)
      return;
   this.stepper_next(0);
   this.stepper = false;
   this.send({ type: dcommon.STEPPER_DISABLE });
}

//
// If steps is 0, then all pending steps are flushed.
//
MachineDebugger.prototype.stepper_next = function(steps) {
   let update_stepper_stats = () => {
      this.stepper_steps++;
      if (this.stepper_pending_reaction > 0)
	 this.stepper_pending_reaction--;
   }
   
   if (!this.stepper)
      return;

   if (!steps) {
      let update;
      while (update = this.stepper_update_queue.shift()) {
	 if (update()) {
	    update_stepper_stats();
	 }
      }
   } else {
      let i = 0;
      while (i < steps) {
	 let update = this.stepper_update_queue.shift();
	 if (!update) {
	    //
	    // If there is no pending updates, stepper_next forces a
	    // reaction.
	    //
	    this.machine._react();
	    i++;
	    update_stepper_stats();
	 } else if (update()) {
	    //
	    // update() can be any operation on reactive machine, like
	    // an input. When it returns true, it means that update()
	    // was a reaction, then, a step.
	    //
	    i++;
	    update_stepper_stats();
	 }
      }
   }

   this.stepper_update();
}

MachineDebugger.prototype.stepper_update = function() {
   this.send({ type: dcommon.STEPPER_UPDATE,
	       remains: this.stepper_pending_reaction,
	       steps: this.stepper_steps });
}

MachineDebugger.prototype.watchpoint_enable = function(watchpoint_expr) {
   try {
      const parsedExpr = watchpoint_expr.replace(/VAL\(\w+\)|PREVAL\(\w+\)|NOW\(\w+\)|PRE\(\w+\)/g, (
	 match,
	 p1,
	 p2,
	 p3,
	 shift,
	 str
      ) => {
	 const len = match.length;

	 if (match.substr(0, 6) === "PREVAL") {
	    return `this.preValue.${match.substr(7, len - 8)}`;
	 } else {
	    const sub3 = match.substr(0, 3);
	    const sig = match.substr(4, len - 5);

	    if (sub3 === "VAL") {
	       return `this.${sig}.nowval`;
	    } else if (sub3 === "PRE") {
	       return `this.${sig}.pre`;
	    } else if (sub3 === "NOW") {
	       return `this.${sig}.now`;
	    } else {
	       console.log(`HIPHOP.JS WARNING: wrong watchpoint expression? match=${match}`);
	       return match;
	    }
	 }
      });
      let func = eval(`(function() {return (${parsedExpr})})`);
      let accessor_list = lang.getAccessorList( func, undefined, null );

      this.watchpoint_func =  func;
      this.watchpoint_accessor_list = accessor_list;
      accessor_list.forEach(acc => {
	 let sig = this.machine.global_signal_map[acc.signame];

	 if (!sig)
	    throw new error.InternalError("Signal not found", null);
	 acc.signal = sig;
      });
   } catch (e) {
      this.watchpoint_disable();
      this.send({ type: dcommon.WATCHPOINT_INVALID });
   }
}

MachineDebugger.prototype.watchpoint_disable = function() {
   this.watchpoint_func = null;
   this.watchpoint_accessor_list = null;
}
