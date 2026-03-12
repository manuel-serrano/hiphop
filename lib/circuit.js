/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/lib/circuit.js                */
/*    -------------------------------------------------------------    */
/*    Author      :  Colin Vidal, Manuel Serrano                       */
/*    Creation    :  Mon Jul 16 18:06:28 2018                          */
/*    Last change :  Thu Mar 12 09:42:17 2026 (serrano)                */
/*    Copyright   :  2018-26 Inria                                     */
/*    -------------------------------------------------------------    */
/*    HipHop compiler                                                  */
/*    -------------------------------------------------------------    */
/*    The compilation of HipHop programs implements the translations   */
/*    of Chapter 11 & 12 of Berry's book:                              */
/*      The Constructive Semantics of Pure Esterel, Draft Version 3    */
/*      Dec 2022                                                       */
/*=====================================================================*/
"use strict";
"use hopscript";

/*---------------------------------------------------------------------*/
/*    es6 module                                                       */
/*---------------------------------------------------------------------*/
import { Process as process } from "./config.js";
import * as ast from "./ast.js";
import * as error from "./error.js";
import * as net from "./net.js";
import * as signal from "./signal.js";
import * as sweep from "./sweep.js";
import * as causality from "./causality.js";
import { loopSafe } from "./loopsafe.js";
import { basename } from "node:path";
import * as config from "../lib/config.js";
import * as ccutils from "./comp-utils.js";
import { debug, debugTrace, debugTraceCircuit } from "./comp-common.js";
import { Circuit, connectTo, bindSigAccessorList, linkDynamicNode,
	 getSignalObject } from "./comp-common.js";
import * as compNew from "./comp-new.js";
import * as compInt from "./comp-int.js";

export { compile };

/*---------------------------------------------------------------------*/
/*    margins ...                                                      */
/*---------------------------------------------------------------------*/
let debugMargins = ["", " ", "  ", "   ", "    "];
let margin = 0;

function getMargin(margin) {
   if (margin === debugMargins.length) {
      debugMargins.push(debugMargins[margin - 1] + " ");
   }
   return debugMargins[margin];
}

/*---------------------------------------------------------------------*/
/*    traceNode ...                                                    */
/*---------------------------------------------------------------------*/
function traceNode(astNode) {
   if (debug) {
      return `${astNode.constructor.name}[${astNode.depth}|${astNode.trapDepth + 2}]@${astNode.loc.pos} ${astNode.id} (${compiler(astNode)})`
   }
}

/*---------------------------------------------------------------------*/
/*    traceEnter ...                                                   */
/*---------------------------------------------------------------------*/
function traceEnter(...args) {
   if (debug) {
      console.error(getMargin(margin) + ">", ...args);
      margin++;
   }
}

/*---------------------------------------------------------------------*/
/*    traceExit ...                                                    */
/*---------------------------------------------------------------------*/
function traceExit(...args) {
   if (debug) {
      margin--;
      console.error(getMargin(margin) + "<", ...args);
   }
}

/*---------------------------------------------------------------------*/
/*    trace ...                                                        */
/*---------------------------------------------------------------------*/
function trace(...args) {
   if (debug) {
      console.error(getMargin(margin), ...args);
   }
}

/*---------------------------------------------------------------------*/
/*    makeCircuit ::Fork ...                                           */
/*    -------------------------------------------------------------    */
/*    Fig 11.10, page 122                                              */
/*---------------------------------------------------------------------*/
ast.Fork.prototype.makeCircuit = function(comp, env, sigtable) {
   traceEnter(traceNode(this), "...");

   const ccs = this.children
      .filter(c => !(c instanceof ast.Sync))
      .map((c, i, arr) => c.makeCircuit(comp, env, sigtable));
   const circuit = comp.makeForkCircuit(env, this, ccs);
   
   this.circuit = circuit;
   linkDynamicNode(this);

   traceExit(traceNode(this));
   
   return circuit;
}

/*---------------------------------------------------------------------*/
/*    makeCircuit ::Trap ...                                           */
/*---------------------------------------------------------------------*/
ast.Trap.prototype.makeCircuit = function(comp, env, sigtable) {
   traceEnter(traceNode(this), "...");

   const cc0 = this.children[0].makeCircuit(comp, env, sigtable);
   this.circuit = comp.makeTrapCircuit(env, this, cc0);
   linkDynamicNode(this);

   traceExit(traceNode(this));

   return this.circuit;
}

/*---------------------------------------------------------------------*/
/*    makeCircuit ::Exit ...                                           */
/*---------------------------------------------------------------------*/
ast.Exit.prototype.makeCircuit = function(comp, env, sigtable) {
   traceEnter(traceNode(this), "...");

   this.circuit = comp.makeExitCircuit(env, this);
   linkDynamicNode(this);
   
   traceExit(traceNode(this));

   return this.circuit;
}

/*---------------------------------------------------------------------*/
/*    makeCircuit ::Sequence ...                                       */
/*---------------------------------------------------------------------*/
ast.Sequence.prototype.makeCircuit = function(comp, env, sigtable) {
   traceEnter(traceNode(this), "...");

   const ccs =
      this.children.map((c, i, arr) => c.makeCircuit(comp, env, sigtable));

   this.circuit = comp.makeSequenceCircuit(env, this, ccs);
   linkDynamicNode(this);

   traceExit(traceNode(this));

   return this.circuit;
}

/*---------------------------------------------------------------------*/
/*    makeCircuit ::Pause ...                                          */
/*---------------------------------------------------------------------*/
ast.Pause.prototype.makeCircuit = function(comp, env, sigtable) {
   traceEnter(traceNode(this), "...");

   this.circuit = comp.makePauseCircuit(env, this);
   linkDynamicNode(this);
   
   traceExit(traceNode(this));
   
   return this.circuit;
}

/*---------------------------------------------------------------------*/
/*    makeCircuit ::Await ...                                          */
/*---------------------------------------------------------------------*/
ast.Await.prototype.makeCircuit = function(comp, env, sigtable) {
   traceEnter(traceNode(this), "...");
   
   this.circuit = comp.makeAwaitCircuit(env, this);
   
   traceExit(traceNode(this));
   
   return this.circuit;
}

/*---------------------------------------------------------------------*/
/*    makeCircuit ::Every ...                                          */
/*---------------------------------------------------------------------*/
ast.Every.prototype.makeCircuit = function(comp, env, sigtable) {
   traceEnter(traceNode(this), "...");

   const cc0 = this.children[0].makeCircuit(comp, env, sigtable);
   const cloopeach = comp.makeLoopeachCircuit(env, this, cc0);
   const cawait = comp.makeAwaitCircuit(env, this);
   this.circuit = comp.makeSequenceCircuit(env, this, [cawait, cloopeach]);
   linkDynamicNode(this);
   
   traceExit(traceNode(this));
   
   return this.circuit;
}

/*---------------------------------------------------------------------*/
/*    makeCircuit ::LoopEach ...                                       */
/*---------------------------------------------------------------------*/
ast.LoopEach.prototype.makeCircuit = function(comp, env, sigtable) {
   traceEnter(traceNode(this), "...");
   
   const cc0 = this.children[0].makeCircuit(comp, env, sigtable);
   this.circuit = comp.makeLoopeachCircuit(env, this, cc0);
   linkDynamicNode(this);
   traceExit(traceNode(this));

   return this.circuit;
}

/*---------------------------------------------------------------------*/
/*    makeCircuit ::Loop ...                                           */
/*---------------------------------------------------------------------*/
ast.Loop.prototype.makeCircuit = function(comp, env, sigtable) {
   traceEnter(traceNode(this), "...");
   
   const cc0 = this.children[0].makeCircuit(comp, env, sigtable);
   this.circuit = comp.makeLoopCircuit(env, this, cc0);
   linkDynamicNode(this);
   
   traceExit(traceNode(this));

   return this.circuit;
}

/*---------------------------------------------------------------------*/
/*    makeCircuit ::Nothing ...                                        */
/*    -------------------------------------------------------------    */
/*    Fig 11.2, page 115, rules page 150                               */
/*---------------------------------------------------------------------*/
ast.Nothing.prototype.makeCircuit = function(comp, env, sigtable) {
   traceEnter(traceNode(this), "...");
   
   this.circuit = comp.makeNothingCircuit(env, this);
   linkDynamicNode(this);
   
   traceExit(traceNode(this));
   
   return this.circuit;
}

/*---------------------------------------------------------------------*/
/*    makeCircuit ::Atom ...                                           */
/*---------------------------------------------------------------------*/
ast.Atom.prototype.makeCircuit = function(comp, env, sigtable) {
   traceEnter(traceNode(this), "...");

   this.circuit = comp.makeAtomCircuit(env, this);
   linkDynamicNode(this);
   
   traceExit(traceNode(this));
   
   return this.circuit;
}

/*---------------------------------------------------------------------*/
/*    makeCircuit ::Suspend ...                                        */
/*---------------------------------------------------------------------*/
ast.Suspend.prototype.makeCircuit = function(comp, env, sigtable) {
   traceEnter(traceNode(this), "...");
   
   const cc0 = this.children[0].makeCircuit(comp, env, sigtable);
   this.circuit = comp.makeSuspendCircuit(env, this, cc0);
   linkDynamicNode(this);

   traceExit(traceNode(this));

   return this.circuit;
}

/*---------------------------------------------------------------------*/
/*    makeCircuit ::WeakAbort ...                                      */
/*---------------------------------------------------------------------*/
ast.WeakAbort.prototype.makeCircuit = function(comp, env, sigtable) {
   this.circuit = this.children[0].makeCircuit(comp, env, sigtable);

   linkDynamicNode(this);
   return this.circuit;
}

/*---------------------------------------------------------------------*/
/*    makeCircuit ::Abort ...                                          */
/*---------------------------------------------------------------------*/
ast.Abort.prototype.makeCircuit = function(comp, env, sigtable) {
   traceEnter(traceNode(this), "...");

   const cc = this.children[0].makeCircuit(comp, env, sigtable);
   this.circuit = comp.makeAbortCircuit(env, this, cc, false);
   linkDynamicNode(this);
   
   traceExit(traceNode(this));
   
   return this.circuit;
}

/*---------------------------------------------------------------------*/
/*    makeCircuit ::Emit ...                                           */
/*---------------------------------------------------------------------*/
ast.Emit.prototype.makeCircuit = function(comp, env, sigtable) {
   traceEnter(traceNode(this), "...");
   
   this.circuit = comp.makeEmitIfCircuit(env, this);
   linkDynamicNode(this);

   traceExit(traceNode(this));
   
   return this.circuit;
}

/*---------------------------------------------------------------------*/
/*    makeCircuit ::Sustain ...                                        */
/*---------------------------------------------------------------------*/
ast.Sustain.prototype.makeCircuit = function(comp, env, sigtable) {
   traceEnter(traceNode(this), "...");

   const cpause = comp.makePauseCircuit(env, this);
   const cemit = comp.makeEmitIfCircuit(env , this);
   const cseq = comp.makeSequenceCircuit(env, this, [cemit, cpause]);
   this.circuit = comp.makeLoopCircuit(env, this, cseq);

   linkDynamicNode(this);
   
   traceExit(traceNode(this));
   
   return this.circuit;
}

/*---------------------------------------------------------------------*/
/*    makeCircuit ::If ...                                             */
/*---------------------------------------------------------------------*/
ast.If.prototype.makeCircuit = function(comp, env, sigtable) {
   traceEnter(traceNode(this), "...");

   const cc0 = this.children[0].makeCircuit(comp, env, sigtable);
   const cc1 = this.children[1].makeCircuit(comp, env, sigtable);
   
   this.circuit = comp.makeIfCircuit(env, this, [cc0, cc1]);
   linkDynamicNode(this);

   traceExit(traceNode(this));

   return this.circuit;
}

/*---------------------------------------------------------------------*/
/*    makeCircuit ::Halt ...                                           */
/*---------------------------------------------------------------------*/
ast.Halt.prototype.makeCircuit = function(comp, env, sigtable) {
   traceEnter(traceNode(this), "...");
   
   this.circuit = comp.makeHaltCircuit(this, this);
   linkDynamicNode(this);
   
   traceExit(traceNode(this));
	     
   return this.circuit;
}

/*---------------------------------------------------------------------*/
/*    makeCircuit ::Exec ...                                           */
/*---------------------------------------------------------------------*/
ast.Exec.prototype.makeCircuit = function(comp, env, sigtable) {
   const exec_status = {
      id: undefined,
      value: undefined,
      active: false,
      prev_active: false,
      kill: false,
      prev_killed: false,
      suspended: false,
      prev_suspended: false,
      start: false,
      astNode: this,
      signal: this.signame && getSignalObject(env, this.signame, this),
      depth: this.depth,

      // abort or await use this wire instead of signal wire to know
      // when user routine is done
      callback_wire: net.makeOr(this, "callback"),

      func_start: this.func,
      func_susp: this.func_susp,
      func_kill: this.func_kill,
      func_res: this.func_res
   };
   exec_status.callback_wire.sweepable = false;
   this.machine.exec_status_list.push(exec_status);

   //
   // needed for particular case in Abort (via this nested Await
   // instruction) and Emit
   //
   this.exec_status = exec_status;

   //
   // make_await/sequence/emit take account of incarnation levels
   //
   const await_node = comp.makeAwaitCircuit(env, this);

   for (let l = 0; l <= this.depth; l++) {
      const start = new net.ActionNet(
	 this, "start", l, function() {
   	    exec_status.start = true;
	    exec_status.lvl = l;
	 }, []);
      connectTo(await_node.goList[l], start);

      const kill = new net.ActionNet(
	 this, "kill", l, function() {
	    exec_status.kill = true;
	 }, []);
      connectTo(await_node.killList[l], start, net.FAN.NEG);
      connectTo(await_node.killList[l], kill);

      //
      // kill handler must be called in case of abortion
      //
      const andDetectAbort = new net.ActionNet(
	 this, "abort", l, function() {
	    exec_status.kill = true;
	 }, []);
      connectTo(await_node.res, andDetectAbort, net.FAN.NEG);
      connectTo(await_node.susp, andDetectAbort, net.FAN.NEG);
      connectTo(await_node.sel, andDetectAbort);

      const susp = new net.ActionNet(
	 this, "susp", l, function() {
   	    exec_status.suspended = true;
	 }, []);
      connectTo(await_node.susp, susp);
      connectTo(await_node.sel, susp);

      const res = new net.ActionNet(
	 this, "res", l, function() {
   	    exec_status.suspended = false;
	 }, []);
      connectTo(await_node.res, res);
      connectTo(await_node.sel, res);

      bindSigAccessorList(env, this.accessor_list, this, false);
      signal.runtimeSignalAccessor(this, this.accessor_list, l, null);
   }

   if (this.signame) {
      const cemit = comp.makeEmitCircuit(env, this, this.signame);
      this.circuit = comp.makeSequenceCircuit(env, this, [await_node, cemit]);
   } else {
      this.circuit = await_node;
   }

   return this.circuit;
}

/*---------------------------------------------------------------------*/
/*    linkSigDeclList ...                                              */
/*---------------------------------------------------------------------*/
function linkSigDeclList(env, siglist, astNode) {
   siglist.forEach(sigdecl => {
      if (sigdecl.alias) {
	 sigdecl.signal = getSignalObject(env, sigdecl.alias, astNode);
      }
   });
}

/*---------------------------------------------------------------------*/
/*    makeCircuit ::Run ...                                            */
/*---------------------------------------------------------------------*/
ast.Run.prototype.makeCircuit = function(comp, env, sigtable) {
   linkSigDeclList(env, this.sigDeclList, this);

   const nenv = this.sigDeclList.filter(s => s.signal);
   const unbound = this.sigDeclList.filter(s => !s.signal);

   if (unbound.length > 0) {
      unbound.forEach(sigprop => sigprop.alias = undefined);
      const local = new ast.Local("%LOCAL", this.id + "%%unbound", this.loc,
				  this.nodebug, unbound, [this]);
      ast.computeNodeRegisterId(local, this.instr_seq + "%");
      local.depth = this.depth;
      local.machine = this.machine;
      
      return local.makeCircuit(comp, env, sigtable);
   } else {
      this.circuit = this.children[0].makeCircuit(comp, nenv, sigtable);

      linkDynamicNode(this);
      return this.circuit;
   }
}

/*---------------------------------------------------------------------*/
/*    makeCircuit ::Local ...                                          */
/*---------------------------------------------------------------------*/
ast.Local.prototype.makeCircuit = function(comp, env, sigtable) {
   traceEnter(traceNode(this), "...");

   this.circuit = comp.makeLocalCircuit(comp, env, this, sigtable);
   linkDynamicNode(this);

   traceExit(traceNode(this));
   
   return this.circuit;
}

/*---------------------------------------------------------------------*/
/*    makeCircuit ::Module ...                                         */
/*    -------------------------------------------------------------    */
/*    Fig 11.15, page 126                                              */
/*---------------------------------------------------------------------*/
ast.Module.prototype.makeCircuit = function(comp, env, sigtable) {
   traceEnter(traceNode(this), "...");
   
   const boot_reg = new net.RegisterNet(this, "BOOT", 0);
   const const0 = net.makeOr(this, "CONST.0");
   let signalsReady = false;

   //
   // It's mandatory that `boot_reg` propagates BEFORE `const0` the
   // first reaction. It's OK with current known list, but keep that
   // in mind. (we also could make a dependency of `boot_reg` to
   // `const0`?)
   //
   connectTo(const0, boot_reg);
   this.machine.boot_reg = boot_reg;

   // nenv must be constructed incrementally in order to support
   // initialization dependencies
   const nenv = env;

   for (let i = 0; i < this.sigDeclList.length; i++) {
      const sigdecl = this.sigDeclList[i];
      const axs = this.machine.sigPre ? sigtable.get(sigdecl.name) : unOptAxs;
      const s = new signal.Signal(
	 this, sigdecl, axs?.get_pre, null, null, null, this.depth);

      nenv.push(sigdecl);

      if (sigdecl.accessibility & ast.IN) {
	 this.machine.input_signal_map[s.name] = s;

	 //
	 // This is a bit hacky, but it allows to known from the
	 // reactive machine net list if this net is the one of a
	 // global input signal.
	 //
	 // This is important to fill the known list at the beginning
	 // of the reaction: if the net is from an global input
	 // signal, then it must check if the signal has been emitted
	 // by the environment. If it is, the net must be added in the
	 // known list.
	 //
	 // It is quicker and simpler than iterate on the
	 // input_signal_map (which was previously done).
	 //
	 s.netSigList[0].signal = s;

	 // debug
	 if (!(s.netSigList[0] instanceof net.SignalNet)) {
	    throw new Error(`makeCircuit::Module, netSigList[0] not a signal ${s.netSigList[0].constructor.name}`);
	 }
	 if (!(s.netSigList[0].accessibility & ast.INOUT)) {
	    throw new Error(`makeCircuit::Module, netSigList[0] bad accessibility ${s.netSigList[0].accessibility}`);
	 }
      }

      if (sigdecl.accessibility & ast.OUT) {
	 this.machine.output_signal_map[s.name] = s;
      }
      this.machine.global_signal_map[s.name] = s;
      //
      // Signal reinitialization overrides if exists signal
      // initialization.
      //
      if (s.reinit_func) {
	 bindSigAccessorList(env, s.reinit_accessor_list, this, false);
	 const action_reinit = new net.ActionNet(
	    this, "reinit", 0, function() {
	       signal.resume_scope.call(this, s);
	    }, s.reinit_accessor_list);

	 if (!signalsReady) {
	    signalsReady = net.makeOr(this, "global_signals_ready");
	 }
	 
	 connectTo(const0, action_reinit, net.FAN.NEG);
	 connectTo(action_reinit, signalsReady, net.FAN.DEP);
      } else if (s.init_func) {
	 bindSigAccessorList(env, s.init_accessor_list, this, false);
	 const action_init = new net.ActionNet(
	    this, "init", 0, function() {
	       signal.create_scope.call(this, s, 0);
	    }, s.init_accessor_list);
	 
	 if (!signalsReady) {
	    signalsReady = net.makeOr(this, "global_signals_ready");
	 }
	 
	 connectTo(boot_reg, action_init);
	 connectTo(action_init, signalsReady, net.FAN.DEP);
      }
   }

   // compile the whole module
   if (this.children.length > 1)
      throw new Error("too many children!");

   const child = this.children[0];

   child.makeCircuit(comp, nenv, sigtable);

   // signals connections
   if (signalsReady) {
      connectTo(boot_reg, signalsReady);
      connectTo(signalsReady, child.circuit.goList[0]);
   } else {
      connectTo(boot_reg, child.circuit.goList[0]);
   }

   // allocate and connect global sel and res wires
   const global_sel = net.makeOr(this, "global_sel");
   const global_res = net.makeAnd(this, "global_res");
   
   if (debugTrace || debugTraceCircuit.indexOf(this.ctor) >= 0) {
      global_sel.setDebugTrace();
      global_res.setDebugTrace();
   }
   
   connectTo(boot_reg, global_res, net.FAN.NEG);
   connectTo(global_sel, global_res);
   
   // connect child circuit to the module
   if (child.circuit.res) {
      connectTo(global_res, child.circuit.res);
   }

   if (child.circuit.sel) {
      connectTo(child.circuit.sel, global_sel);
   }

   if (child.circuit.killList) {
      child.circuit.killList.forEach(kl => connectTo(const0, kl));
   }

   if (child.circuit.goList && child.circuit.goList[1]) {
      connectTo(const0, child.circuit.goList[1]);
   }

   if (child.circuit.susp) {
      connectTo(const0, child.circuit.susp);
   }

   // Connect sel, K0 (level 0) and K1 (level 0)
   this.machine.sel = child.circuit.sel;
   if (child.circuit.kMatrix[0]) {
      const i0 = child.circuit.kMatrix[0][0];
      const i1 = child.circuit.kMatrix[0][1];

      this.machine.k0 = net.makeOr(this, "global_k0");

      if (i0) connectTo(i0, this.machine.k0);
      if (i1) connectTo(i1, this.machine.k0);
   }

   if (child.circuit.kMatrix[1]) {
      const i0 = child.circuit.kMatrix[1][0];
      const i1 = child.circuit.kMatrix[1][1];

      this.machine.k1 = net.makeOr(this, "global_k1");
      if (i0) connectTo(i0, this.machine.k1);
      if (i1) connectTo(i1, this.machine.k1);
   }

   this.circuit = new Circuit(this,
			      // --
			      [boot_reg],       // GO
			      global_res,       // RES
			      const0,           // SUSP
			      [const0],         // KILL
			      // --
			      global_sel,       // SEL
			      [[this.machine.k0], [this.machine.k1]]); // K

   if (debugTrace || debugTraceCircuit.indexOf(this.ctor) >= 0) {
      const def = boot_reg.getDebugTrace();
      boot_reg.setDebugTrace(function(age) {
	 console.error("====================================================");
	 return def.call(this, age);
      });
   }
   
   traceExit(traceNode(this));

   return this.circuit;
}

/*---------------------------------------------------------------------*/
/*    unOptAxs ...                                                     */
/*---------------------------------------------------------------------*/
const unOptAxs = {
   get_pre: true,
   get_value: true,
   aliases: []
}
   
/*---------------------------------------------------------------------*/
/*    addAxs ...                                                       */
/*---------------------------------------------------------------------*/
function addAxs(axs, table) {
   let o = table.get(axs.signame);

   if (o) {
      if (axs.get_pre && !o.get_pre) {
	 o.get_pre = true;
	 o.aliases.forEach(a => a.get_pre = true);
      }

      if (axs.get_value && !o.get_value) {
	 o.get_value = true;
	 o.aliases.forEach(a => a.get_value = true);
      }
   } else {
      let o = {get_pre: axs.get_pre, get_value: axs.get_value, aliases: []};
      table.set(axs.signame, o);
   }
}

/*---------------------------------------------------------------------*/
/*    addAlias ...                                                     */
/*---------------------------------------------------------------------*/
function addAlias(signame, sigalias, table) {
   let o = table.get(signame);
   let a = table.get(sigalias);

   if (!o) {
      if (!a) {
	 a = {get_pre: false, get_value: false, aliases: []};
	 table.set(sigalias, a);
      }
      o = {get_pre: false, get_value: false, aliases: [a]};
      table.set(signame, o);
   } else {
      if (!a) {
	 a = {get_pre: o.get_pre, get_value: o.get_value, aliases: []};
	 o.aliases.push(o);
      } else {
	 if (o.aliases.indexOf(a) < 0) {
	    a.get_pre != o.get_pre;
	    a.get_value != o.get_value;
	    o.aliases.push(a);
	 }
      }
   }
}

/*---------------------------------------------------------------------*/
/*    collectSigAccesses ...                                           */
/*---------------------------------------------------------------------*/
function collectSigAccesses(node, table) {
   if (node instanceof ast.$ActionNode) {
      if (node.func instanceof ast.$Delay) {
	 node.func.accessor_list.forEach(s => addAxs(s, table));
      } else {
	 node.accessor_list.forEach(s => addAxs(s, table));
      }
      if (node instanceof ast.$Emit) {
	 node.if_accessor_list.forEach(s => addAxs(s, table));
      }
   } else if (node instanceof ast.$Exec) {
      node.accessor_list.forEach(s => addAxs(s, table));
   } else if (node instanceof ast.$Run) {
      node.sigDeclList.forEach(sigprop => {
	 const { name, alias } = sigprop;

	 addAlias(name, alias, table);
      });
   }

   node.children.forEach(n => collectSigAccesses(n, table));
}

/*---------------------------------------------------------------------*/
/*    reentrantSurface ...                                             */
/*    -------------------------------------------------------------    */
/*    The surface of loop (everything before the first yields)         */
/*    is reentrant, i.e., contains no par and no local.                */
/*---------------------------------------------------------------------*/
function reentrantSurface(nodes) {
   
   function reentrantNode(n) {
      if (n instanceof ast.Pause) {
	 return true;
      } if (n instanceof ast.If) {
	 const l = reentrantSurface(n.children[0]);
	 const r = reentrantSurface(n.children[1]);

	 if (l && r) {
	    return true;
	 } else if (l === false || r === false) {
	    return false;
	 }
      } else if (n instanceof ast.Sequence) {
	 const r = reentrantSurface(n.children);
	 if (r === true) {
	    return true;
	 } else if (r === false) {
	    return false;
	 }
      } else if (n instanceof ast.Atom) {
	 return undefined;
      } else if (n instanceof ast.Emit) {
	 return undefined;
      } else if (n instanceof ast.Await) {
	 if (!n.immediate) {
	    return true;
	 } else {
	    return undefined;
	 }
      } else if (n instanceof ast.Halt) {
	 return true;
      } else if (n instanceof ast.Nothing) {
	 return undefined;
      } else if (n instanceof ast.Exit) {
	 return undefined;
      } else if (n instanceof ast.Trap) {
	 return false;
      } else if (n instanceof ast.Abort) {
	 const r = reentrantSurface(n.children);
	 if (r === true) {
	    return true;
	 } else if (r === false) {
	    return false;
	 }
	 return undefined;
      } else if (n instanceof ast.Suspend) {
	 const r = reentrantSurface(n.children);
	 if (r === true) {
	    return true;
	 } else if (r === false) {
	    return false;
	 }
	 return undefined;
      } else if (n instanceof ast.Loop) {
	 const r = reentrantSurface(n.children);

	 if (r === true) {
	    return true;
	 } else if (r === false) {
	    return false;
	 }
      } else {
	 //console.error("NOT REENTRANT:", n.constructor.name);
	 return false;
      }
   }
   
   if (nodes.length === 0) {
      return true;
   } else {
      for (let i = 0; i < nodes.length; i++) {
	 const r = reentrantNode(nodes[i]);
	 
	 if (r === true) {
	    return true;
	 } else if (r === false) {
	    return false;
	 }
      }
      return undefined;
   }
}

/*---------------------------------------------------------------------*/
/*    reentrantTails ...                                               */
/*    -------------------------------------------------------------    */
/*    The tails of a loop (everything after the last yields) are all   */
/*    reentrant.                                                       */
/*---------------------------------------------------------------------*/
function reentrantTails(nodes) {

   function reentrantNodes(nodes) {
      for (let i = nodes.length - 1; i >= 0; i--) {
	 // walk the children from bottom to top
	 const n = nodes[i];

	 if (n instanceof ast.Pause) {
	    return true;
	 } else if (n instanceof ast.Await) {
	    if (!n.immediate) {
	       return true;
	    } else {
	       break;
	    }
	 } else if (n instanceof ast.Atom) {
	    return false;
	 } else if (n instanceof ast.Emit) {
	    continue;
	 } else if (n instanceof ast.Halt) {
	    return true;
	 } else if (n instanceof ast.Nothing) {
	    continue;
	 } else if (n instanceof ast.Sequence) {
	    const r = reentrantNodes(n.children);

	    if (r === true) {
	       return true;
	    } else if (r === undefined) {
	       continue;
	    } else {
	       return false;
	    }
	 } else if (n instanceof ast.If) {
	    const l = reentrantTails([n.children[0]]);
	    const r = reentrantTails([n.children[1]]);

	    if (l === true && r === true) {
	       return true;
	    } else {
	       return false;
	    }
	 } else {
	    return false;
	 }
      }

      return undefined;
   }

   return reentrantNodes(nodes);
}

/*---------------------------------------------------------------------*/
/*    safeLoopBody ...                                                 */
/*    -------------------------------------------------------------    */
/*    A loop body is safe if it contains no fork, no local             */
/*    definitions, and no trap.                                        */
/*---------------------------------------------------------------------*/
function safeLoopBody(nodes) {

   function unsafe(n) {
      if (n instanceof ast.Fork || n instanceof ast.Local || n instanceof ast.Trap) {
	 return true;
      } else if (!n.children) {
	 return false;
      } else {
	 return n.children.find(unsafe);
      }
   }

   return !nodes.find(unsafe);
}

/*---------------------------------------------------------------------*/
/*    reincarnatingLoop ...                                            */
/*    -------------------------------------------------------------    */
/*    Returns true iff the loop exhibits re-incarnation problem and    */
/*    needs duplication (if circuit re-incarnation is disabled).       */
/*---------------------------------------------------------------------*/
function reincarnatingLoop(node) {
   if (reentrantSurface(node.children) === true) {
      return false;
   } else if (reentrantTails(node.children) === true) {
      return false;
   } else if (safeLoopBody(node.children) === true) {
      return false;
   }
   return true;
}

/*---------------------------------------------------------------------*/
/*    unrollLoop ...                                                   */
/*---------------------------------------------------------------------*/
function unrollLoop(astNode) {
   astNode.children = astNode.children.map(unrollLoop);

   if ((astNode instanceof ast.Loop) && reincarnatingLoop(astNode)) {
      if (astNode.children.length > 1) {
	 throw new Error("unrollLoop: bad formed loop");
      }
      const p = astNode.children[0];
      const p2 = p.duplicate()
	 .acceptAuto(n => {
	    n.machine = astNode.machine;
	    n.ctor += "'";
	 });
      //console.error("unroll", p.constructor.name);
      const seq = new ast.Sequence("SEQUENCE", null, astNode.loc,
				   astNode.nodebug,
				   [ p, p2 ]);
      astNode.children = [ seq ];

      seq.parent = astNode;

      return astNode;
   } else if (astNode instanceof ast.LoopEach) {
      // LoopEach requires to be expanded into abort/halt form before
      // being duplicated
      const loc = astNode.loc;
      const nodebug = astNode.nodebug;
      const func = astNode.func;
      const axs = astNode.accessor_list;
      
      const halt = new ast.Halt("HALT", null, loc, nodebug);
      const seq = new ast.Sequence("SEQUENCE", null, loc, nodebug,
				   astNode.children.concat([halt]));
      const abort = new ast.Abort("ABORT", null, loc, nodebug,
				   astNode.func, astNode.accessor_list,
				   false,
				   astNode.func_count,
				   astNode.accessor_list_count,
				   [seq]);
      const loop = new ast.Loop("LOOP", null, loc, nodebug, [abort]);
      loop.parent = astNode.parent;
      
      return unrollLoop(loop);
   } else if (astNode instanceof ast.Every) {
      // Every requires to be expanded into abort/halt form before
      // being duplicated
      const loc = astNode.loc;
      const nodebug = astNode.nodebug;
      const func = astNode.func;
      const axs = astNode.accessor_list;

      const wait = new ast.Await("AWAIT", null, loc, nodebug,
				  astNode.func, astNode.accessor_list,
				  astNode.immediate,
				  astNode.func_count,
				  astNode.accessor_list_count);
      const loopeach = new ast.LoopEach("LOOPEACH", null, loc, nodebug,
					astNode.children,
					astNode.func, astNode.accessor_list,
					astNode.func_count,
					astNode.accessor_list_count);
      const seq = new ast.Sequence("SEQUENCE", null, loc, nodebug,
				   [wait, loopeach]);
      seq.parent = astNode.parent;
					
      return unrollLoop(seq);
   } else {
      return astNode;
   }
}

/*---------------------------------------------------------------------*/
/*    trapLoop ...                                                     */
/*    -------------------------------------------------------------    */
/*    True iff the loop contains a trap.                               */
/*---------------------------------------------------------------------*/
function trapLoop(nodes) {
   
  function trapNode(n) {
     if (n instanceof ast.If) {
	return n.children.find(trapNode);
     } else if (n instanceof ast.Sequence) {
	return n.children.find(trapNode);
     } else if (n instanceof ast.Trap) {
	 return true;
      } else if (n instanceof ast.Abort) {
	 return true;
      } else if (n instanceof ast.Suspend) {
	 return true;
      } else {
	 return false;
      }
   }

   return nodes.find(trapNode);
}

/*---------------------------------------------------------------------*/
/*    unrollTrapLoop ...                                               */
/*---------------------------------------------------------------------*/
function unrollTrapLoop(astNode) {
   astNode.children = astNode.children.map(unrollTrapLoop);

   if ((astNode instanceof ast.Loop) && trapLoop(astNode.children)) {
      if (astNode.children.length > 1) {
	 throw new Error("unrollTrapLoop: bad formed loop");
      }
      const p = astNode.children[0];
      const p2 = p.duplicate()
	 .acceptAuto(n => {
	    n.machine = astNode.machine;
	    n.ctor += "'";
	 });

      const seq = new ast.Sequence("SEQUENCE", null, astNode.loc,
				   astNode.nodebug,
				   [ p, p2 ]);
      astNode.children = [ seq ];

      seq.parent = astNode;

      return astNode;
   } else {
      return astNode;
   }
}
   
/*---------------------------------------------------------------------*/
/*    expandLoop ...                                                   */
/*---------------------------------------------------------------------*/
function expandLoop(astNode) {
   astNode.children = astNode.children.map(expandLoop);

   if (astNode instanceof ast.LoopEach) {
      // LoopEach requires to be expanded into abort/halt form before
      // being duplicated
      const loc = astNode.loc;
      const nodebug = astNode.nodebug;
      const func = astNode.func;
      const axs = astNode.accessor_list;
      
      const halt = new ast.Halt("HALT", null, loc, nodebug);
      const seq = new ast.Sequence("SEQUENCE", null, loc, nodebug,
				   astNode.children.concat([halt]));
      const abort = new ast.Abort("ABORT", null, loc, nodebug,
				   astNode.func, astNode.accessor_list,
				   false,
				   astNode.func_count,
				   astNode.accessor_list_count,
				   [seq]);
      const loop = new ast.Loop("LOOP", null, loc, nodebug, [abort]);
      loop.parent = astNode.parent;
      
      return expandLoop(loop);
   } else if (astNode instanceof ast.Every) {
      // Every requires to be expanded into abort/halt form before
      // being duplicated
      const loc = astNode.loc;
      const nodebug = astNode.nodebug;
      const func = astNode.func;
      const axs = astNode.accessor_list;

      const wait = new ast.Await("AWAIT", null, loc, nodebug,
				  astNode.func, astNode.accessor_list,
				  astNode.immediate,
				  astNode.func_count,
				  astNode.accessor_list_count);
      const loopeach = new ast.LoopEach("LOOPEACH", null, loc, nodebug,
					astNode.children,
					astNode.func, astNode.accessor_list,
					astNode.func_count,
					astNode.accessor_list_count);
      const seq = new ast.Sequence("SEQUENCE", null, loc, nodebug,
				   [wait, loopeach]);
      seq.parent = astNode.parent;
					
      return expandLoop(seq);
   } else {
      return astNode;
   }
}

/*---------------------------------------------------------------------*/
/*    compile ...                                                      */
/*---------------------------------------------------------------------*/
function compile(mach) {
   const { nodeDepth, comp } = mach.compiler === "int" ? compInt : compNew;
   let astNode = mach.ast;

   mach.nets = [];
   mach.input_signal_map = {};
   mach.output_signal_map = {};
   mach.local_signal_list = [];

   astNode.mach = mach;

   // reject non loop-safe programs
   if (mach.loopSafe) {
      loopSafe(astNode);
   }

   if (mach.loopUnroll) {
      // unroll loops as an alternative to reincarnation
      astNode = unrollLoop(astNode);
   } else {
      if (mach.loopTrapUnroll && !mach.reincarnationTrap) {
	 astNode = unrollTrapLoop(astNode);
      }
      if (mach.loopExpand) {
	 // expand loopeach and every for debug
	 astNode = expandLoop(astNode);
      }
   }

   // reparent the whole subtree
   astNode.acceptAuto(p => p.children.forEach(c => c.parent = p));
   net.resetNetId();
   
   const sigtable = new Map();

   // collect .pre and .preval signal properties
   if (mach.sigPre) {
      collectSigAccesses(astNode, sigtable);
   }

   // Elaboration and linking stage
   astNode.acceptAuto(new ccutils.InitVisitor(mach));
   astNode.accept(new ccutils.SignalVisitor(mach));
   astNode.accept(new ccutils.TrapVisitor());

   ast.computeNodeRegisterId(astNode, "0");

   if (mach.reincarnation) {
      nodeDepth(astNode);
   }

   astNode.makeCircuit(comp, [], sigtable);

   // send 0 to all unconnected wires
   mach.nets.forEach(n => {
      if (n.faninList.length === 0 && n instanceof net.WireNet) {
	 const const0 = net.makeOr(n.astNode, "unconnect", n.lvl);
	 connectTo(const0, n);
      }
   });

   // optimize the generated circuit
   sweep.sweep(mach);

   mach.nets.forEach(net => net.reset(true));
   mach.boot_reg.nextValue = true;

   const { loc, size, signals, json, posFlag } =
      causality.findCausalityError(mach, true);
   
   if (size > 0 && mach.verbose >= 3) {
      console.error(`Warning: Potential causality cycle`, json);
   }
}
