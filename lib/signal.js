"use strict"
"use hopscript"

const st = require("./inheritance.js");
const net = require("./net.js");
const ast = require("./ast.js");
const error = require("./error.js");
const compiler = require("./compiler.js");

function Signal(ast_node, prop, type, k1_list=null, kill_list=null, susp=null) {
   this.ast_node = ast_node;
   this.name = prop.name;
   this.combine_func = prop.combine_func;
   this.init_func = prop.init_func;
   this.init_accessor_list = prop.init_accessor_list;
   this.reinit_func = prop.reinit_func;
   this.reinit_accessor_list = prop.reinit_accessor_list;
   this.emitted = new Array( ast_node.depth ).fill( false );
   this.value = undefined;
   this.pre_value = undefined;

   //
   // Needed for signal lookup and pretty printer. See
   // compiler.js/ast.js.
   //
   prop.signal = this;

   this.gate_list = [];
   this.dependency_gate_list = [];
   this.pre_reg = new net.RegisterNet(ast_node, type, this.name + "_pre_reg");
   this.pre_gate = net.makeOr( ast_node, type, this.name + "_pre_gate" );
   this.pre_gate.noSweep = true;

   //
   // The pre_gate is not the register but a door which the register
   // is connected to. That ensure that pre_reg hold the value of
   // previous instant.
   //
   this.pre_reg.connectTo(this.pre_gate, net.FAN.STD);

   //
   // Building a local signal. Lot of stuff is needed to handle pre on
   // a local.
   //
   if (k1_list && kill_list && susp) {
      let or_to_pre = net.makeOr( ast_node, type, this.name + "_or_to_pre" );
      let pre_and_susp = net.makeAnd( ast_node, type,
				      this.name + "_pre_and_susp" );
      let to_pre_p = [];
      let to_pre_not_susp = net.makeOr( ast_node, type,
					this.name + "_to_pre_not_susp" );

      for (let i = 0; i <= ast_node.depth; i++) {
	 //
	 // signal door generation
	 //
	 this.gate_list[i] = net.makeOr(ast_node, type, this.name, i);
	 this.gate_list[i].noSweep = true;
	 this.dependency_gate_list[i] = net.makeOr(ast_node, type,
						    this.name + "_dep", i);

	 //
	 // signal intermediate pre door generation
	 //
	 to_pre_p[i] = net.makeAnd(ast_node, type, this.name + "_to_pre_p", i);
	 this.gate_list[i].connectTo(to_pre_p[i], net.FAN.STD);
	 k1_list[i].connectTo(to_pre_p[i], net.FAN.STD);
	 kill_list[i].connectTo(to_pre_p[i], net.FAN.NEG);

	 if (i < ast_node.depth) {
	    to_pre_p[i].connectTo(to_pre_not_susp, net.FAN.STD);
	 } else {
	    let and = net.makeAnd(ast_node, type,
				   this.name + "_to_pre_q_and_susp");

	    to_pre_p[i].connectTo(and, net.FAN.STD);
	    susp.connectTo(and, net.FAN.NEG);
	    and.connectTo(to_pre_not_susp, net.FAN.STD);
	 }
      }

      //
      // pre AND susp
      //
      this.pre_reg.connectTo(pre_and_susp, net.FAN.STD);
      susp.connectTo(pre_and_susp, net.FAN.STD);

      //
      // topre_not_susp OR pre_and_susp
      //
      pre_and_susp.connectTo(or_to_pre, net.FAN.STD);
      to_pre_not_susp.connectTo(or_to_pre, net.FAN.STD);
      or_to_pre.connectTo(this.pre_reg, net.FAN.STD);
   } else {
      //
      // On global signal, there is only one incarnation, and pre
      // depends only of this incarnation
      //
      let signal_gate = net.makeOr(ast_node, type, this.name);

      //
      // Don't remove global input signal gate if there is no emission
      // of this signal in the program
      //
      signal_gate.noSweep = true;
      this.gate_list[0] = signal_gate;
      this.dependency_gate_list[0] = net.makeOr(ast_node, type,
						 this.name + "_dep");
      signal_gate.connectTo(this.pre_reg, net.FAN.STD);
   }
}

exports.Signal = Signal;

/*---------------------------------------------------------------------*/
/*    reset ...                                                        */
/*---------------------------------------------------------------------*/
Signal.prototype.reset = function( erase_value ) {
   this.emitted.fill( false );
   if( erase_value ) {
      this.value = undefined;
      let p = this.ast_node.machine.DOMproxiesValue[ this.name ];
      if( p ) {
	 p.value = this.value;
      }
   }
   this.pre_value = this.value;
}

/*---------------------------------------------------------------------*/
/*    set_value ...                                                    */
/*---------------------------------------------------------------------*/
Signal.prototype.set_value = function( value, lvl, loc=false ) {
   //
   // Signal with reinitialization always make combinaison with
   // emission
   //
   if( this.emitted[ lvl ] ) {
      if( !this.combine_func ) {
	 throw new TypeError( "Can't set single signal `" + this.name
			      + "' value more than once.",
			      loc || this.ast_node.loc );
      }
      value = this.combine_func( this.value, value );
   }

   this.value = value;
   this.emitted[ lvl ] = true;
}

//
// create_score and resume_scope are used to call init/reinit
// functions of signal, according the context. As init/reinit func can
// use signal values/status, those functions must be called by
// runtime, with dependencies well builded.
//
// Since all (global and local) signals are reseted at the end of the
// reaction, only global input signal can be emitted when enter on
// thoses functions. In that case, we must do nothing.
//
exports.create_scope = function(s, lvl) {
   if (s.emitted[ lvl ])
      return

   if (s.init_func) {
      s.value = s.init_func.call(this);
      s.pre_value = s.value;
   }
}

exports.resume_scope = function(s, lvl) {
   if (s.emitted[ lvl ])
      return;

   if (s.reinit_func) {
      s.value = s.reinit_func.call(this);
      s.pre_value = s.value;
   }
}

//
// Generate an object containing values of signal for an instant,
// usage by user expressions.
//
exports.generate_this = function(machine, accessor_list, lvl) {
   let self = {
      machine: machine,
      value: {},
      preValue: {},
      present: {},
      prePresent: {}
   }

   for (let i in accessor_list) {
      let acc = accessor_list[i];

      if (acc.get_value) {
	 //
	 // Accessor of value.
	 //
	 if (acc.get_pre)
	    self.preValue[acc.signame] = acc.signal.pre_value;
	 else
	    self.value[acc.signame] = acc.signal.value;
      } else {
	 //
	 // Accessor of (pre)presence.
	 //
	 if (acc.get_pre) {
	    self.prePresent[acc.signame] = acc.signal.pre_gate.value;
	 } else {
	    let sig = acc.signal;
	    let min_lvl = lvl > sig.ast_node.depth ? sig.ast_node.depth : lvl;
	    self.present[acc.signame] = sig.gate_list[min_lvl].value;
	 }
      }
   }

   return self;
}

/*---------------------------------------------------------------------*/
/*    runtimeSignalAccessor ...                                        */
/*    -------------------------------------------------------------    */
/*    Extends SignalAccessor with following propertie:                 */
/*                                                                     */
/*      - signal: the signal object                                    */
/*                                                                     */
/*    The following code also add dependency to the accessor if        */
/*    needed.                                                          */
/*---------------------------------------------------------------------*/
exports.runtimeSignalAccessor =
   function( ast_node, accessor_list, lvl, dependency_target_gate=null ) {
      for( let i in accessor_list ) {
	 let acc = accessor_list[ i ]
	 let gate = null;
	 let sig = acc.signal;

	 if( !sig ) {
	    throw error.TypeError( 
	       "*** INTERNAL ERROR: " + ast_node[ "%tag" ] 
		  + ": unbound signal `" + acc.signame + "'", ast_node.loc );
	 }
	 
	 let min_lvl = lvl > sig.ast_node.depth ? sig.ast_node.depth : lvl;

	 acc.signal = sig;
	 if( acc.get_value ) {
	    gate = (acc.get_pre
		    ? sig.pre_gate
		    : sig.dependency_gate_list[ min_lvl ]);
	 } else {
	    gate = (acc.get_pre 
		    ? sig.pre_gate
		    : sig.gate_list[ min_lvl ]);
	 }

	 if( dependency_target_gate ) {
	    gate.connectTo( dependency_target_gate, net.FAN.DEP );
	 }
      }
   };

