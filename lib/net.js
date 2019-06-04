/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/lib/net.js                    */
/*    -------------------------------------------------------------    */
/*    Author      :  Colin Vidal, Manuel Serrano                       */
/*    Creation    :  Sun Sep  9 06:19:12 2018                          */
/*    Last change :  Tue Jun  4 07:29:49 2019 (serrano)                */
/*    Copyright   :  2018-19 Inria                                     */
/*    -------------------------------------------------------------    */
/*    HipHop net construction and propagation                          */
/*=====================================================================*/
"use strict"
"use hopscript"

/*---------------------------------------------------------------------*/
/*    import                                                           */
/*---------------------------------------------------------------------*/
const lang = require( "./lang.js" );
const error = require( "./error.js" );
const compiler = require( "./compiler.js" );
const signal = require( "./signal.js" );
const path = require( "path" );

/*---------------------------------------------------------------------*/
/*    fanin/fanout connections                                         */
/*---------------------------------------------------------------------*/
const FAN = { STD: 1, NEG: 2, DEP: 3 };

/*---------------------------------------------------------------------*/
/*    debug_id; ...                                                    */
/*---------------------------------------------------------------------*/
let debug_id = 0;

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
	 `[${debug_id}]:${ast_node.constructor.name}[${path.relative(process.cwd(), ast_node.loc.filename)}:${ast_node.loc.pos}](${this.constructor.name})_${debug_name}:${lvl}/${ast_node.depth}`;

      this.debug_id = debug_id++;
      this.ast_node = ast_node;
      this.fanin_list = [];
      this.fanout_list = [];
      this.machine = ast_node.machine;
      this.lvl = lvl;
      this.trueFaninCount = 0;
      this.dependencyCount = 0;
      this.value = undefined;
      this.isInKnownList = false;
      this.valid = true; // see invalidate below
   }

   reset( reset_machine ) {
      this.trueFaninCount = 0;
      this.dependencyCount = 0;
      this.isInKnownList = false;

      const fanin_list = this.fanin_list;
      const len = fanin_list.length;
      
      for( let i = 0; i < len; i++ ) {
	 const fanin = fanin_list[ i ];
	 if (fanin.dependency) {
	    this.dependencyCount++;
	 } else {
	    this.trueFaninCount++;
	 }
      }
   }

   dump() {
      console.log( this.debug_name );
      if( this.fanout_list.length > 0 ) {
      	 console.log("   fanout",  
	    this.fanout_list.map( fan => 
	       	  fan.net.debug_id + (fan.dependency ? "!" : "") ) );
      }
      if( this.fanin_list.length > 0 ) {
      	 console.log("   fanin",  
	    this.fanin_list.map( fan => 
	       	  fan.net.debug_id + (fan.dependency ? "!" : "") ) );
      }
   }
   
   invalidate() {
      // a net is invalidate when its owner AST node is removed from
      // the program (see ast.removeChild)
      this.valid = false;
   }
   
   propagate( knownList ) {
      const trace = this.machine.tracePropagation;
      
      if( trace ) {
	 console.error( `propagate: ${this.debug_name} value:${this.value} ${this.ast_node.loc.filename}:${this.ast_node.loc.pos}` );
      }

      const fanout_list = this.fanout_list;
      const len = fanout_list.length;
      
      for( let i = 0; i < len; i++ ) {
	 const fanout = fanout_list[ i ];
	 let value = fanout.polarity ? this.value : !this.value;
	 
	 if( trace ) fanout.net.receiveTraceEnter();
	 if( fanout.net.receive( value, fanout.dependency ) ) {
	    if( !fanout.net.isInKnownList ) {
	       knownList.push( fanout.net );
	    }
	 }
	 if( trace ) fanout.net.receiveTraceExit();
      }
   }

   receiveTraceEnter() {
   }

   receiveTraceExit() {
   }
   
   receive( _1, _2 ) {
      throw new error.InternalError( `not implemented ${this.constructor.name}` );
   }

   connectTo( net, type ) {
      function makeFan( net, type ) {
	 return { 
	    net: net,
	    polarity: type !== FAN.NEG,
	    dependency: type === FAN.DEP,
	    antagonist: null
	 }
      }

      if( type === undefined || type < FAN.STD || type > FAN.DEP ) {
	 throw new error.TypeError( "illegal fan", this.ast_node.loc );
      }

      if( !net ) {
	 throw new error.TypeError( `${this.debug_name}: undefined net`,
  				    this.ast_node.loc );
      }

      if( net instanceof RegisterNet ) {
	 if( net.fanin_list.length === 1 ) {
	    throw new error.TypeError( "too many fanin for register",
				       net.ast_node.loc );
	 }
	 if( type === FAN.DEP ) {
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
      this.dynamic = false;
      this.noSweep = true;
   }

   reset( reset_machine ) {
      super.reset( reset_machine );

      if( this.dynamic ) {
	 this.value = true;
	 this.dynamic = false;
	 return;
      }

      if( reset_machine ) {
	 this.value = false;
      }
   }

   receive( value, _ ) {
      if( this.machine.tracePropagation ) {
	 console.error( `     receive ${this.debug_name} value:${value}` );
      }
      this.trueFaninCount--;

      if( this.trueFaninCount < 0 ) {
	 throw new error.TypeError( "Out of range Register.trueFaninCount",
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

   reset( reset_machine ) {
      super.reset( reset_machine );

      if( this.fanin_list.length === 0 ) {
	 this.value = this.neutral;
      } else {
	 this.value = undefined;
      }
   }

   receiveTraceEnter() {
      console.error( "   >>> receive " + this.debug_name + " " +
		     (this.fanin_list.length + 1 -
		      (this.dependencyCount + this.trueFaninCount)) +
		     "/" + this.fanin_list.length + " value:" +
		     this.value + 
		     " " + this.ast_node.loc.filename
		     + ":" + this.ast_node.loc.pos );
      console.error( "      value-before:" + this.value );
   }

   receiveTraceExit() {
      console.error( "   <<< " + this.debug_name + " " + this.value );
   }

   receive( value, fromDep ) {
      let ret = false;

      if( this.isInKnownList ) {
	 // already handled, return immediately,
	 // nothing to be done by the caller.
	 return false;
      }

      if( fromDep ) {
	 // new dependency resolved (received value is meaningless)
	 // we should be in an ActionNet with neutral==1 and only one input,
	 // to be checked
	 this.dependencyCount--;
	 
	 this.checkNet();
	 
	 // net becomes known if no more dependencies and value is already
	 // neutral. if value not yet known, will be put in knowList later
	 // when receiving the value of a true fanin
	 // if value is kown not-neutral, has already been propagated
	 if( this.dependencyCount === 0 ) {
	    if( this.value !== undefined ) {
	       ret = true;
	    } else if( this.trueFaninCount == 0 ) {
	       this.value = this.neutral;
	       ret = true;
	    }
	 }
      } else {
	 // true fanin
	 this.trueFaninCount--;
	 
	 this.checkNet();
	 
	 if( value !== this.neutral ) {
	    // value received is not-neutral, immediately becomes the net's
	    // value, always return true because dependencies are not
	    // relevant anymore
	    this.value = value;
	    ret = true;
	 } else {
	    // neutral value received, value becomes neutral if no more
	    // true fanin, but then return true only if there are
	    // no more dependencies
	    if( this.trueFaninCount === 0 ) {
	       this.value = this.neutral;
	       ret = (this.dependencyCount === 0);
	    } else {
	       // wait for more inputs
	       ret = false;
	    }
	 }
      }

      return ret;
   }
   
   receiveOrig( value, fromDep ) {
      let ret = false;

      if( this.isInKnownList ) {
	 // already handled, return immediately,
	 // nothing to be done by the caller.
	 return false;
      }

      if( fromDep ) {
	 this.dependencyCount--;

	 this.checkNet();
	 
	 if( this.dependencyCount === 0 ) {
	    if( this.value !== undefined ) {
	       ret = true;
	    } else if( this.trueFaninCount == 0 ) {
	       this.value = this.neutral;
	       ret = true;
	    }
	 }
      } else {
	 this.trueFaninCount--;

	 this.checkNet();
	 
	 if( value != this.neutral ) {
	    this.value = value;
	 }

	 if( this.dependencyCount == 0 ) {
	    if( this.value !== undefined ) {
	       ret = true;
	    } else if( this.trueFaninCount == 0 ) {
	       this.value = this.neutral;
	       ret = true;
	    }
	 }
      }

      return ret;
   }

   receiveGG( value, fromDep ) {
      let ret = false;

      if( this.isInKnownList ) {
	 // already handled, return immediately,
	 // nothing to be done by the caller.
	 return false;
      }

      if( fromDep ) {
	 // new dependency resolved (received value is meaningless)
	 // we should be in an ActionNet with neutral==1 and only one input,
	 // to be checked
	 this.dependencyCount--;
	 
	 this.checkNet();
	 
	 // net becomes known if no more dependencies and value is already
	 // neutral. if value not yet known, will be put in knowList later
	 // when receiving the value of a true fanin
	 // if value is kown not-neutral, has already been propagated
	 ret = (this.dependencyCount === 0 && this.value === this.neutral);
      } else {
	 // true fanin
	 this.trueFaninCount--;
	 
	 this.checkNet();
	 
	 if( value !== this.neutral ) {
	    // value received is not-neutral, immediately becomes the net's
	    // value, always return true because dependencies are not
	    // relevant anymore
	    this.value = value;
	    ret = true;
	 } else {
	    // neutral value received, value becomes neutral if no more
	    // true fanin, but then return true only if there are
	    // no more dependencies
	    if( this.trueFaninCount === 0 ) {
	       this.value = this.neutral;
	       ret = (this.dependencyCount === 0);
	    } else {
	       // wait for more inputs
	       ret = false;
	    }
	 }
      }

      return ret;
   }
   
   checkNet() {
      if( this.dependencyCount < 0 || this.trueFaninCount < 0 ) {
	 throw new error.TypeError( "Out of range fanin/dependency count." +
				    " [" + this.trueFaninCount + " " +
				    this.dependencyCount + " " +
				    this.fanin_list.length + "]",
				    this.ast_node.loc );
      }
   }
}

function makeOr( ast_node, type, debug_name, lvl=0 ) {
  return new LogicalNet( ast_node, type, debug_name, lvl, false );
}

function makeAnd( ast_node, type, debug_name, lvl=0 ) {
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
      this.actionArgs = new Array( lvl + 1 ).fill( false );
      signal.runtimeSignalAccessor( ast_node, accessor_list, lvl, this );
      this.noSweep = true;

      // pre-allocate the objects that wil be passed as 
      // the "this" to user actions
      for( let i = 0; i <= lvl; i++ ) {
	 this.actionArgs[ i ] = 
	    new signal.ActionArg( ast_node.machine, accessor_list );
      }
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
      if( this.func ) {
	 const functhis = this.actionArgs[ this.lvl ];
	 functhis.fill( this.accessor_list, this.lvl );
	 functhis[ "%frame" ] = "toto";
	 
	 return this.func.call( functhis );
      } else {
	 // No function is provided to the ActionNet, hence, accessor
	 // list has only one element, to access to a signal
	 // (pre)presence.
	 let acc = this.accessor_list[ 0 ];

	 if( acc.get_pre ) {
	    return acc.signal.pre_gate.value;
	 } else {
	    let sig = acc.signal;
	    let lvl = this.lvl;
	    let min_lvl = lvl > sig.ast_node.depth ? sig.ast_node.depth : lvl;
	    
	    return sig.gate_list[ min_lvl ].value;
	 }
      }
   }

   action() {
      if( this.valid ) {
	 this.apply_func();
      }
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
      if( this.valid ) {
	 this.value = !!this.apply_func();
      }
   }
}

/*---------------------------------------------------------------------*/
/*    SignalExpressionNet ...                                          */
/*---------------------------------------------------------------------*/
class SignalExpressionNet extends ActionNet {
   constructor( ast_node, type, signal, debug_name, lvl, func, accessor_list ) {
      super( ast_node, type, debug_name, lvl, func, accessor_list );

      this.signal = signal;
      let min_lvl = lvl > signal.ast_node.depth ? signal.ast_node.depth : lvl;
      this.connectTo( signal.dependency_gate_list[ min_lvl ], FAN.DEP );
   }

   action() {
      if( this.valid ) {
	 this.signal.set_value( this.apply_func(), this.lvl, this.ast_node.loc );
      }
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

exports.makeOr = makeOr;
exports.makeAnd = makeAnd;
