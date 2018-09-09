/*=====================================================================*/
/*    serrano/prgm/project/hiphop/0.2.x/lib/net-class.js               */
/*    -------------------------------------------------------------    */
/*    Author      :  Colin Vida                                        */
/*    Creation    :  Sun Sep  9 06:19:12 2018                          */
/*    Last change :  Sun Sep  9 06:55:56 2018 (serrano)                */
/*    Copyright   :  2018 Inria                                        */
/*    -------------------------------------------------------------    */
/*    HipHop net construction and propagation                          */
/*=====================================================================*/
"use strict"
"use hopscript"

/*---------------------------------------------------------------------*/
/*    import                                                           */
/*---------------------------------------------------------------------*/
const st = require( "./inheritance.js" );
const lang = require( "./lang.js" );
const error = require( "./error.js" );
const compiler = require( "./compiler.js" );
const signal = require( "./signal.js" );

/*---------------------------------------------------------------------*/
/*    fanin/fanout connections                                         */
/*---------------------------------------------------------------------*/
const FAN = { STD: 1, NEG: 2, DEP: 3 };

/*---------------------------------------------------------------------*/
/*    Net ...                                                          */
/*    -------------------------------------------------------------    */
/*    Net Root class hierarchy.                                        */
/*---------------------------------------------------------------------*/
class Net {
   constructor( ast_node, type, debug_name, lvl ) {
      ast_node.machine.nets.push( this );
      ast_node.net_list.push( this );

      this.debug_name =
	 `${ast_node.constructor.name}(${type.name}_${debug_name}:${lvl}`;

      this.ast_node = ast_node;
      this.fanin_list = [];
      this.fanout_list = [];
      this.machine = ast_node.machine;
      this.lvl = lvl;
      this.faninCount = 0;
      this.dependencyCount = 0;
      this.value = undefined;
   }

   knownValue() {
      return this.value === true || this.value === false;
   }

   reset( reset_machine ) {
      this.faninCount = 0;
      this.dependencyCount = 0;
      this.fanin_list.forEach( fanin => {
	 if (fanin.dependency) {
	    this.dependencyCount++;
	 } else {
	    this.faninCount++;
	 }
      });
   }

   propagate( knownList ) {
      if( this.machine.tracePropagation ) {
	 console.error( `propagate ${this.debug_name} value:${this.value} ${this.ast_node.loc.filename}:${this.ast_node.loc.pos}` );
      }

      this.fanout_list.forEach( fanout => {
	 let value = fanout.polarity ? this.value : !this.value;
	 if( fanout.net.receive( value, fanout.dependency ) ) {
	    knownList.push( fanout.net );
	 }
      });
   }

   hasBeenPropagated() {
      throw new error.InternalError( "not implemented" );
   }

   receive( _1, _2 ) {
      throw new error.InternalError( "not implemented" );
   }

   connect_to( net, type ) {
      function makeFan( net, type ) {
	 return { net: net,
		  polarity: type != FAN.NEG,
		  dependency: type == FAN.DEP,
		  antagonist: null }
      }

      if( type < FAN.STD || type > FAN.DEP ) {
	 throw new error.TypeError( "illegal fan", this.ast_node.loc );
      }
      
      if( !net ) {
	 throw new error.TypeError( `${this.debug_name}: undefined net`,
   				    this.ast_node.loc );
      }

      if( net instanceof RegisterNet ) {
	 if( net.fanin_list.length == 1 ) {
	    throw new error.TypeError( "too many fanin for register",
				       net.ast_node.loc );
	 }
	 if( type == FAN.DEP ) {
	    throw new error.TypeError( "illegal dependency",
				       net.ast_node.loc );
	 }
      }

      let fanout = makeFan( net, type );
      let fanin = makeFan( this, type );
      fanout.antagonist = fanin;
      fanin.antagonist = fanout;
      this.fanout_list.push( fanout );
      net.fanin_list.push( fanin );
   }
}

/*---------------------------------------------------------------------*/
/*    RegisterNet ...                                                  */
/*---------------------------------------------------------------------*/
class RegisterNet extends Net {
   constructor( ast_node, type, debug_name, lvl ) {
      super( ast_node, type, debug_name, lvl );
      
      this.stable_id = ast_node.instr_seq + "_" + ast_node.next_register_id++;
      
      // If true, this register must be true after the first machine
      // reinitialization (that follow a compilation)
      this.oneshot = false;
      this.noSweep = true;
   }

   reset( reset_machine ) {
      super.reset( reset_machine );

      if( this.oneshot ) {
	 this.value = true;
	 this.oneshot = false;
	 return;
      }

      if( reset_machine ) {
	 this.value = false;
      }
   }

   hasBeenPropagated() {
      return this.faninCount == 0;
   }
   
   receive( value, _ ) {
      if( this.machine.tracePropagation ) {
	 console.error( `     receive ${this.debug_name} value:${value}` );
      }
      this.faninCount--;

      if( this.faninCount < 0 ) {
	 throw new error.TypeError( "Out of range Register.faninCount",
				    this.ast_node.loc );
      }
      this.value = value;
      return false;
   }
}

/*---------------------------------------------------------------------*/
/*    LogicalNet                                                       */
/*---------------------------------------------------------------------*/
class LogicalNet extends Net {
   constructor( ast_node, type, debug_name, lvl, neutral ) {
      super( ast_node, type, debug_name, lvl );
   
      if( neutral != undefined && neutral != true && neutral != false ) {
	 throw new error.TypError( "`neutral` must be a boolean",
				   this.ast_node.loc );
      }
      this.neutral = neutral;
   }

   hasBeenPropagated() {
      return this.knownValue() && this.dependencyCount == 0;
   }


   receive( value, fromDep ) {
      let terminateEarly = false;

      if( this.machine.tracePropagation ) {
	 console.error( "     receive " + this.debug_name + " " +
			(this.fanin_list.length + 1 -
			 (this.dependencyCount + this.faninCount)) +
			"/" + this.fanin_list.length + " value:" +
			value + " dep:" + fromDep +
			" " + this.ast_node.loc.filename
			+ ":" + this.ast_node.loc.pos );
	 console.error( "             value-before:" + this.value );
      }

      if( this.hasBeenPropagated() ) {
	 if( this.machine.tracePropagation ) {
	    console.error( "             value-after:" + this.value,
			   "[PREVIOUSLY PROPAGATED]" );
	 }
	 //
	 // Don't return here in order to decrement and to check
	 // counters. This is usefull only for debugging and logging.
	 //
	 terminateEarly = true;
      }

      if( fromDep ) {
	 this.dependencyCount--;
      } else {
	 this.faninCount--;
      }

      if( this.dependencyCount < 0 || this.faninCount < 0 ) {
	 throw new error.TypeError( "Out of range fanin/dependency count." +
				    " [" + this.faninCount + " " +
				    this.dependencyCount + " " +
				    this.fanin_list.length + "]",
				    this.ast_node.loc );
      }

      if( terminateEarly ) {
	 return false;
      }

      if( value != this.neutral && !fromDep ) {
	 this.value = value;
      }

      let ret = false;
      if( this.dependencyCount == 0 ) {
	 if( this.knownValue() ) {
	    ret = true;
	 } else if( this.faninCount == 0 ) {
	    this.value = this.neutral;
	    ret = true;
	 }
      }

      if( this.machine.tracePropagation ) {
	 console.error( "             value-after:" + this.value );
      }

      return ret;
   }

   reset( reset_machine ) {
      super.reset( reset_machine );

      if( this.fanin_list.length == 0 ) {
	 this.value = this.neutral;
      } else {
	 this.value = -1;
      }
   }
}


function make_or( ast_node, type, debug_name, lvl=-1 ) {
   return new LogicalNet( ast_node, type, debug_name, lvl, false );
}

function make_and( ast_node, type, debug_name, lvl=-1 ) {
   return new LogicalNet( ast_node, type, debug_name, lvl, true );
}

/*---------------------------------------------------------------------*/
/*    ActionNet ...                                                    */
/*---------------------------------------------------------------------*/
class ActionNet extends LogicalNet {
   constructor( ast_node, type, debug_name, lvl, func, accessor_list ) {
      super( ast_node, type, debug_name, lvl, true );
      this.func = func;
      this.accessor_list = accessor_list;
      signal.runtimeSignalAccessor( ast_node, accessor_list, lvl, this );
      this.noSweep = true;
   }


   receive( value, fromDep ) {
      if( super.receive( value, fromDep ) ) {
	 if( this.value === true ) {
	    this.action();
	 }
	 return true;
      }
      return false;
   }

   apply_func() {
      let ret;

      if( this.func ) {
	 let sig = signal
	     .generate_this( this.ast_node.machine, this.accessor_list, this.lvl );
	 ret = this.func.call( sig );
      } else {
	 //
	 //  No function is provided to the ActionNet, hence, accessor
	 //  list has only one element, to access to a signal
	 //  (pre)presence.
	 //
	 let acc = this.accessor_list[ 0 ];

	 if( acc.get_pre ) {
	    ret = acc.signal.pre_gate.value;
	 } else {
	    let sig = acc.signal;
	    let lvl = this.lvl;
	    let max_lvl = lvl > sig.ast_node.depth ? sig.ast_node.depth : lvl;
	    ret = sig.gate_list[ max_lvl ].value;
	 }
      }

      return ret;
   }

   action() {
      this.apply_func();
   }
}

/*---------------------------------------------------------------------*/
/*    TestExpressionNet ...                                            */
/*---------------------------------------------------------------------*/
class TestExpressionNet extends ActionNet {
   constructor( ast_node, type, debug_name, lvl, func, accessor_list ) {
      super( ast_node, type, debug_name, lvl, func, accessor_list );
   }

   action() {
      this.value = !!this.apply_func();
   }
}

/*---------------------------------------------------------------------*/
/*    SignalExpressionNet ...                                          */
/*---------------------------------------------------------------------*/
class SignalExpressionNet extends ActionNet {
   constructor( ast_node, type, signal, debug_name, lvl ) {
      super( ast_node, type, debug_name, lvl, ast_node.func, ast_node.accessor_list );

      this.signal = signal;
      let max_lvl = lvl > signal.ast_node.depth ? signal.ast_node.depth : lvl;
      this.connect_to( signal.dependency_gate_list[ max_lvl ], FAN.DEP );
   }

   action() {
      this.signal.set_value( this.apply_func(), this.ast_node.loc );
   }
}

/*---------------------------------------------------------------------*/
/*    exports                                                          */
/*---------------------------------------------------------------------*/
exports.FAN = FAN;
exports.RegisterNet = RegisterNet;
exports.LogicalNet = LogicalNet;
exports.ActionNet = ActionNet;
exports.TestExpressionNet = TestExpressionNet;
exports.SignalExpressionNet = SignalExpressionNet;

exports.make_or = make_or;
exports.make_and = make_and;
