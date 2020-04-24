/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/lib/machine.js                */
/*    -------------------------------------------------------------    */
/*    Author      :  Manuel Serrano                                    */
/*    Creation    :  Tue Jul 17 08:19:22 2018                          */
/*    Last change :  Wed Mar 11 12:11:56 2020 (serrano)                */
/*    Copyright   :  2018-20 Manuel Serrano                            */
/*    -------------------------------------------------------------    */
/*    HipHop reactive machines                                         */
/*=====================================================================*/
"use strict"
"use hopscript"

/*---------------------------------------------------------------------*/
/*    imports                                                          */
/*---------------------------------------------------------------------*/
const hh = require( "./hiphop.js" );
const compiler = require( "./compiler.js" );
const error = require( "./error.js" );
const ast = require( "./ast.js" );
const net = require( "./net.js" );
const signal = require( "./signal.js" );
const lang = require( "./lang.js" );
const queue = require( "./queue.js" );
const debug = require( "./debugger.js" );

/*---------------------------------------------------------------------*/
/*    ReactiveMachine ...                                              */
/*---------------------------------------------------------------------*/
export class ReactiveMachine {
   constructor( ast_node, opts={} ) {
      if( !(this instanceof ReactiveMachine ) ) {
	 return new ReactiveMachine( ast_node, opts );
      }
      if( !(ast_node instanceof ast.Module) ) {
	 throw new TypeError("wrong module `" + typeof(ast_node) + "'");
      }

      // For compatibilitie with numerous old tests where second argument
      // is a string. Otherwise, the reactive machine must not be named:
      // the name in the debugger came from the main module.
      //
      // TODO: batch: it shouldn't display the reactive machine name
      // (which shouldn't exist anymore), but the name of the main
      // module.
      if (typeof(opts) == "string" || opts instanceof String) {
	 this.name = opts;
	 opts = {}
      } else {
	 this.name = opts.name;
      }

      // debugging tick
      this.tick = 0;

      // No Sweep by default (until sweep is fixed)
      this.sweep = opts.sweep === undefined ? true : !!opts.sweep;

      // Display the propagation of gates value
      this.tracePropagation = !!opts.tracePropagation;
      this.dumpNets = !!opts.dumpNets;

      // true: display on stderr the duration time of each reaction
      this.traceReactDuration = !!opts.traceReactDuration;

      // true: display on stderr the duration time of compilation
      this.traceCompileDuration = !!opts.traceCompileDuration;

      // If not null, this is a function which is called with list of
      // emitted signal (and their respectives values) at the end of each
      // reaction.
      //
      // Should only be used for the batch and for debugging.
      this.debug_emitted_func = null;

      // If not null, this function is called with a list of pair
      // { type, nowval } for each output signal which is
      // emitted in the reaction
      this.emittedFunc = null;

      // Mechanism to allow react/input/appendChild/etc. during a
      // reaction (with an atom statement). The action is delayed until
      // the end of the reaction, and atomically applied.
      //
      // Also usefull to trigger actions after initial compilation
      // (e.g. start debugger using opts.debuggerName).
      this.actions = [];

      // Trigger compilation of the machine only when needed.
      this.needCompile = true;

      this.react_in_progress = false;

      this.input_signal_map = {};
      this.output_signal_map = {};
      this.global_signal_map = {};
      this.local_signal_list = [];

      this.host_event_map = {};

      // exec_status struct, see
      // compiler.js:ast.Exec.prototype.make_circuit.
      this.exec_status_list = [];

      this.nets = [];
      this.boot_reg = null;

      // control gates
      this.sel = null;
      this.k0 = null;
      this.k1 = null;
      this.registerNet = [];
      this.actionNet = [];
      

      // queue to handle net propagation during reaction
      // (modified in compile)
      this.queue = undefined;

      this.ast = ast_node.clone();
      compile( this );

      // hop proxy object containing the last reaction output signals
      for( let k in this.output_signal_map ) {
	 const nowval = this.output_signal_map[ k ].init_func ?
	    this.output_signal_map[ k ].init_func.call( this ) : undefined;
	 this[ k ] = {
	    signame: k,
	    nowval: nowval,
	    preval: undefined,
	    now: false,
	    pre: false
	 }
      }

      if( !hop.isServer ) {
	 for( let k in this.output_signal_map ) {
	    this[ k ] = new hop.reactProxy( this[ k ] );
	 }
      }

      // Debugger infos :
      //
      // If started, it contains a MachineDebugger object.
      this._debugger = null;
      if (typeof(opts.debuggerName) == "string"
	  || opts.debuggerName instanceof String) {
	 this.debuggerOn(opts.debuggerName);
      }
   }

   flushActions() {
      const q = this.actions
      this.actions = [];
      q.forEach( a => a( this ) );
   }

   action( func ) {
      if( this.react_in_progress ) {
	 this.actions.push( func );
      } else if( this._debugger && this._debugger.stepper ) {
	 this._debugger.stepper_update_queue.push( func );
      } else {
	 return func( this );
      }
   }

   update( state, value, reactp ) {
      this.action( _ => {
	 state.value = value;
	 state.active = false;
	 state.prev_active = true;
      } );

      if( reactp ) this.react();
   }

   precompile() {
      this.needCompile = true;
      compile( this );
   }

   react( signals ) {
      let d = this._debugger;
      if( d && d.stepper ) {
	 d.stepper_pending_reaction++;
	 d.stepper_update();
      }

      if( typeof signals === "string" ) {
	 this.input( signals, undefined );
      } else {
      	 for( let k in signals ) {
	    this.input( k, signals[ k ] );
      	 }
      }

      this.tick++;
      return this.action( react );
   }

   input( signal, value=undefined ) {

      function signalValue( machine, signal, value ) {
	 let signame;
	 let sigobj;

	 if( typeof( signal ) === "object" ) {
	    signame = signal.type;
	    value = signal.nowval;
	 } else {
	    signame = signal;
	 }

	 sigobj = machine.input_signal_map[ signame ];

	 if( !sigobj ) {
	    throw new ReferenceError( `unbound input signal "${signame}"` );
	 }

	 sigobj.set_value( value, 0 );
      }

      // MS (2018/07/31): recompile the machine's program after branch addition
      // see appendChild@ast.js, react@machine.js
      compile( this );

      this.action( machine => {
	 if( signal instanceof Object ) {
	    for( let k in signal ) {
	       signalValue( machine, k, signal[ k ] );
	    }
	 } else {
	    signalValue( machine, signal, value );
	 }
      } );
   }

   inputAndReact( signal, value = undefined ) {
      this.input( signal, value );
      return this.react();
   }

   save() {
      function _save_signals(map_out, map_in) {
	 for (let i in map_out) {
	    map_in[ i ] = {
	       value: map_out[i].value,
	       pre_value: map_out[i].pre_value
	    };
	 }
      }
      let machine_state = {};

      machine_state.input_signal_map = {};
      machine_state.output_signal_map = {};
      machine_state.global_signal_map = {};
      machine_state.local_signal_list = [];
      machine_state.registers = {};
               
      this.registerNet.forEach(n => {
         machine_state.registers[ n.stable_id ] = n.value;
      });

      _save_signals( this.input_signal_map, machine_state.input_signal_map );
      _save_signals( this.output_signal_map, machine_state.output_signal_map );
      _save_signals( this.global_signal_map, machine_state.global_signal_map );
      _save_signals( this.local_signal_list, machine_state.local_signal_list );

      return machine_state;
   }

   restore( machine_state ) {
      function _restore_signals( map_out, map_in ) {
	 for( let i in map_out ) {
	    if( !map_in[ i ] ) {
	       throw error.MachineError( `Can't find signal "${i}"` );
	    }
	    map_in[ i ].value = map_out[ i ].value;
	    map_in[ i ].pre_value = map_out[ i ].pre_value;
	 }
      }

      _restore_signals( machine_state.input_signal_map, this.input_signal_map );
      _restore_signals( machine_state.output_signal_map, this.output_signal_map );
      _restore_signals( machine_state.global_signal_map, this.global_signal_map );
      _restore_signals( machine_state.local_signal_list, this.local_signal_list );

      // optimisation register nets

      this.registerNet.forEach(n =>{
         let value = machine_state.registers[ n.stable_id ];
	      if (value !== undefined) n.value = value;
      });
      
   }

   getElementById( id ) {
      return (function loop( ast_node, id ) {
	 if( ast_node.id === id ) {
	    return ast_node;
	 } for( let i = ast_node.children.length - 1; i >= 0; i-- ) {
	    let el = loop( ast_node.children[ i ], id );

	    if( el ) return el;
	 }
	 return null;
      })( this.ast, id );
   }

   debuggerOn( name ) {
      if (this._debugger)
	 this.debuggerOff();

      this._debugger = new debug.MachineDebugger(this, name);
   }

   _debuggerUpdate() {
      if (this._debugger)
	 this._debugger.update();
   }

   debuggerOff() {
      if (!this._debugger)
	 return;
      this._debugger.disable();
      this._debugger = null;
   }

   stepperOn() {
      if (this._debugger) {
	 this._debugger.stepper_enable();
      }
   }

   stepperNext( steps=1 ) {
      if (this._debugger) {
	 this._debugger.stepper_next(steps);
      }
   }

   stepperOff() {
      if (this._debugger) {
	 this._debugger.stepper_disable();
      }
   }

   batch() {
      require( "./batch.js" ).batch( this );
   }
}

/*---------------------------------------------------------------------*/
/*    react ...                                                        */
/*---------------------------------------------------------------------*/
function react( mach ) {
   const profstart = Date.now();
   if( mach.react_in_progress ) {
      throw new TypeError("_react called during a reaction.");
   }

   compile( mach );

   const profcomp = Date.now();

   mach.react_in_progress = true;
   if (mach.traceReactDuration) {
      console.time("traceReactDuration");
   }

   //let nonpropagated_nets = mach.nets.length;
   let nonpropagated_nets = mach.nets.length + mach.registerNet.length + mach.actionNet.length;
   let known_list = mach.queue.reset();
   
   let emitted = [];
   let emittedDebug = [];

   //
   // Reset proxy for machine.present.S (which can be reseted at the
   // end of the reaction, otherwise they would never be true if the
   // signal is emitted
   //
/*    for (let i in mach.DOMproxiesPresent) {                          */
/*       let p = mach.DOMproxiesPresent[i];                            */
/*       p.value = false;                                              */
/*    }                                                                */

   //
   // Prepare the known list (registers, constants, emitted input
   // signals).
   //
   // Note: see compiler.js:ast.Module.prototype.make_circuit for
   // isGlobalInputSignalNet explanation.
   //
   // Important: it is mandatory that any constant which propagate a
   // value in a register is created *after* the register. That way,
   // registers are (created?) *before* the constant in the machine net list,
   // and they are added *before* the constant in the known list. Hence,
   // they propagate their value *before* the constant propagate its
   // own in the register. This remark is also true for global input
   // signal, where the signal gate is connected to the register gate:
   // the register gate is created before the signal gate.
   //
   const profpropstart = Date.now();

   const RegisterNet = net.RegisterNet;
   const ActionNet = net.ActionNet;
   const LogicalNet = net.LogicalNet;

   mach.registerNet.forEach(n=>{n.reset(false)});
   mach.actionNet.forEach(n=>{n.reset(false)});
   mach.nets.forEach(n=>{n.reset(false)});
   
   // optimization on register nets
   
   mach.nets.forEach((n,i,a) => {
      n.reset(false);
      if (n instanceof LogicalNet) {
	      if (n.isGlobalInputSignalNet && n.signal.emitted[ n.lvl ]) {
	            n.value = true;
               known_list.push(n);    
	   } else if (n.fanin_list.length === 0) {
	    //	 } else if (n.trueFaninCount == 0) {console.log(this.debug_name);console.log(this.debug_name);.log(this.debug_name);
      // n.isInKnownList = true;
         known_list.push(n);     
	   }
      }
   });

   const nbpush = known_list.length;  

   for (let i in mach.exec_status_list) {
      let state = mach.exec_status_list[i];
      if (state.prev_active && !state.suspended) {
   	 if (!state.kill) {
   	    state.callback_wire.value = true
   	 }
   	 state.prev_active = false;
      }
   }
   const profiter = Date.now();
   
   // propagation of register nets
   for(let i = 0; i < mach.registerNet.length ; i++){
      mach.registerNet[i].propagate(known_list);
      nonpropagated_nets--;
   }

   // propogation of action nets
   for(let i = 0; i < mach.actionNet.length ; i++){
      mach.actionNet[i].propagate(known_list);
      nonpropagated_nets--;
   }

   // propagation of remaining nets in known list
   while (known_list.length > 0) {
      known_list.shift().propagate(known_list);
      nonpropagated_nets--;
   }

   const profpropend = Date.now();

   if (nonpropagated_nets > 0) {
      let { loc, size, signals } = findCausalityError( mach );
      // GB : dumping error message in both cases
      let nets = mach.nets.filter( n => !n.isInKnownList );

/*       nets.forEach( n => {                                          */
/* 	    console.error( " ", n.debug_id + " " + n.debug_name,       */
/* 	       "fanin_list=" + n.fanin_list.length,                    */
/* 	       "depCount=" + n.dependencyCount,                        */
/* 	       "trueFaninCount=" + n.trueFaninCount );                 */
/*        	 } );                                                  */
      // Checking the error type
      if( size >= 0 ) {

	 throw error.CausalityError( `causality cycle of length ${size} detected, involving signals ${signals.toString() }`, loc );
      } else {
	 console.error( "internal causality error:" );
      }
      throw error.CausalityError( `internal causality error: ${nets.map( n => n.debug_name ).toString()}`,
	 nets[ 0 ].ast_node.loc );
   }

   const debugEnable = (mach.debug_emitted_func instanceof Function);


   for (let i in mach.output_signal_map) {
      let sig = mach.output_signal_map[i];

      if (sig.gate_list[0].value) {
	 let buf = sig.name;

	 mach[ sig.name ].preval = mach[ sig.name ].nowval;
	 mach[ sig.name ].pre = mach[ sig.name ].now;
	 mach[ sig.name ].nowval = sig.value;
	 mach[ sig.name ].now = true;

         emitted.push({
            type: sig.name,
	    signame: sig.name,
            nowval: sig.value,
	    signalName: sig.name, // backward compatibility
	    signalValue: sig.value // backward compatibility
         });

	 if( debugEnable ) {
	    if (sig.value !== undefined) {
	       let string_value;

	       try {
		  string_value = JSON.stringify(sig.value);
	       } catch (e) {
		  string_value = sig.value;
	       }
	       buf += "(" + string_value + ")";
	    }
	    emittedDebug.push(buf);
	 }

	 let callback_list = mach.host_event_map[sig.name];
	 if (callback_list) {
	    let stop_propagation = false;
	    let event = { type: sig.name,
			  nowval: sig.value,
			  signalName: sig.name, // backward compatibility
	    		  signalValue: sig.value, // backward compatibility
			  stopPropagation: function() {
			     stop_propagation = true;
			  }
			};

	    for (let i = 0; i < callback_list.length && !stop_propagation; i++)
	       callback_list[i].call(null, event);
	 }
      } else {
	 mach[ sig.name ].pre = mach[ sig.name ].now;
	 mach[ sig.name ].now = false;
      }
   }


   //
   // Trigger execs
   //
   const profexecstart = Date.now();

   for( let i in mach.exec_status_list ) {
      const state = mach.exec_status_list[ i ];

      if( state.kill || state.start ) {
   	 if( state.kill ) {
   	    state.kill = false;
	    state.prev_killed = true;

	    if( state.active && state.func_kill ) {
	       state.func_kill.call( state.exec );
	    }

	    state.exec = false;
   	 }

   	 if( state.start ) {
   	    state.active = true;
   	    state.start = false;
   	    state.prev_active = false;
   	    state.suspended = false;
   	    state.prev_suspended = false;
	    state.prev_killed = false;
	    state.id = get_exec_id();
	    state.exec = new signal.Exec( mach, state );
   	    state.func_start.call( state.exec );
	 }
      } else if( state.suspended && !state.prev_suspended ) {
   	 state.prev_suspended = true;
   	 if( state.func_susp ) state.func_susp.call( state.exec );
      } else if( !state.suspended && state.prev_suspended ) {
   	 state.prev_suspended = false;
   	 if( state.func_res ) state.func_res.call( state.exec );
      }

   }

   mach._debuggerUpdate();
   mach.reset_signals();
   if (mach.tracePropagation)
      console.error("SEL:" + (mach.sel ? mach.sel.value : false),
		    "K0:" + (mach.k0 ? mach.k0.value : false),
		    "K1:" + (mach.k1 ? mach.k1.value : false));

   if (mach.traceReactDuration) {
      console.timeEnd("traceReactDuration");
   }
   mach.react_in_progress = false;

   if( debugEnable ) {
      mach.debug_emitted_func(emittedDebug);
   }

   if (mach.emittedFunc instanceof Function) {
      mach.emittedFunc(emitted);
   }

   mach.flushActions();

   if( mach.profile ) {
      const profend = Date.now();
      console.error( "reaction time: " + (profend - profstart),
	 "nets: " + nonpropagated_nets,
	 "compile: " + (profcomp - profstart),
	 "propagation: "+ (profpropend - profpropstart),
	 "push: " + nbpush,
	 "exec: " + (profpropend - profexecstart ));
      console.error( "   [init-time: " + (profiter - profpropstart),
	 "iter-time: " + (profpropend - profiter) + "]" );
   }

   return mach;
}



/*---------------------------------------------------------------------*/
/*    compile ...                                                      */
/*---------------------------------------------------------------------*/
function compile( mach ) {
   if( mach.needCompile ) {
      let state = null;

      if( mach.traceCompileDuration ) {
	      console.time( "traceCompileDuration" );
      }

      if( mach.needCompile ) {
	      state = mach.save();
      }

      compiler.compile( mach, mach.ast );
      // restore machine state after processing mach.nets

      if( mach.traceCompileDuration ) {
	      console.timeEnd( "traceCompileDuration" );
      }
      mach.queue = new queue( mach.nets.length );
      
      // optimisations on registerNet and actionNet
      mach.registerNet = [];
      mach.actionNet = [];
      mach.nets.forEach((v,i) =>{
         if(v instanceof net.RegisterNet ){
            mach.registerNet.push(v);
            mach.nets.splice(i,1); // removing register nets from mach.nets
         } else if(v instanceof net.ActionNet ){
            if( v.trueFaninCount === 0 ) {
               mach.actionNet.push(v);
               mach.nets.splice(i,1); // removing machine nets from mach.nets
            }
         }         
      });
      // important to restore state after the above process, not before.
      if( mach.needCompile ) {
         mach.restore( state );
         mach.needCompile = false;
      }  
   }
}

/*---------------------------------------------------------------------*/
/*    batch_reset ...                                                  */
/*---------------------------------------------------------------------*/
ReactiveMachine.prototype.batch_reset = function() {
   if (this.sweep) {
      //
      // Reactive machine reset makes a fresh reactive machine without
      // recompiling the crcuit. Hence, register which has value
      // `true` because of constant propagation will become false,
      // which is an error.
      //
      // Since reactive machine reset is only used in batch, we just
      // forbid it if sweep optimization is on.
      //
      // TODO: enable batch_reset even if sweep is on by recompiling
      // the internal circuit.
      //
      throw new error.MachineError("Can't reset machine: sweep is on.");
   }

   if (this.react_in_progress)
      throw new error.MachineError("Cant't reset machine: react in progress.");

   for (let i in this.nets)
      this.nets[i].reset(true);
   // for register nets
   for (let i in this.registerNet)
      this.registerNet[i].reset(true);

   for (let i in this.actionNet)
      this.actionNet[i].reset(true);
   
   this.boot_reg.value = true;
   this.reset_signals(true);

   this.actions = [];
}

ReactiveMachine.prototype.reset_signals = function(erase_value=false) {
   function _reset_signals_obj( obj ) {
      for( let i in obj ) {
	      obj[ i ].reset( erase_value );
      }
   }

   function _reset_signals_list( list ) {
      list.forEach( (el, i, list) => list[ i ].reset( erase_value ) );
   }

   _reset_signals_obj(this.global_signal_map);
   _reset_signals_list(this.local_signal_list);
}

/*---------------------------------------------------------------------*/
/*    addEventListener ...                                             */
/*---------------------------------------------------------------------*/
ReactiveMachine.prototype.addEventListener = function( signame, callback ) {
   if( !this.output_signal_map[ signame ] ) {
      throw new ReferenceError( "unbound output signal `" + signame + "'" );
   }

   if (!(callback instanceof Function))
      throw new TypeError( "Not a function `" + callback + "'", undefined );

   if (!this.host_event_map[ signame ]) {
      this.host_event_map[ signame ] = [];
   }
   this.host_event_map[ signame ].push( callback );
}

/*---------------------------------------------------------------------*/
/*    removeEventListener ...                                          */
/*---------------------------------------------------------------------*/
ReactiveMachine.prototype.removeEventListener =
   function( signame, callback = undefined ) {
      let callback_list = this.host_event_map[ signame ];

      if( callback_list ) {
	 if( callback ) {
	    let i = callback_list.indexOf( callback );

	    if( i > -1 ) callback_list.splice( i, 1 );
	 } else {
	    delete this.host_event_map[ signame ];
	 }
      }
   }

ReactiveMachine.prototype.pretty_print = function() {
   //
   // If pretty_print after add/remove parallel branch, but before react.
   //
      compile( this );

   let wd_list = debug.make_wd_list(this.ast);
   let buf = "";

   wd_list.forEach(function(wd, idx, arr) {
      buf += "\nMODULE" + idx;
      wd.instruction_list.forEach(function(instr, idx, arr) {
	 buf += "\n";
	 for (let i = 0; i < (3 * instr.indent); i++)
	    buf += " ";
	 instr.word_list.forEach(function(word, idx, arr) {
	    buf += word.body + " ";
	 });
      });
      buf += "\n\n";
   });
   return buf;
}

ReactiveMachine.prototype.stats = function() {
   return this.nets.reduce((stats, net_) => {
      if (net_ instanceof net.RegisterNet) {
	 stats.registers++;
      } else if (net_ instanceof net.ActionNet) {
	 stats.actions++;
      } else if (!net_.fanin_list.length) {
	 stats.constants++;
      } else if (net_.fanin_list.length == 1) {
	 stats.buffers++;
      } else {
	 stats.logicals++;
      }

      return stats;
   }, {
      gates: this.nets.length,
      constants: 0,
      buffers: 0,
      registers: 0,
      logicals: 0,
      actions: 0
   })
}

const get_exec_id = (function() {
   let id = 1;

   return function() {
      return ++id;
   }
})();

/*---------------------------------------------------------------------*/
/*    findCausalityError ...                                           */
/*---------------------------------------------------------------------*/
function findCausalityError( machine ) {

   function min( a, b ) {
      return a < b ? a : b;
   }

   function tarjan( net ) {
      // https://fr.wikipedia.org/wiki/Algorithme_de_Tarjan
      // https://fr.wikipedia.org/wiki/Algorithme_de_Tarjan
      let num = 0;
      let P = [];
      let partition = [];

      function walk( v ) {
	 v.num = num;
	 v.numReachable = num;
	 num++;
	 P.push( v );
	 v.inP = true;

	 v.fanout_list.forEach( f => {
	    const w = f.net;

	    if( w.num === undefined ) {
	       walk( w );
	       v.numReachable = min( v.numReachable, w.numReachable );
	    } else if( w.inP ) {
	       v.numReachable = min( v.numReachable, w.num );
	    }
	 } );

	 if( v.numReachable === v.num ) {
	    let C = [];
	    let w;

	    do {
	       w = P.pop();
	       w.inP = false;
	       C.push( w );
	    } while( w !== v );

	    partition.push( C );
	 }
      }

      net.forEach( v => { if( !v.num ) walk( v ); } );

      net.forEach( n => {
	 delete n.inP;
	 delete n.num;
      } );

      return partition;
   }

   function isCyclic( src ) {
      let stack = [];

      function loop( net ) {
	 if( net === src ) {
	    return true;
	 } else if( stack.indexOf( net ) >= 0 ) {
	    return false;
	 } else {
	    stack.push( net );
	    return net.fanin_list.find( f => loop( f.net ) );
	 }
      }

      return src.fanin_list.find( f => loop( f.net ) );
   }

   function findCycleSignals( src ) {
      let stack = [];
      let res = [];

      function loop( net ) {
	 if( stack.indexOf( net ) < 0 ) {
	    if( net.accessor_list ) {
	       net.accessor_list.forEach( a => {
		  if( res.indexOf( a.signame ) < 0 ) {
		     res.push( a.signame );
		  }
	       } );
	    }
	    stack.push( net );
	    net.fanin_list.forEach( f => loop( f.net ) );
	 }
      }

      loop( src );
      return res;
   }

   function cycleSize( src ) {
      let stack = [];
      let res = 0;

      function loop( net ) {
	 if( stack.indexOf( net ) < 0 ) {
	    res++;
	    stack.push( net );
	    net.fanin_list.forEach( f => loop( f.net ) );
	 }
      }

      loop( src );
      return res;
   }

   let nets = machine.nets.filter( n => !n.isInKnownList );
   let components = tarjan( nets );

   // console.log( "COMP.tarjan=", components.map( n => n.length ) );

   let head = nets.find( n => isCyclic( n ) );

   if( head ) {
      return {
	 loc: head.ast_node.loc,
	 size: cycleSize( head ),
	 signals: findCycleSignals( head ) }
   } else {
      return {
	 loc: false,
	 size: -1,
	 signals: []
      };
   }
}

/*---------------------------------------------------------------------*/
/*    exports                                                          */
/*---------------------------------------------------------------------*/
exports.ReactiveMachine = ReactiveMachine;
