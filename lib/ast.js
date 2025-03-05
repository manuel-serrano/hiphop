/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/lib/ast.js                    */
/*    -------------------------------------------------------------    */
/*    Author      :  Colin Vidal                                       */
/*    Creation    :  Mon Jul 16 18:04:46 2018                          */
/*    Last change :  Wed Mar  5 10:18:58 2025 (serrano)                */
/*    Copyright   :  2018-25 serrano                                   */
/*    -------------------------------------------------------------    */
/*    HipHop AST                                                       */
/*=====================================================================*/
"use strict"
"use hopscript"

/*---------------------------------------------------------------------*/
/*    es6 module                                                       */
/*---------------------------------------------------------------------*/
import { ReactiveMachine } from "./machine.js";
import * as error from "./error.js";
import * as net from "./net.js";

export { IN, OUT, INOUT, LOCAL };
export { $ASTNode, ASTNode, $ActionNode, ActionNode, ExpressionNode, CountExpressionNode };
export { $Emit, Emit, Sustain };
export { Nothing, Pause, Trap, Exit, Halt, Atom, Await };
export { Module, Interface, Run, Frame, Local, $Exec, Exec }; 
export { Abort, WeakAbort, Loop, LoopEach, Every, Suspend, Fork, If, Sequence };
export { SignalAccessor, SignalProperties };
export { computeNodeRegisterId };
export { findFrameNode };

/*---------------------------------------------------------------------*/
/*    signal accessibility                                             */
/*---------------------------------------------------------------------*/
const IN = 1;    //  001, is in ? === accessibility & 1
const INOUT = 3; //  011
const OUT = 2;   //  010, is out ? === accessibility & 2
const LOCAL = 4; //  100

/*---------------------------------------------------------------------*/
/*    inDuplicate ...                                                  */
/*---------------------------------------------------------------------*/
let inDuplicate = false;

/*---------------------------------------------------------------------*/
/*    cloneId ...                                                      */
/*---------------------------------------------------------------------*/
function cloneId(id) {
   if (!inDuplicate) {
      return id;
   } else if (id) {
      return id.replace(/_'[0-9]+$/, "") + "_'" + idCnt++;
   } else {
      return id;
   }
}

let idCnt = 0;

/*---------------------------------------------------------------------*/
/*    ASTNode ...                                                      */
/*---------------------------------------------------------------------*/
// @sealed
class $ASTNode {
   ctor;
   tag;
   loc;
   machine;
   children;
   depth;
   id;
   circuit;
   net_list;
   instr_seq;
   next_register_id;
   dynamic;
   nodebug;
   trapDepth;
   
   constructor(tag, id, loc, nodebug, children) {
      if (!children) {
	 children = [];
      } else if (children instanceof $ASTNode) {
	 children = [children];
      } else if (!(children instanceof Array)) {
	 throw new TypeError(tag + ": bad form", loc);
      }

      this.ctor = this.constructor.name;
      this.tag = tag;
      this.loc = loc;
      this.machine = null;
      this.children = children;
      this.depth = 0;
      this.id = id;
      this.trapDepth = 0;

      //
      // unset here, use in compiler to store circuit interface on make
      // circuit phase, and connect on others circuit on connect circuit
      // phase
      //
      this.circuit = null;
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
      this.dynamic = false;

      //
      // Tell the debugger / pretty printer of the program to not display
      // this instruction. If children exists, they will be displayed.
      //
      this.nodebug = nodebug ? true : false;
   }
   
   accept(visitor) {
      if (typeof visitor === "function") {
	 visitor.visit(this);
      } else {
	 visitor.visit(this);
      }
      return this;
   }

   acceptAuto(visitor) {
      if (typeof visitor === "function") {
	 visitor(this);
      } else {
	 visitor.visit(this);
      }
      this.children.forEach(c => c.acceptAuto(visitor));
      return this;
   }

   clone() {
      throw new error.InternalError("`clone` must be implemented", this.loc);
   }

   duplicate() {
      // as clone but distinguishes identifier
      const old = inDuplicate;
      inDuplicate = true;
      const c = this.clone();
      inDuplicate = old;
      return c;
   }
   
   clone_children() {
      return this.children.map(c => c.clone());
   }
}

class ASTNode extends $ASTNode { 
   constructor(tag, id, loc, nodebug, children) {
      super(tag, id, loc, nodebug, children);
   }
};

/*---------------------------------------------------------------------*/
/*    ActionNode ...                                                   */
/*---------------------------------------------------------------------*/
// @sealed
class $ActionNode extends $ASTNode {
   func;
   accessor_list;
   
   constructor(tag, id, loc, nodebug, children, func, accessor_list) {
      super(tag, id, loc, nodebug, children);

      this.func = func;
      this.accessor_list = accessor_list;
   }
}

class ActionNode extends $ActionNode {
   constructor(tag, id, loc, nodebug, children, func, accessor_list) {
      super(tag, id, loc, nodebug, children, func, accessor_list);
   }
}

/*---------------------------------------------------------------------*/
/*    ExpressionNode ...                                               */
/*---------------------------------------------------------------------*/
// @sealed
class $ExpressionNode extends $ActionNode {
   immediate;
   
   constructor(tag, id, loc, nodebug, children, func, accessor_list, immediate) {
      super(tag, id, loc, nodebug, children, func, accessor_list);

      this.immediate = immediate;
   }
}

class ExpressionNode extends $ExpressionNode {
   constructor(tag, id, loc, nodebug, children, func, accessor_list, immediate) {
      super(tag, id, loc, nodebug, children, func, accessor_list, immediate);
   }
}

/*---------------------------------------------------------------------*/
/*    CountExpressionNode ...                                          */
/*---------------------------------------------------------------------*/
// @sealed
class $CountExpressionNode extends $ExpressionNode {
   func_count;
   accessor_list_count;
   
   constructor(tag, id, loc, nodebug, children, func, accessor_list,
	       immediate, func_count, accessor_list_count) {
      super(tag, id, loc, nodebug, children, func, accessor_list, immediate);

      this.func_count = func_count;
      // MS17feb2025, I'm not 100% that it is correct to merge the two lists.
      // If not, the parser must be ale to distinguish them.
      this.accessor_list_count = accessor_list.concat(accessor_list_count);
   }
}

class CountExpressionNode extends $CountExpressionNode {
   constructor(tag, id, loc, nodebug, children, func, accessor_list,
	       immediate, func_count, accessor_list_count) {
      super(tag, id, loc, nodebug, children, func, accessor_list,
	    immediate, func_count, accessor_list_count);
   }
}

/*---------------------------------------------------------------------*/
/*    Emit ...                                                         */
/*---------------------------------------------------------------------*/
// @sealed
class $Emit extends $ActionNode {
   signame_list;
   if_func;
   if_accessor_list;
   signal_map;
      
   constructor(tag, id, loc, nodebug,
		signame_list, func, accessor_list, if_func,
		if_accessor_list) {
      super(tag, id, loc, nodebug, undefined, func, accessor_list);
      
      //
      // signame_list does not need to be cloned when the AST is
      // cloned since it is never modified.
      //
      this.signame_list = signame_list;
      this.if_func = if_func;
      this.if_accessor_list = if_accessor_list;
      //
      // Signal objects of emitted signal. Used by debugger. Not clone!
      //
      this.signal_map = {};
   }
   
   clone() {
      return new Emit(this.tag, cloneId(this.id),
		      this.loc, this.nodebug, 
		      this.signame_list,
		      this.func, clone_list(this.accessor_list),
		      this.if_func, clone_list(this.if_accessor_list));
   }
}

class Emit extends $Emit {
   constructor(tag, id, loc, nodebug,
		signame_list, func, accessor_list, if_func,
		if_accessor_list) {
      super(tag, id, loc, nodebug,
	 signame_list, func, accessor_list, if_func,
	 if_accessor_list);
   }
}

/*---------------------------------------------------------------------*/
/*    Sustain ...                                                      */
/*---------------------------------------------------------------------*/
// @sealed
class $Sustain extends $Emit {
   constructor(tag, id, loc, nodebug, signame_list, func, accessor_list,
		 if_func, if_accessor_list) {
      super(tag, id, loc, 
	     nodebug, signame_list, func, accessor_list,
	     if_func, if_accessor_list);
   }
   
   clone() {
      return new Sustain(this.tag, cloneId(this.id),
			 this.loc, this.nodebug, 
			 this.signame_list,
			 this.func, clone_list(this.accessor_list),
			 this.if_func, clone_list(this.if_accessor_list));
   }
}

class Sustain extends $Sustain {
   constructor(tag, id, loc, nodebug,
		signame_list, func, accessor_list, if_func,
		if_accessor_list) {
      super(tag, id, loc, nodebug,
	 signame_list, func, accessor_list, if_func,
	 if_accessor_list);
   }
}

/*---------------------------------------------------------------------*/
/*    Nothing ...                                                      */
/*---------------------------------------------------------------------*/
// @sealed
class $Nothing extends $ASTNode {
   constructor(tag, id, loc, nodebug) {
      super(tag, id, loc, nodebug, undefined);
   }
   
   clone() {
      return new Nothing(this.tag, cloneId(this.id),
			 this.loc, this.nodebug);
   }
   
   appendChild(ast_node, oneshot_reg = true) {
      throw new SyntaxError("Illegal parent for appendChild", this.loc);
   }

   removeChild(ast_node) {
   }
}

class Nothing extends $Nothing {
   constructor(tag, id, loc, nodebug) {
      super(tag, id, loc, nodebug);
   }
}

/*---------------------------------------------------------------------*/
/*    Pause ...                                                        */
/*---------------------------------------------------------------------*/
// @sealed
class $Pause extends $ASTNode {
   constructor(tag, id, loc, nodebug) {
      super(tag, id, loc, nodebug, undefined);
   }
   
   clone() {
      return new Pause(this.tag, cloneId(this.id),
		       this.loc, this.nodebug);
   }
}

class Pause extends $Pause {
   constructor(tag, id, loc, nodebug) {
      super(tag, id, loc, nodebug);
   }
}
   
/*---------------------------------------------------------------------*/
/*    Trap ...                                                         */
/*---------------------------------------------------------------------*/
// @sealed
class $Trap extends $ASTNode {
   trapName;
   
   constructor(tag, id, loc, nodebug, trap_name, children) {
      super(tag, id, loc, nodebug, children);
      this.trapName = trap_name;
   }
   
   clone() {
      return new Trap(this.tag, cloneId(this.id),
		      this.loc, this.nodebug, this.trapName,
		      this.clone_children());
   }
}

class Trap extends $Trap {
   constructor(tag, id, loc, nodebug, trap_name, children) {
      super(tag, id, loc, nodebug, trap_name, children);
   }
}

/*---------------------------------------------------------------------*/
/*    Exit ...                                                         */
/*---------------------------------------------------------------------*/
// @sealed
class $Exit extends $ASTNode {
   returnCode = 1;
   
   constructor(tag, id, loc, nodebug, trap_name) {
      super(tag, id, loc, nodebug, undefined);
      this.trapName = trap_name;
   }
   
   clone() {
      return new Exit(this.tag, cloneId(this.id),
		      this.loc, this.nodebug, this.trapName);
   }
}

class Exit extends $Exit {
   constructor(tag, id, loc, nodebug, trap_name) {
      super(tag, id, loc, nodebug, trap_name);
   }
}
   
/*---------------------------------------------------------------------*/
/*    Halt ...                                                         */
/*---------------------------------------------------------------------*/
// @sealed
class $Halt extends $ASTNode {
   constructor(tag, id, loc, nodebug) {
      super(tag, id, loc, nodebug, undefined);
   }
   
   clone() {
      return new Halt(this.tag, cloneId(this.id),
		      this.loc, this.nodebug);
   }
}

class Halt extends $Halt {
   constructor(tag, id, loc, nodebug) {
      super(tag, id, loc, nodebug);
   }
}
   
/*---------------------------------------------------------------------*/
/*    Atom ...                                                         */
/*---------------------------------------------------------------------*/
// @sealed
class $Atom extends $ActionNode {
   frame;
   
   constructor(tag, id, loc, nodebug, func, frame, accessor_list) {
      super(tag, id, loc, nodebug, undefined, func, accessor_list);
      // frame are only used to pass module parameters
      this.frame = frame;
   }
   
   clone() {
      return new Atom(this.tag, cloneId(this.id),
		      this.loc, this.nodebug, 
		      this.func, this.frame, clone_list(this.accessor_list));
   }
}

class Atom extends $Atom {
   constructor(tag, id, loc, nodebug, func, frame, accessor_list) {
      super(tag, id, loc, nodebug, func, frame, accessor_list);
   }
}

/*---------------------------------------------------------------------*/
/*    Await ...                                                        */
/*---------------------------------------------------------------------*/
// @sealed
class $Await extends $CountExpressionNode {
   constructor(tag, id, loc, nodebug, func, accessor_list, immediate,
		func_count, accessor_list_count) {
      super(tag, id, loc,
	     nodebug, undefined, func,
	     accessor_list, immediate, func_count,
	     accessor_list_count);
   }
   
   clone() {
      return new Await(this.tag, cloneId(this.id),
		       this.loc, this.nodebug, this.func,
		       clone_list(this.accessor_list),
		       this.immediate, this.func_count,
		       clone_list(this.accessor_list_count));
   }
}

class Await extends $Await {
   constructor(tag, id, loc, nodebug, func, accessor_list, immediate,
		func_count, accessor_list_count) {
      super(tag, id, loc, nodebug, func, accessor_list, immediate,
	 func_count, accessor_list_count);
   }
}
   
/*---------------------------------------------------------------------*/
/*    Module ...                                                       */
/*---------------------------------------------------------------------*/
// @sealed
class $Module extends $ASTNode {
   sigDeclList;
   module_instance_id;
   name;
   interface;
   
   constructor(tag, id, loc, name, sigdecllist, children) {
      super(tag, id, loc, false, children);
      this.sigDeclList = sigdecllist;
      this.module_instance_id = null;
      this.name = name;
      this.interface = sigdecllist;
   }

   clone() {
      return new Module(this.tag, cloneId(this.id),
			this.loc, this.name,
			clone_list(this.sigDeclList),
			this.clone_children());
   }

   static getMachine(self) {
      if (!self.machine) self.machine = new ReactiveMachine(self);
      return self.machine;
   }
      
   compile() {
      new ReactiveMachine(this).compile();
   }
   
   react(sigs) {
      return Module.getMachine(this).react(sigs);
   }
   
   input(...args) {
      const m = Module.getMachine(this);
      return m.input.apply(m, args);
   }
   
   output() {
      const m = Module.getMachine(this);
      return m.output();
   }
   
   addEventListener(signame, ltn) {
      Module.getMachine(this).addEventListener(signame, ltn);
   }      
      
   removeEventListener(signame, ltn) {
      Module.getMachine(this).removeEventListener(signame, ltn);
   }      
}

class Module extends $Module {
   constructor(tag, id, loc, name, sigdecllist, children) {
      super(tag, id, loc, name, sigdecllist, children);
   }
}
   
/*---------------------------------------------------------------------*/
/*    Interface ...                                                    */
/*    -------------------------------------------------------------    */
/*    Interfaces are resolved at AST elaboration time. That is, they   */
/*    disapear when the AST is built and so the class Interface is     */
/*    not a subclass of ASTNode.                                       */
/*---------------------------------------------------------------------*/
// @sealed
class Interface {
   id;
   sigDeclList;
   
   constructor(id, sigdecllist, mirror) {
      
      function mirrorDir(dir) {
	 switch(dir) {
	    case IN: return OUT;
	    case OUT: return IN;
	    default: return INOUT;
	 }
      }
	 
      function mirrorSig(sp) {
	 return new SignalProperties(sp.id, sp.loc, sp.name,
				      mirrorDir(sp.accessibility),
				      sp.init_func, sp.init_accessor_list,
				      sp.reinit_func, 
				      sp.reinit_accessor_list,
				      sp.combine_func,
				      sp.alias);
      }
      
      this.id = id;
      this.sigDeclList = mirror ? sigdecllist.map(mirrorSig) : sigdecllist;
   }
}

/*---------------------------------------------------------------------*/
/*    RUN ...                                                          */
/*---------------------------------------------------------------------*/
// @sealed
class $Run extends $ASTNode {
   module_instance_id;
   name;
   sigDeclList;
   autoComplete;
   autoCompleteStrict;
   frame;
   
   constructor(tag, id, loc, name, nodebug, sigdecllist, autocomplete, autocompletestrict, frame, body) {
      super(tag, id, loc, nodebug, body);
      this.module_instance_id = null;
      this.name = name;
      this.sigDeclList = sigdecllist;
      this.autoComplete = autocomplete;
      this.autoCompleteStrict = autocompletestrict;
      this.frame = frame;
   }
   
   clone() {
      return new Run(this.tag, cloneId(this.id),
		     this.loc, this.name, this.nodebug,
		     clone_list(this.sigDeclList), 
		     this.autoComplete, this.autoCompletestrict, this.frame,
		     this.clone_children());
   }
}

class Run extends $Run {
   constructor(tag, id, loc, name, nodebug, sigdecllist, autocomplete, autocompletestrict, frame, body) {
      super(tag, id, loc, name, nodebug, sigdecllist, autocomplete, autocompletestrict, frame, body);
   }
}

/*---------------------------------------------------------------------*/
/*    Frame ...                                                        */
/*---------------------------------------------------------------------*/
// @sealed
class $Frame extends $ASTNode {
   clone;
   
   constructor(tag, id, loc, clone) {
      super(tag, id, loc, false, null);
      this.clone = clone;
   }
}

class Frame extends $Frame {
   constructor(tag, id, loc, clone) {
      super(tag, id, loc, clone);
   }
}
   
/*---------------------------------------------------------------------*/
/*    Local ...                                                        */
/*---------------------------------------------------------------------*/
// @sealed
class $Local extends $ASTNode {
   in_run_context;
   module_instance_id;
   
   constructor(tag, id, loc, nodebug, sigdecllist, children) {
      super(tag, id, loc, nodebug, children);
      this.sigDeclList = sigdecllist;
      //
      // Tell if the Local is a child of a RUN intruction. Used for
      // debugger.
      //
      this.in_run_context = false;
      this.module_instance_id = null; // always null if not in run context.
   }
   
   //
   // sigdecllist must not be cloned if the Local instruction
   // is from a run_context: in that case, the list is already cloned
   // before, in the RUN construct builder.
   //
   clone() {
      const clone = new Local(this.tag, cloneId(this.id),
			      this.loc, this.nodebug,
                              (this.in_run_context ?
				 this.sigDeclList :
				 clone_list(this.sigDeclList)),
                              this.clone_children());
      clone.in_run_context = this.in_run_context;
      return clone;
   }
}

class Local extends $Local {
   constructor(tag, id, loc, nodebug, sigdecllist, children) {
      super(tag, id, loc, nodebug, sigdecllist, children);
   }
}

/*---------------------------------------------------------------------*/
/*    Exec ...                                                         */
/*---------------------------------------------------------------------*/
// @sealed
class $Exec extends $ASTNode {
   func;
   accessor_list;
   func_res;
   func_susp;
   func_kill;
   signame;
   signal;
   
   constructor(tag, id, loc, nodebug, signame, func_start,
		func_start_accessor_list, func_res, func_susp, func_kill) {
      super(tag, id, loc, nodebug, undefined);
      this.func = func_start;
      this.accessor_list = func_start_accessor_list;
      this.func_res = func_res;
      this.func_susp = func_susp;
      this.func_kill = func_kill;
      this.signame = signame;

      //
      // If signal is present, this is the signal object emitted when
      // exec returns. (not the implicit signal for bookkeeping). Used by
      // debugger. Not clone!
      //
      this.signal = null;
   }

   clone() {
      return new Exec(this.tag, cloneId(this.id),
		      this.loc, this.nodebug, 
		      this.signame, this.func,
		      clone_list(this.accessor_list), this.func_res,
		      this.func_susp, this.func_kill);
   }
}

class Exec extends $Exec {
   constructor(tag, id, loc, nodebug, signame, func_start,
		func_start_accessor_list, func_res, func_susp, func_kill) {
      super(tag, id, loc, nodebug, signame, func_start,
	 func_start_accessor_list, func_res, func_susp, func_kill);
   }
}
   
/*---------------------------------------------------------------------*/
/*    Abort ...                                                        */
/*---------------------------------------------------------------------*/
// @sealed
class $Abort extends $CountExpressionNode {
   constructor(tag, id, loc, nodebug, func, accessor_list, immediate,
	       func_count, accessor_list_count, children) {
      super(tag, id, loc,
	    nodebug, children, func,
	    accessor_list, immediate, func_count, accessor_list_count);
   }

   clone() {
      return new Abort(this.tag, cloneId(this.id),
		       this.loc, this.nodebug, this.func,
		       clone_list(this.accessor_list), this.immediate,
		       this.func_count, clone_list(this.accessor_list_count),
		       this.clone_children());
   }
}

class Abort extends $Abort {
   constructor(tag, id, loc, nodebug, func, accessor_list, immediate,
		func_count, accessor_list_count, children) {
      super(tag, id, loc, nodebug, func, accessor_list, immediate,
	 func_count, accessor_list_count, children);
   }
}
   
/*---------------------------------------------------------------------*/
/*    WeakAbort ...                                                    */
/*---------------------------------------------------------------------*/
// @sealed
class $WeakAbort extends $CountExpressionNode {
   constructor(tag, id, loc, nodebug, func, accessor_list, immediate,
		func_count, accessor_list_count, children) {
      super(tag, id, loc,
	     nodebug, null, func, accessor_list,
	     immediate, func_count, accessor_list_count);
      let c = new Trap(
	 "TRAP", null, loc, true, "WEAKABORT_END_BODY", 
	 new Fork("fork",null, loc, true, [
	    new Sequence(
	       "SEQUENCE", 
	       null, loc, true, [
		  new Await(tag, null, loc, true, func, 
			     accessor_list, immediate, func_count,
			     accessor_list_count),
		  new Exit("EXIT", null, loc, true, "WEAKABORT_END_BODY")
	      ]),
	    new Sequence("SEQUENCE", null, loc, true, children)
	]));
      
      this.children = [c];
   }
   
   clone() {
      return new WeakAbort(this.tag, cloneId(this.id),
			   this.loc, this.nodebug, 
			   this.func, clone_list(this.accessor_list), 
			   this.immediate,
			   this.func_count, 
			   clone_list(this.accessor_list_count),
			   this.clone_children());
   }
}

class WeakAbort extends $WeakAbort {
   constructor(tag, id, loc, nodebug, func, accessor_list, immediate,
		func_count, accessor_list_count, children) {
      super(tag, id, loc, nodebug, func, accessor_list, immediate,
	 func_count, accessor_list_count, children);
   }
}
   
/*---------------------------------------------------------------------*/
/*    Loop ...                                                         */
/*---------------------------------------------------------------------*/
// @sealed
class $Loop extends $ASTNode {
   constructor(tag, id, loc, nodebug, children) {
      super(tag, id, loc, nodebug, children);
   }

   clone() {
      return new Loop(this.tag, cloneId(this.id),
		      this.loc, this.nodebug,
		      this.clone_children());
   }
}

class Loop extends $Loop {
   constructor(tag, id, loc, nodebug, children) {
      super(tag, id, loc, nodebug, children);
   }
}

/*---------------------------------------------------------------------*/
/*    LoopEach ...                                                     */
/*---------------------------------------------------------------------*/
// @sealed
class $LoopEach extends $CountExpressionNode {
   constructor(tag, id, loc, nodebug, children, func, accessor_list, 
		func_count, accessor_list_count) {
      super(tag, id, loc,
	     nodebug, children, func,
	     accessor_list, false, func_count,
	     accessor_list_count);
   }
   
   clone() {
      return new LoopEach(this.tag, cloneId(this.id),
			  this.loc, this.nodebug, 
			  this.clone_children(),
			  this.func, clone_list(this.accessor_list),
			  this.func_count, 
			  clone_list(this.accessor_list_count));
   }
}

class LoopEach extends $LoopEach {
   constructor(tag, id, loc, nodebug, children, func, accessor_list, 
		func_count, accessor_list_count) {
      super(tag, id, loc, nodebug, children, func, accessor_list, 
	 func_count, accessor_list_count);
   }
}

/*---------------------------------------------------------------------*/
/*    Every ...                                                        */
/*---------------------------------------------------------------------*/
// @sealed
class $Every extends $CountExpressionNode {
   constructor(tag, id, loc, nodebug, children, func, 
	       accessor_list, immediate, func_count, accessor_list_count) {
      super(tag, id, loc,
	     nodebug, children, func,
	     accessor_list, immediate, func_count,
	     accessor_list_count);
   }
   
   clone() {
      return new Every(this.tag, cloneId(this.id),
		       this.loc, this.nodebug, 
		       this.clone_children(),
		       this.func, clone_list(this.accessor_list), 
		       this.immediate,
		       this.func_count, 
		       clone_list(this.accessor_list_count));
   }
}

class Every extends $Every {
   constructor(tag, id, loc, nodebug, children, func, 
      accessor_list, immediate, func_count, accessor_list_count) {
      super(tag, id, loc, nodebug, children, func, 
	 accessor_list, immediate, func_count, accessor_list_count);
   }
}

/*---------------------------------------------------------------------*/
/*    Suspend ...                                                      */
/*---------------------------------------------------------------------*/
// @sealed
class $Suspend extends $ExpressionNode {
   constructor(tag, id, loc, nodebug, children, func, accessor_list, immediate) {
      super(tag, id, loc, nodebug, children, func, accessor_list, immediate);

      if (immediate) {
	 let trapName = "SUSPEND_IMMEDIATE_END_BODY";
	 let _exit = new Exit("EXIT", null, loc, true, trapName);
	 let _then = new Pause("PAUSE", null, loc, true);
	 let _else = new Sequence("SEQUENCE", null, loc, true,
				  children.concat(
				     [new Exit("EXIT", null, loc, true, trapName)]));
	 let _if = new If("IF", null, loc, true, 
			  [_then, _else], false,
			  func, accessor_list);
	 let _loop = new Loop("LOOP", null, loc, true, _if);
	 this.children = [new Trap("TRAP", null, loc, true, trapName, _loop)];
      }
   }

   clone() {
      return new Suspend(this.tag, cloneId(this.id),
			 this.loc, this.nodebug, 
			 this.clone_children(),
			 this.func, clone_list(this.accessor_list),
			 this.immediate);
   }
}

class Suspend extends $Suspend {
   constructor(tag, id, loc, nodebug, children, func, accessor_list, immediate) {
      super(tag, id, loc, nodebug, children, func, accessor_list, immediate);
   }
}

/*---------------------------------------------------------------------*/
/*    Fork ...                                                         */
/*---------------------------------------------------------------------*/
// @sealed
class $Fork extends $ASTNode {
   constructor(tag, id, loc, nodebug, children) {
      super(tag, id, loc, nodebug, children);
   }

   clone() {
      return new Fork(this.tag, cloneId(this.id),
		      this.loc, this.nodebug, this.clone_children());
   }

   appendChild(ast_node, oneshot_reg = true) {
      if (!(ast_node instanceof $ASTNode)) {
	 throw new SyntaxError("Child is not an Hiphop.js instruction",
				this.loc);
      }

      if (ast_node instanceof $Module) {
	 throw new SyntaxError("Child can't be a Module (you may want use RUN?)", 
				this.loc);
      }

      if (!this.machine.dynamic) {
	 throw new SyntaxError('Child cannot be added to sweeped machine, use the "dynamic: true" option', this.loc);
      }
      
      this.machine.action(machine => {
	 // Check if there is a selected register in parallel children: 
	 // checking the sel gate only  wrong if the parallel was
	 // started at the previous reaction (sel is not yet propagated).
	 //
	 // See tests/run-add-par.js
	 let sel = (function check_sel(node) {
	    if (node.circuit &&
   	       node.circuit.sel &&
   	       getSelValue(node.circuit.sel) === true) {
   	       return true;
	    }
	    
	    for (let i = node.children.length - 1; i >= 0; i--) {
   	       if (check_sel(node.children[i])) {
   		  return true;
	       }
	    }
	    return false;
	 })(this);

	 this.children.push(ast_node);
	 this.machine.needCompile = true;

	 ast_node.acceptAuto(c => c.circuit = undefined);
	 
	 if (sel && oneshot_reg === true) {
	    ast_node.dynamic = true;
	 }
      });
   }

   removeChild(ast_node) {
      function cleanup(node) {
	 node.net_list.forEach((net, i, a) => {
	    net.invalidate();
	 });
	 node.children.forEach(cleanup);
      }
      
      this.machine.action(machine => {
	 //
	 // We replace the removed branch by a nothing branch. Otherwise,
	 // it could be a shift in the unique stable id of registers, and
	 // restoration can restore values to wrong registers
	 //
	 let idx = this.children.indexOf(ast_node);

	 if (idx > -1) {
	    // MS 5Oct2018, don't force immediate compilation
	    // when a node is removed, but cleanup its associated nets
	    cleanup(this.children[idx]);
	    // machine.needCompile = true;
	    
	    this.children[idx] = 
	       new Nothing("NOTHING", null, this.children[idx].loc, true);
	 }
      });
   }
}

class Fork extends $Fork {
   constructor(tag, id, loc, nodebug, children) {
      super(tag, id, loc, nodebug, children);
   }
}

let inClone = false;

/*---------------------------------------------------------------------*/
/*    If ...                                                           */
/*---------------------------------------------------------------------*/
// @sealed
class $If extends $ExpressionNode {
   not;
   
   constructor(tag, id, loc, nodebug, children, not, func, accessor_list) {
      super(tag, id, loc, nodebug, children, func, accessor_list, false);

      if (children[1] === undefined) {
	 children[1] = new Nothing("NOTHING", null, loc, false);
      }

      this.not = not;
   }

   clone() {
      return new If(this.tag, cloneId(this.id),
		    this.loc, this.nodebug,
		    this.clone_children(),
		    this.not, this.func, clone_list(this.accessor_list));
   }
}

class If extends $If {
   constructor(tag, id, loc, nodebug, children, not, func, accessor_list) {
      super(tag, id, loc, nodebug, children, not, func, accessor_list);
   }
}
   
/*---------------------------------------------------------------------*/
/*    SEQUENCE ...                                                     */
/*---------------------------------------------------------------------*/
// @sealed
class $Sequence extends $ASTNode {
   constructor(tag, id, loc, nodebug, children) {
      super(tag, id, loc, nodebug, children);
   }

   clone() {
      return new Sequence(this.tag, cloneId(this.id),
			  this.loc, this.nodebug, 
			  this.clone_children());
   }
   
   appendChild(ast_node, oneshot_reg = true) {
      if (!(ast_node instanceof $ASTNode)) {
	 throw new SyntaxError("Child is not an Hiphop.js instruction",
				this.loc);
      }

      if (ast_node instanceof Module) {
	 throw new SyntaxError("Child can't be a module (you may want use RUN?)", 
				this.loc);
      }

      if (!this.machine.dynamic) {
	 throw new SyntaxError('Child cannot be added to sweeped machine, use the "dynamic: true" option', this.loc);
      }
	 
      this.machine.action(machine => {
	 // Check if there is a selected register in sequence children: 
	 // checking only the sel gate is wrong if the sequence was
	 // started at the previous reaction (sel is not yet propagated).
	 //
	 // See tests/run-add-par.js
	 let sel = (function check_sel(node) {
	    if (node.circuit &&
   	       node.circuit.sel &&
   	       getSelValue(node.circuit.sel) === true) {
   	       return true;
	    }
	    
	    for (let i = node.children.length - 1; i >= 0; i--) {
   	       if (check_sel(node.children[i])) {
   		  return true;
	       }
	    }
	    return false;
	 })(this);

	 this.children.push(ast_node);
	 this.machine.needCompile = true;

	 if (sel && oneshot_reg === true) {
	    ast_node.dynamic = true;
	 }
      });
   }

   removeChild(ast_node) {
      function cleanup(node) {
	 node.net_list.forEach((net, i, a) => {
	    net.invalidate();
	 });
	 node.children.forEach(cleanup);
      }
      
      this.machine.action(machine => {
	 //
	 // We replace the removed branch by a nothing branch. Otherwise,
	 // it could be a shift in the unique stable id of registers, and
	 // restoration can restore values to wrong registers
	 //
	 let idx = this.children.indexOf(ast_node);

	 if (idx > -1) {
	    // MS 5Oct2018, don't force immediate compilation
	    // when a node is removed, but cleanup its associated nets
	    cleanup(this.children[idx]);
	    // machine.needCompile = true;
	    
	    this.children[idx] = 
	       new Nothing("NOTHING", null, this.children[idx].loc, true);
	 }
      });
   }
}

class Sequence extends $Sequence {
   constructor(tag, id, loc, nodebug, children) {
      super(tag, id, loc, nodebug, children);
   }
}
   
/*---------------------------------------------------------------------*/
/*    SignalAccessor ...                                               */
/*---------------------------------------------------------------------*/
// @sealed
class SignalAccessor {
   signal;
   signame;
   get_pre;
   get_value;
   
   constructor(signame, get_pre, get_value) {
      this.signame = signame;
      this.get_pre = get_pre;
      this.get_value = get_value;
   }

   clone() {
      const clone = new SignalAccessor(
	 this.signame, this.get_pre, this.get_value);
      clone.id = cloneId(this.id);
      return clone;
   }
}

/*---------------------------------------------------------------------*/
/*    SignalProperties ...                                             */
/*---------------------------------------------------------------------*/
// @sealed
class SignalProperties {
   id;
   name;
   loc;
   accessibility;
   init_func;
   init_accessor_list;
   reinit_func;
   reinit_accessor_list;
   combine_func;
   alias;
   signal;
   
   constructor(id, loc, name, dir = INOUT,
		init_func, init_accessor_list,
		reinit_func, reinit_accessor_list, combine, alias) {
      this.id = id;
      this.name = name;
      this.loc = loc;
      this.accessibility = dir;
      this.init_func = init_func;
      this.init_accessor_list = init_accessor_list;
      this.reinit_func = reinit_func;
      this.reinit_accessor_list = reinit_accessor_list;
      this.combine_func = combine;
      this.alias = alias;
   }

   clone() {
      return new SignalProperties(cloneId(this.id), this.loc, this.name,
				  this.accessibility, this.init_func,
				  clone_list(this.init_accessor_list),
				  this.reinit_func,
				  clone_list(this.reinit_accessor_list),
				  this.combine_func, this.alias);
   }
   
   toString() {
      return `[SignalProperties name:${this.name}, alias:${this.alias}, signal:${typeof this.signal}]`;
   }
}

/*---------------------------------------------------------------------*/
/*    clone_list ...                                                   */
/*    -------------------------------------------------------------    */
/*    Generic function for cloning signal accessor and signal          */
/*    properties.                                                      */
/*---------------------------------------------------------------------*/
function clone_list(lst) {
   return lst.map((el, i, arr) => el.clone());
}

/*---------------------------------------------------------------------*/
/*    computeNodeRegisterId ...                                        */
/*---------------------------------------------------------------------*/
function computeNodeRegisterId(ast_node, seq) {
   let child_seq = 0;
   
   ast_node.instr_seq = seq;
   ast_node.next_register_id = 0;

   for(let i = 0; i < ast_node.children.length; i++) {
      // MS 1oct2018, this loop _must_ go from 0 to length, otherwise
      // the dynamic node insertion won't work. 
      // This is because new nodes are inserted at the end of the children
      // list and already existing nodes must preserve their identity 
      // (the instr_seq property).
      computeNodeRegisterId(ast_node.children[i], seq + child_seq++);
   }
}

/*---------------------------------------------------------------------*/
/*    findFrameNode ...                                                */
/*---------------------------------------------------------------------*/
function findFrameNode(nodes) {
   if (nodes.length > 0) {
      const node = nodes[0];
      if (node.children.length > 0) {
	 if (node.children[0].tag === "frame") {
	    return node.children[0];
	 }
      }
   }
   
   return false;
}

/*---------------------------------------------------------------------*/
/*    getSelValue ...                                                  */
/*    -------------------------------------------------------------    */
/*    Follow the wire until a real net is found.                       */
/*---------------------------------------------------------------------*/
function getSelValue(sel) {
   // MS 13feb2025, I don't understand the whole appendChild mechanism
   // return true;
   if (sel instanceof net.WireNet) {
      if (sel.faninList.length > 0) {
	 return getSelValue(sel.faninList[0].net);
      } else {
	 return false;
      }
   } else {
      return sel.value;
   }
}
