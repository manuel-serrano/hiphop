"use hopscript"

const hh = require("./hiphop.js");
const ast = require("./ast.js");
const error = require("./error.js");
const dsymb = require("./debugger-symbols.js");

const DISP_FG_SIGNAL = test => test ? "red" : "blue";
const DISP_FG_SEL = test => test ? "brown" : "black";
const DISP_BG_GO = test => test ? "#BBFFBB" : "white";

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
   this.url = "/hop/" + dsymb.svc_url(debugger_name, module_instance_id);
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
	 // console.log("******************************** ADD END");
      } else if (!newinstr_list[inew]) {
	 del(idiff);
	 iold++;
	 // console.log("******************************** DEL END");
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
	       // console.log("******************************** ADD MID")
	       add(idiff, cur_newinstr);
	       inew++;
	       idiff++;
	    } else if (diff_line(next_oldinstr, cur_newinstr) !== true) {
	       // console.log("******************************** DEL MID")
	       del(idiff);
	       iold++;
	    } else {
	       del(idiff);
	       add(idiff, cur_newinstr);
	       // console.log("******************************** ADD&DEL MID")
	       iold++;
	       inew++;
	       idiff++;
	    }
	 } else if (c === false) {
	    // console.log("******************************** NOTHING")
	    iold++;
	    inew++;
	    idiff++;
	 } else {
	    for (let i in c) {
	       // console.log("******************************** CHG")
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

   if (!this.nodebug) {
      let instr = new Instruction(this._dump_word_list(), indent);

      instr_list.push(instr);
      if (this.children.length > 0) {
	 instr.word_list.add("{");
	 close_bracket = true;
      }
   }

   for (let i in this.children)
      this.children[i]._dump(dump_ctx, indent + (this.nodebug ? 0 : 1));

   if (close_bracket)
      instr_list.push(new Instruction([new Word("}", "black", "white")],
				      indent));
}

ast.ASTNode.prototype._dump_word_list = function() {
   let word_list = [];

   word_list.add = function(body, fg_color="black", bg_color="white") {
      word_list.push(new Word(body, fg_color, bg_color));
   }
   word_list.add_at = function(pos, body, fg_color="black", bg_color="white") {
      word_list.splice(pos, 0, new Word(body, fg_color, bg_color));
   }

   let sel = this.cinterface.sel ? this.cinterface.sel.value == true : false;
   let go = this.cinterface.res ? this.cinterface.res.value == true : false;

   // VIRER les register list !!!
   // for (let i in this.register_list) {
   //    if (this.register_list[i].value == true) {
   // 	 sel = true;
   // 	 break;
   //    }
   // }

   if (!go) {
      for (let i in this.cinterface.go_list) {
   	 if (this.cinterface.go_list[i].value == true) {
   	    go = true;
   	    break;
   	 }
      }
   }

   if (go) {
      for (let i in this.cinterface.kill_list) {
   	 if (this.cinterface.kill_list[i].value == true) {
   	    go = false;
   	    break;
   	 }
      }
   }

   // if (this instanceof ast.Module) {
   //    console.log(this.cinterface.res.value);
   //    console.log(this.cinterface.go_list[0].value);
   //    console.log(this.cinterface.kill_list[0].value);
   // }
   word_list.add(this.constructor.name, DISP_FG_SEL(sel), DISP_BG_GO(go));
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
			 indent, dsymb.svc_url(dump_ctx.d_name,
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

   word_list.add((this.name ? this.name : "MODULE") + "-" +
		 this.module_instance_id);

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

      	    if (gate.value == true)
      	       present = true;
	 }

	 word_list.add(sig.name + "=" + sigdecl.name, DISP_FG_SIGNAL(present));
      }
   }
   return word_list;
}

ast.Let.prototype._dump_word_list = function() {
   let word_list = ast.ASTNode.prototype._dump_word_list.call(this);

   //
   // Called modules in RUN are translated into Let. So, we must
   // display module in order to avoid mismatch with the original
   // code.
   //
   if (this.in_run_context)
      word_list[0].body = "Module";

   dump_signal_decl_list_wd(word_list, this.signal_declaration_list);
   return word_list;
}

ast.Emit.prototype._dump_word_list = function() {
   let word_list = ast.ASTNode.prototype._dump_word_list.call(this);

   for (let i = 0; i < this.signal_name_list.length; i++) {
      let name = this.signal_name_list[i];
      let present = false;
      let gate_list = this.signal_map[name].gate_list;

      for (let j in gate_list)
	 if (gate_list[j].value == true) {
	    present = true;
	    break;
	 }

      word_list.add_at(i + 1, name, DISP_FG_SIGNAL(present));
   }

   if (this.if_func) {
      word_list.add("If");
      dump_action_node_wd(this.if_func, this.if_accessor_list, word_list);
   }
   return word_list;
}

ast.Exec.prototype._dump_word_list = function() {
   let word_list = ast.ASTNode.prototype._dump_word_list.call(this);
   let present = false;

   for (let i in this.signal.gate_list)
      if (this.signal.gate_list[i].value == true) {
	 present = true;
	 break;
      }

   word_list.add_at(1, this.signal.name, DISP_FG_SIGNAL(present));
   dump_action_node_wd(this.func, this.accessor_list, word_list);
   return word_list;
}

ast.Trap.prototype._dump_word_list = function() {
   let word_list = ast.ASTNode.prototype._dump_word_list.call(this);

   word_list.add(this.trap_name);
   return word_list;
}

ast.Exit.prototype._dump_word_list = function() {
   let word_list = ast.ASTNode.prototype._dump_word_list.call(this);

   word_list.add(this.trap_name + "(" + this.return_code + ")");
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

	 if (gate.value == true)
	    present = true;
      }

      word_list.add(sigdecl.name, DISP_FG_SIGNAL(present));
   }
}

function dump_action_node_wd(func, accessor_list, word_list) {
   let acc_list_len = accessor_list.length;

   //
   // See signal accessor in signal.js
   //
   function get_signal_status(is_gate, runtime) {
      if (is_gate) {
	 for (let i in runtime) {
	    if (runtime[i] && runtime[i].value == true) {
	       return true;
	    }
	 }
      } else {
	 for (let i in runtime) {
	    if (runtime[i]) {
	       for (let j in runtime[i].gate_list) {
		  if (runtime[i].gate_list[j].value == true)
		     return true;
	       }
	    }
	 }
      }
      return false;
   }

   if (func)
      word_list.add("CALL" + (func.name ? " " + func.name : ""));

   if (func && acc_list_len > 0)
      word_list.add("USING");

   if (accessor_list.length > 0) {
      for (let i in accessor_list) {
	 let acc = accessor_list[i];
	 let present = false;

	 if (acc.get_value) {
	    word_list.add(acc.get_pre ? "pre value" : "value");
	    present = get_signal_status(false, acc.runtime);
	 } else {
	    word_list.add(acc.get_pre ? "pre present" : "present");
	    present = get_signal_status(true, acc.runtime);
	 }

	 word_list.add(acc.signal_name, present ? "red" : "blue");
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
   this.seq = 0;
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
   enable_debugger(this.name, this.wd_list);
}
exports.MachineDebugger = MachineDebugger;

MachineDebugger.prototype.update = function() {
   let new_wd_list = make_wd_list(this.machine.ast, this.name,
				  this.program_tree);
   let diff_list = this.wd_list.map(function(old_wd, idx, arr) {
      return make_diff(old_wd, new_wd_list[idx])
   });

   this.wd_list = new_wd_list;
   update_debugger(this.name, ++this.seq, diff_list);
}

MachineDebugger.prototype.disable = function() {
   disable_debugger(this.name);

   //
   // If disabled from server.
   //
   this.machine._debugger = null;
}

//
// API allowing reactive machine and Hop.js server to echange
// debugging data. This API is split into client and server side.
//
// The API uses WebSocket for client/server communication in order to
// know when the client is not connected anymore: if the client has an
// enabled debugger, it can be disabled.
//
// The server-side code also handle the managment of all debuggers and
// the associated hopjs services.
//
var update_debugger;
var enable_debugger;
var disable_debugger;

if (hh.on_client) {
   //
   // Hop.js client only code.
   //
   let host = location.hostname;
   let port = location.port;
   let ws_cli = new WebSocket(`ws://${host}:${port}/hop/${dsymb.DEBUGGER_WS}`);
   let send_queue = [];
   let send = function(msg=null) {
      let state = ws_cli.readyState;

      if (state == ws_cli.CLOSED || state == ws_cli.CLOSING) {
	 //
	 // TODO: disable debugger on client
	 //
	 alert("Hiphop.js debugger: WS closed, disable debugger :\n\n" +
	       "   Missing require(\"hiphop\") on server?\n" +
	       "   Server stoppted?\n" +
	       "   Enabling debugger with same name?");
      } else if (state == ws_cli.OPEN) {
	 send_queue.forEach(el => ws_cli.send(JSON.stringify(el)));
	 send_queue = [];
	 if (msg)
	    ws_cli.send(JSON.stringify(msg));
      } else {
	 if (msg)
	    send_queue.push(msg);
	 setTimeout(send, 1000);
      }
   }

   update_debugger = function(d_name, seq, diff_list) {
      send({ type: dsymb.DEBUGGER_UPDATE, d_name: d_name, diff_list: diff_list,
      	     seq: seq });
   };

   enable_debugger = function(d_name, wd_list) {
      send({ type: dsymb.DEBUGGER_ENABLE, d_name: d_name, wd_list: wd_list });
   };

   disable_debugger = function(d_name) {
      send({ type: dsymb.DEBUGGER_DISABLE, d_name: d_name });
   };
} else {
   //
   // Hop.js server only code.
   //
   // Splited in debugger-server.js file, otherwise the client try to
   // parse the code and triggers wired errors...
   //
   // The debugger-server.js module (hence, this module when on
   // server) must be loaded only once, since it enable a
   // websocketserver.
   //
   let sd = require("./debugger-server.js");

   update_debugger = sd.update_debugger;
   enable_debugger = sd.enable_debugger;
   disable_debugger = sd.disable_debugger;
}
