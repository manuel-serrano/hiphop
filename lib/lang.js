/*=====================================================================*/
/*    serrano/prgm/project/hiphop/0.2.x/lib/lang.js                    */
/*    -------------------------------------------------------------    */
/*    Author      :  Colin Vidal                                       */
/*    Creation    :  Mon Jul 16 11:12:00 2018                          */
/*    Last change :  Mon Jul 23 13:07:11 2018 (serrano)                */
/*    Copyright   :  2018 Manuel Serrano                               */
/*    -------------------------------------------------------------    */
/*    HipHop language definition                                       */
/*=====================================================================*/
"use strict"
"use hopscript"

const hh = require("./hiphop.js");
const ast = require("./ast.js");
const error = require("./error.js");

/*---------------------------------------------------------------------*/
/*    KEYWORDS ...                                                     */
/*    -------------------------------------------------------------    */
/*    HH reserved keywords, can't be used as signal or trap names      */
/*---------------------------------------------------------------------*/
const KEYWORDS = /(\d|^)(signal|immediate|pre|value|not|apply|countValue|countApply|res|susp|kill|ifApply|ifValue|id|from|fromValue|fromApply|applyAccessors|countAccessors|to|toValue|toApply|toggleSignal|toggleValue|toggleApply|toggleAccessors|emitWhenSuspended|noDebug|name)(\s|$)/i;

/*---------------------------------------------------------------------*/
/*    makeAccessor ...                                                 */
/*    -------------------------------------------------------------    */
/*    Helper function generating signal accessors                      */
/*---------------------------------------------------------------------*/
function makeAccessor( signame, type, loc ) {
   switch( type ) {
      case "value":
	 return new ast.SignalAccessor( signame, false, true );
      case "preValue":
	 return new ast.SignalAccessor( signame, true, true );
      case "present":
	 return new ast.SignalAccessor( signame, false, false );
      case "prePresent":
	 return new ast.SignalAccessor( signame, true, false );
      default:
	 throw new TypeError( signame + ": illegal signal accessor.", loc );
   }
}

//
// Return a well formed string of the location of the HH instruction.
//
const attrsLoc = function( attrs ) {
   let loc = attrs[ "%location" ];

   if( loc != undefined ) {
      return loc;
   }
   
   return "[LOC DISABLED --- run hop -g to get location]";
}

//
// Get a list of signal name.
//
const get_signal_name_list = function(attrs, loc) {
   let signal_name_list = [];

   for (let name in attrs) {
      if (!name.match(KEYWORDS) && name != "%location")
	 signal_name_list.push(name);
      else if (name.match(/^signal/i))
	 signal_name_list.push(attrs[name]);
   }

   return signal_name_list;
}

/*---------------------------------------------------------------------*/
/*    getTrapName ...                                                  */
/*    -------------------------------------------------------------    */
/*    Get the name of a trap. It must be unique, an error is thrown    */
/*    otherwise.                                                       */
/*---------------------------------------------------------------------*/
function getTrapName( tag, attrs ) {
   let loc = attrs[ "%location" ];
   let trap_name = ""

   for( let name in attrs ) {
      if( !name.match(KEYWORDS) && name != "%location" ) {
	 if( trap_name == "" ) {
	    trap_name = name;
	 } else {
	    throw new SyntaxError( tag + ": only one trap name expected." +
				   " At least two given: " +
				   trap_name + " " + name + ".",
				   loc );
	 }
      }
   }

   if( trap_name == "" ) {
      throw new SyntaxError( tag + ": trap name is missing.", loc );
   }

   return trap_name;
}

/*---------------------------------------------------------------------*/
/*    isHiphopInstruction ...                                          */
/*    -------------------------------------------------------------    */
/*    Helper function telling is an object holds an HH instructions.   */
/*---------------------------------------------------------------------*/
function isHiphopInstruction( obj ) {
   return obj instanceof ast.ASTNode;
}

/*---------------------------------------------------------------------*/
/*    isHiphopSignal ...                                               */
/*---------------------------------------------------------------------*/
function isHiphopSignal( obj ) {
   return obj instanceof ast.SignalProperties;
}

/*---------------------------------------------------------------------*/
/*    isValSignalAccessor ...                                          */
/*---------------------------------------------------------------------*/
function isValSignalAccessor( obj ) {
   return (obj instanceof ast.SignalAccessor) && !obj.is_counter;
}

/*---------------------------------------------------------------------*/
/*    isCntSignalAccessor ...                                          */
/*---------------------------------------------------------------------*/
function isCntSignalAccessor( obj ) {
   return (obj instanceof ast.SignalAccessor) && obj.is_counter;
}

//
// Allows to easilly expands children node when building high level
// instructions (see macro.js, ../ulib/*.js)
//
const expandChildren = function(children) {
   function _expandChildren(c) {
      return <sequence nodebug>
        ${isHiphopInstruction(c[0]) ? c[0] : <nothing nodebug/>}
        ${c.length > 1 ? _expandChildren(c.slice(1)) : <nothing nodebug/>}
      </sequence>;
   }
   return _expandChildren(Array.prototype.slice.call(children, 1,
						     children.length));
}


/*---------------------------------------------------------------------*/
/*    getSignalDeclList ...                                            */
/*    -------------------------------------------------------------    */
/*    Parse MODULE and LOCAL instructions in order to return a list    */
/*    of signal declarations. These objets contain the following       */
/*    fields:                                                          */
/*                                                                     */
/*      `name` the name of the signal                                  */
/*      `accessibility` hh.IN hh.OUT hh.INOUT if undefined, hh.INOUT   */
/*         by default                                                  */
/*      `direction` an alias for ACCESSIBILITY                         */
/*      `init_func` initialisation of signal when their scope is       */
/*         created                                                     */
/*      `init_accessor_list` list of signal accessor used in INIT_FUNC */
/*      `reinit_func` reinitialisation of signal at each reaction      */
/*      `reinit_accessor_list` list of signal accessor used in         */
/*         REINIT_FUNC                                                 */
/*      `combine` a combinaison function with arity 2                  */
/*      `bound` a signal name on which this signal is bound            */
/*                                                                     */
/*    Signals are coming from two sources:                             */
/*       - attributes                                                  */
/*       - signal children                                             */
/*                                                                     */
/*    See ast.js for more details about these objects.                 */
/*---------------------------------------------------------------------*/
function getSignalDeclList( tag, attrs, nodes, loc ) {
   let signal_declaration_list = [];

   for( let name in attrs ) {
      if( name == "%location"
	  || name == "id"
	  || name.toLowerCase() == "__hh_reserved_debug_name__" ) {
	 continue;
      }

      let prop = attrs[ name ];
      let init_func;
      let init_accessor_list = [];
      let reinit_func;
      let reinit_accessor_list = [];

      if( name.match( KEYWORDS ) ) {
	 throw new SyntaxError( tag + ": illegal signal name (" + name + ").",
				loc );
      }

      if( prop && typeof( prop ) != "object" ) {
	 throw new SyntaxError( tag + ": bad signal declaraion (" + name + ").",
				loc );
      }

      // direction is an alias for accessibility. If both are defined,
      // direction override accessibility.
      if( prop.direction ) {
	 prop.accessibility = prop.direction;
      }

      if( prop.accessibility &&
	  prop.accessibility != IN &&
	  prop.accessibility != OUT &&
	  prop.accessibility != INOUT ) {
	 throw new SyntaxError( tag +
				": signal accessibility/Direction must be " +
				"IN, OUT, or INOUT (" + name + ").",
				loc );
      }

      if( prop.initValue && prop.initApply ) {
	 throw new SyntaxError( tag + ": signal initial value must be given through " +
				"initValue or initApply. Not both (" +
				name + ").",
				loc );
      }

      if( prop.reinitValue && prop.reinitApply ) {
	 throw new SyntaxError( tag + ": reinit value must be given through " +
				"reinitValue or reinitApply. Not both (" +
				name + ").",
				loc );
      }
      
      if( prop.initApply && !(prop.initApply instanceof Function) ) {
	 throw new SyntaxError( tag + ": initApply must be a function (" +
				name + ")." , loc );
      }

      if( prop.reinitApply && !(prop.reinitApply instanceof Function) ) {
	 throw new SyntaxError( tag + ": reinitApply must be a function (" +
				name + ").", loc );
      }

      if( prop.combine ) {
	 if( !(prop.combine instanceof Function) ) {
	    throw new SyntaxError( tag + ": combine must be a function (" +
				   name + ").", loc );
	 } else if( prop.combine.length != 2 ) {
	    throw new SyntaxError( tag + ": arity on combine must be 2 (" +
				   name + ")." , loc );
	 }
      }

      if( prop.bound &&
	  !(typeof( prop.bound ) == "string"
	    || prop.bound instanceof String) ) {
	 throw new SyntaxError( tag + ": bound must be a string ("
				+ name + ").",
				loc);
      }

      if( prop.initValue !== undefined ) {
	 init_func = () => prop.initValue;
      } else if( prop.initApply ) {
	 init_func = prop.initApply;
	 init_accessor_list =
	    getAccessorList( init_func, prop.initAccessors, loc );
      }

      if( prop.reinitValue !== undefined ) {
	 reinit_func = () => prop.reinitValue;
      } else if( prop.reinitApply ) {
	 reinit_func = prop.reinitApply;
	 reinit_accessor_list =
	    getAccessorList( reinit_func,
			     undefined, // not allowed by new syntax
			     loc );
      }

      signal_declaration_list.push(
	 new ast.SignalProperties( attrs.id, loc, name,
				   prop.accessibility, init_func,
				   init_accessor_list, reinit_func,
				   reinit_accessor_list, prop.combine,
				   prop.bound ) );
   }

   return signal_declaration_list.concat( flatten( nodes, isHiphopSignal ) );
}

/*---------------------------------------------------------------------*/
/*    getAccessorList ...                                              */
/*    -------------------------------------------------------------    */
/*    Returns a list of signal accessors, used to build dependencies   */
/*    and receiver of runtine functions.                               */
/*                                                                     */
/*    This function handles two cases:                                 */
/*                                                                     */
/*        - this.type.signal                                           */
/*        - this.type["s"]                                             */
/*                                                                     */
/*    It now (June 2018) accepts a second parameter: accessors which   */
/*    have been already parsed by preprocessor.                        */
/*---------------------------------------------------------------------*/
function getAccessorList( func, accessors, loc ) {
   if( accessors ) {
      return accessors.map(acc => makeAccessor( acc.name, acc.type, loc ) );
   }

   // legacy code ...
   if( !func )
      return [];

   let code = func.toString();

   //
   // This regex is buggy: \s dosen't seems to works, and the
   // workaround (\t| *) in order to detect horizontal space or
   // nothing, should probably fails on some cases...
   //
   const regex_error = new RegExp( "this\\.(value|preValue|present|prePresent)(\\.[a-zA-Z0-9_]+|\\[\\\"[a-zA-Z0-9_]\\\"\\])((\t| *|.(?!=))=(?!=))", "g" );

   if( code.match( regex_error ) ) {
      throw new SyntaxError("A signal accessor is immutable. "
   			    + "(You may want to use EMIT instead?)", loc );
   }

   const regex = new RegExp( "this\\.(value|preValue|present|prePresent)(\\.[a-zA-Z0-9_]+|\\[\\\"[a-zA-Z0-9_]\\\"\\])", "g" );
   let raw_signals = code.match(regex);

   if( !raw_signals )
      return [];

   return raw_signals.map( function(el, i, arr ) {
      let signalName;
      let type;
      let s = el.split( "." );

      if( s[0] != "this" ) {
	 throw new TypeError( "Wrong accessor parsing (1)", loc );
      } else if( s.length == 2 ) {
	 s = s[ 1 ].split( '["' );
	 type = s[ 0 ];
	 signalName = s[ 1 ].substr( 0, s[ 1 ].length - 2 );
      } else if( s.length == 3 ) {
	 type = s[ 1 ];
	 signalName = s[ 2 ];
      } else {
	 throw new TypeError( "Wrong accessor parsing (2)", loc );
      }

      return makeAccessor( signalName, type, loc );
   });
}


//
// Helper function telling if nodebug keyword is present on the attrs
// of the node. If it is present, it is removed and the function
// return true. Return false otherwise.
//
// We can't use get_arguments to get this information since
// get_argument is not used for all HH instructions.
//
// This function is useless for instructions using get_arguments.
//
const has_nodebug_kwd = function(attrs) {
   if (!attrs)
      return false;

   for (let key in attrs) {
      if (key.toLowerCase() == "nodebug") {
	 delete attrs[key];
	 return true;
      }
   }

   return false;
}

//
// Parse a HH expression and returns an object containing the
// following fields:
//
// `loc` the location of the node
// `id` an identifier given by user
// `signal_name_list` the name of a signal
// `func` a function to call at runtime
// `accessor_list` accessor list of signal to access at runtime
// `immediate` boolean
// `pre` boolean
// `not` boolean
// `func_count` a function to call at runtime/GO
// `accesor_list_count` accessor list of signal to access at runtime/GO
// `nodebug` the instruction should be hidden on debugger
//
function getArguments( tag, attrs, loc, raise ) {
   let raw = {};
   let args = {
      loc: loc,
      id: "",
      signal_name_list: [],
      func: null,
      accessor_list: [],
      immediate: false,
      not: false,
      pre: false,
      func_count: null,
      accessor_list_count: [],
      nodebug: false
   };

   for( let name in attrs )
      if( name.match( KEYWORDS ) )
	 raw[ name.toLowerCase() ] = attrs[ name ];

   if( raw.value && raw.apply ) {
      throw new SyntaxError( tag + ": apply and value can't be used at same time.",
			     loc );

   }
   
   if( raw.apply && !(raw.apply instanceof Function) ) {
      throw new SyntaxError( tag + ": apply must be a function.", loc );
   }

   if( raise && raw.immediate && (raw.value || raw.apply) ) {
      throw new SyntaxError( tag + ": immediate can't be used with an expression.",
			     loc );
   }

   if( raise && raw.pre && (raw.value || raw.apply) ) {
      throw new SyntaxError( tag + "pre can't be used with an expression.", loc );
   }

   if( raw.apply ) {
      if( !(raw.apply instanceof Function) )
	 throw new SyntaxError( tag + ": apply must be a function.", loc );
      args.func = raw.apply
      args.accessor_list =
	 getAccessorList( raw.apply, raw.applyaccessors, loc );
   } else if( raw.value !== undefined ) {
      args.func = () => raw.value;
   }

   if( raw.countapply ) {
      if( !(raw.countapply instanceof Function) ) {
	 throw new SyntaxError( tag + ": countApply must be a function.", loc );
      }
      args.func_count = raw.countapply;
      args.accessor_list_count =
	 getAccessorList( raw.countapply, raw.countapplyaccessors, loc );
   } else if( raw.countvalue !== undefined ) {
      args.func_count = () => raw.countvalue;
   }

   let hasFlag = kwd => {
      return raw.hasOwnProperty( kwd )
	 && ((raw[ kwd ] == "" && (typeof raw[ kwd ] == "string"))
	     || raw[ kwd ] === true);
   }
   
   args.immediate = hasFlag( "immediate" );

   args.pre = hasFlag( "pre" );
   args.signal_name_list = get_signal_name_list( attrs, loc );
   args.id = raw.id;
   args.not = hasFlag( "not" );
   args.nodebug = hasFlag( "nodebug" );

   return args;
}

/*---------------------------------------------------------------------*/
/*    getArgumentsActionNode ...                                       */
/*    -------------------------------------------------------------    */
/*    Gets arguments of action node and check their validity.          */
/*---------------------------------------------------------------------*/
function getArgumentsActionNode( tag, attrs, raise ) {
   const loc = attrs[ "%location" ];
   let args = getArguments( tag, attrs, loc, raise );

   if( !args.func ) {
      throw new SyntaxError( tag + ": missing `apply' attribute.", loc );
   }

   return args;
}

/*---------------------------------------------------------------------*/
/*    getArgumentsExpressionNode ...                                   */
/*    -------------------------------------------------------------    */
/*    Gets arguments of (count)expression node and check their         */
/*    validity.                                                        */
/*---------------------------------------------------------------------*/
function getArgumentsExpressionNode( tag, attrs, loc, raise ) {
   if( !loc ) loc = attrs[ "%location" ];

   let args = getArguments( tag, attrs, loc, raise );
   let signal_name = args.signal_name_list[ 0 ];

   if( args.signal_name_list.length > 1 ) {
      throw new SyntaxError( tag + ": only one signal name expected. " +
			     args.signal_name_list.length + " given: " +
			     args.signal_name_list,
			     loc );
   }

   if( signal_name && args.func ) {
      throw new SyntaxError( tag + ": expressions can take a signal or " +
			     "an expression. Not both.",
			     loc);
   }

   if( signal_name ) {
      args.accessor_list[ 0 ] =
	 makeAccessor( signal_name, (args.pre ? "prePresent" : "present"), loc );
   } else if ( !args.func && raise ) {
      throw new SyntaxError( tag + ": missing signal or missing expression.",
			     loc);
   }

   if( args.pre && !signal_name ) {
      throw new SyntaxError( tag + ": can't use pre without signal.", loc );
   }

   return args;
}

/*---------------------------------------------------------------------*/
/*    getArgumentsCountExpressionNode ...                              */
/*    -------------------------------------------------------------    */
/*    Gets arguments of count expression node and check their          */
/*    validity.                                                        */
/*---------------------------------------------------------------------*/
function getArgumentsCountExpressionNode( tag, attrs, raise ) {
   let loc = attrs[ "%location" ];
   let args = getArgumentsExpressionNode( tag, attrs, loc, raise );

   if( args.immediate && args.func_count )
      throw new SyntaxError( tag + ": can't use immediate with count expression.",
			     loc );

   return args;
}

/*---------------------------------------------------------------------*/
/*    getEmitNodeArguments ...                                         */
/*    -------------------------------------------------------------    */
/*    Gets arguments of emit node and check their validity.            */
/*---------------------------------------------------------------------*/
function getEmitNodeArguments( tag, attrs, exec_context=false ) {
   let ctxt = exec_context ? "exec" : "emit";
   let loc = attrs[ "%location" ];
   let args = getArguments( tag, attrs, loc, true );
   let signal_name_list = args.signal_name_list;

   if( signal_name_list.length == 0 && !exec_context ) {
      throw new SyntaxError( tag + ": signal name is missing.", loc );
   }

   if( args.func_count ) {
      throw new SyntaxError( tag + ": counter expression can't be used in " +
			     ctxt + ".", loc );
   }

   if( args.pre ) {
      throw new SyntaxError( tag + ": pre can't be used in " + ctxt + ".", loc );
   }

   if( args.immediate ) {
      throw new SyntaxError( tag + ": immediate can't be used in " + ctxt + ".",
			     loc );
   }

   for( let i in args.accessor_list ) {
      let acc = args.accessor_list[ i ];

      for( let j in signal_name_list ) {
	 let signal_name = signal_name_list[ j ];

	 if( acc.signal_name == signal_name && !acc.get_pre && !exec_context ) {
	    throw new SyntaxError( tag + ": can't get current value of a " +
				   "signal to update itself. " +
				   "(missing pre?)",
				   loc);
	 }
      }
   }

   if( !exec_context ) {
      args.if_accessor_list = [];

      for( let name in attrs ) {
	 function _error_exclusive() {
	    throw new SyntaxError( tag + ": ifApply and ifValue are exclusives.",
				   loc );
	 }

	 let if_exists = false;

	 if( name.toLowerCase() == "ifapply" ) {
	    let ifapply = attrs[ name ];

	    if( if_exists ) _error_exclusive();
	    if_exists = true;

	    if( !(ifapply instanceof Function) ) {
	       throw new SyntaxError( tag + ": ifApply must be a function.",
				      loc );
	    }
	    args.if_func = ifapply;
	    args.if_accessor_list = getAccessorList( ifapply, undefined, loc );
	 }

	 if( name.toLowerCase() == "ifvalue" ) {
	    if( if_exists ) _error_exclusive();
	    if_exists = true;
	    args.if_func = () => attrs[ name ];
	 }
      }
   }

   return args;
}

/*---------------------------------------------------------------------*/
/*    makeImplicitSequence ...                                         */
/*    -------------------------------------------------------------    */
/*    Build an implicit sequence from a list of HH instructions.       */
/*---------------------------------------------------------------------*/
function makeImplicitSequence( attrs, children ) {
   if( children.length == 1 ) return children;
   return new ast.Sequence( null, attrsLoc(attrs), true, children );
}

/*---------------------------------------------------------------------*/
/*    flatten ...                                                      */
/*---------------------------------------------------------------------*/
function flatten( arg, pred ) {
   if( pred( arg ) ) {
      return [ arg ];
   } else if( arg instanceof Array ) {
      return arg.reduce( (acc, x) => acc.concat( flatten( x, pred ) ), [] );
   } else {
      return [];
   }
}
      
/*---------------------------------------------------------------------*/
/*    checkChildren ...                                                */
/*---------------------------------------------------------------------*/
function checkChildren( tag, attrs, args, min, max ) {
   let children = flatten( args, isHiphopInstruction );
      
   if( children.length < min || (max > -1 && children.length > max) ) {
      let msg = "arity error; expected ";

      if( min > -1 && max > -1 ) {
	 msg += "min " + min + " max " + max;
      } else if( min > -1 ) {
	 msg += "min " + min;
      } else if( max > -1 ) {
	 msg += "max " + max;
      }

      msg += ", but " + children.length + " given."

      throw new SyntaxError( tag + ": " + msg, attrs[ "%location" ] ); 
   }

   return children;
}
   
/*---------------------------------------------------------------------*/
/*    checkNoChildren ...                                              */
/*---------------------------------------------------------------------*/
function checkNoChildren( tag, attrs, args ) {
   return checkChildren( tag, attrs, args, 0, 0 );
}

/*---------------------------------------------------------------------*/
/*    checkChildrenMin ...                                             */
/*---------------------------------------------------------------------*/
function checkChildrenMin( tag, attrs, args, min ) {
   return checkChildren( tag, attrs, args, min, -1 );
}

/*---------------------------------------------------------------------*/
/*    MODULE ...                                                       */
/*---------------------------------------------------------------------*/
function MODULE( attrs={}, ...nodes ) {
   const children = checkChildrenMin( "MODULE", attrs, nodes, 1 );

   return new ast.Module( attrs.id, attrs[ "%location" ],
			  attrs.__hh_reserved_debug_name__,
			  getSignalDeclList( "MODULE", attrs, nodes, attrs[ "%location" ] ),
			  makeImplicitSequence( attrs, children ) );
}

/*---------------------------------------------------------------------*/
/*    LOCAL ...                                                        */
/*---------------------------------------------------------------------*/
function LOCAL( attrs={}, ...nodes ) {
   const children = checkChildrenMin( "LOCAL", attrs, nodes, 1 );
   
   return new ast.Local( attrs.id, attrs[ "%location" ],
			 has_nodebug_kwd( attrs ),
			 getSignalDeclList( "LOCAL", attrs, nodes, attrs[ "%location" ] ),
			 makeImplicitSequence( attrs, children ) );
}

/*---------------------------------------------------------------------*/
/*    SIGNAL ...                                                       */
/*---------------------------------------------------------------------*/
function SIGNAL( attrs={}, ...nodes ) {
   const loc = attrs[ "%location" ];
   let dir = "INOUT";

   if( attrs.direction ) {
      switch( attrs.direction ) {
	 case "in": 
	 case "IN": dir = hh.IN; break;
	    
	 case "out": 
	 case "OUT": dir = hh.OUT; break;
	    
	 case "inout": 
	 case "INOUT": dir = hh.INOUT; break;
	    
	 default: throw SyntaxError( "SIGNAL: illegal direction `"
				     + attrs.direction + "'", loc );
      }
   }
   
   checkNoChildren( "SIGNAL", attrs, nodes );
   if( !("name" in attrs) ) {
      throw SyntaxError( "SIGNAL: name missing", loc );
   }
   
   return new ast.SignalProperties( attrs.id, loc, attrs.name, dir,
				    undefined, // init_func
				    [], // init_accessor_list
				    undefined, // reinit_func
				    [], // reinit_accessor_list
				    attrs.combine_func, // combine
				    undefined ); // bound
}
   
/*---------------------------------------------------------------------*/
/*    EMIT ...                                                         */
/*---------------------------------------------------------------------*/
function EMIT( attrs={}, ...nodes ) {
   const args = getEmitNodeArguments( "EMIT", attrs );
   let axs = nodes.filter( isValSignalAccessor );
   let cntaxs = nodes.filter( isCntSignalAccessor );
   checkNoChildren( "EMIT", attrs, nodes );

   return new ast.Emit( args.id, attrs[ "%location" ],
			args.nodebug, args.signal_name_list,
			args.func, args.accessor_list.concat( axs ),
			args.if_func,
			args.if_accessor_list.concat( cntaxs ) );
}

/*---------------------------------------------------------------------*/
/*    SUSTAIN ...                                                      */
/*---------------------------------------------------------------------*/
function SUSTAIN( attrs={}, ...nodes ) {
   const args = getEmitNodeArguments( "SUSTAIN", attrs );
   let axs = nodes.filter( isValSignalAccessor );
   let cntaxs = nodes.filter( isCntSignalAccessor );
   checkNoChildren( "SUSTAIN", attrs, nodes );
   
   return new ast.Sustain( args.id, attrs[ "%location" ], args.nodebug,
			   args.signal_name_list, args.func,
			   args.accessor_list.concat( axs ), args.if_func,
			   args.if_accessor_list.concat( cntaxs ) );
}

/*---------------------------------------------------------------------*/
/*    IF ...                                                           */
/*---------------------------------------------------------------------*/
function IF( attrs={}, ...nodes ) {
   let axs = nodes.filter( isValSignalAccessor );
   const loc = attrsLoc( attrs );
   const args = getArgumentsExpressionNode( "IF", attrs, loc, !axs.length );
   const children = checkChildren( "IF", attrs, nodes, 1, 2 );
   
   return new ast.If( args.id, loc, args.nodebug,
		      [ children[ 0 ], children[ 1 ] ],
   		      args.not, args.func, args.accessor_list.concat( axs ) );
}

/*---------------------------------------------------------------------*/
/*    NOTHING ...                                                      */
/*---------------------------------------------------------------------*/
function NOTHING( attrs={}, ...nodes ) {
   checkNoChildren( "NOTHING", attrs, nodes );
   
   return new ast.Nothing( attrs.id, attrsLoc( attrs ), has_nodebug_kwd( attrs ));
}

/*---------------------------------------------------------------------*/
/*    PAUSE ...                                                        */
/*---------------------------------------------------------------------*/
function PAUSE( attrs={}, ...nodes ) {
   checkNoChildren( "PAUSE", attrs, nodes );
   
   return new ast.Pause( attrs.id, attrsLoc( attrs ), has_nodebug_kwd( attrs ) );
}

/*---------------------------------------------------------------------*/
/*    HALT ...                                                         */
/*---------------------------------------------------------------------*/
function HALT( attrs={}, ...nodes ) {
   checkNoChildren( "HALT", attrs, nodes );
   
   return new ast.Halt( attrs.id, attrsLoc( attrs ), has_nodebug_kwd( attrs ));
}

/*---------------------------------------------------------------------*/
/*    AWAIT ...                                                        */
/*---------------------------------------------------------------------*/
function AWAIT( attrs={}, ...nodes ) {
   let axs = nodes.filter( isValSignalAccessor );
   let cntaxs = nodes.filter( isCntSignalAccessor );
   let args = getArgumentsCountExpressionNode( "AWAIT", attrs, !axs.length );
   checkNoChildren( "AWAIT", attrs, nodes );

   return new ast.Await( args.id, args.loc, args.nodebug, args.func,
			 args.accessor_list.concat( axs ), args.immediate,
			 args.func_count,
			 args.accessor_list_count.concat( cntaxs ) );
}

/*---------------------------------------------------------------------*/
/*    SIGACCESS ...                                                    */
/*---------------------------------------------------------------------*/
function SIGACCESS( attrs={}, ...nodes ) {
   checkNoChildren( "SIGACCESS", attrs, nodes );

   return new ast.SignalAccessor( attrs.signame,
				  attrs.pre, attrs.val, attrs.cnt );
}
   
/*---------------------------------------------------------------------*/
/*    FORK ...                                                         */
/*---------------------------------------------------------------------*/
function FORK( attrs={}, ...nodes ) {
   const children = checkChildrenMin( "FORK", attrs, nodes, 1 );

   return new ast.Fork( attrs.id, attrs[ "%location" ],
			has_nodebug_kwd( attrs ),
			children );
}

/*---------------------------------------------------------------------*/
/*    ABORT ...                                                        */
/*---------------------------------------------------------------------*/
function ABORT( attrs={}, ...nodes ) {
   const children = checkChildrenMin( "ABORT", attrs, nodes, 1);
   let axs = nodes.filter( isValSignalAccessor );
   let cntaxs = nodes.filter( isCntSignalAccessor );
   const args = getArgumentsCountExpressionNode( "ABORT", attrs, !axs.length );

   var r = new ast.Abort( attrs.id, attrs[ "%location" ], args.nodebug, args.func,
			  args.accessor_list.concat( axs ), args.immediate,
			  args.func_count,
			  args.accessor_list_count.concat( cntaxs ),
			  makeImplicitSequence( attrs, children ) );
   return r;
}

/*---------------------------------------------------------------------*/
/*    WEAKABORT ...                                                    */
/*---------------------------------------------------------------------*/
function WEAKABORT( attrs={}, ...nodes ) {
   const children = checkChildrenMin( "WEAKABORT", attrs, nodes, 1 );
   let axs = nodes.filter( isValSignalAccessor );
   let cntaxs = nodes.filter( isCntSignalAccessor );
   const args = getArgumentsCountExpressionNode( "WEAKABORT", attrs, !axs.length );
   
   return new ast.WeakAbort( attrs.id, attrs[ "%location" ], args.nodebug,
   			     args.func, args.accessor_list.concat( axs ),
			     args.immediate,
   			     args.func_count,
			     args.accessor_list_count.concat( cntaxs ),
   			     makeImplicitSequence(attrs, children));
}

/*---------------------------------------------------------------------*/
/*    SUSPEND_ ...                                                     */
/*---------------------------------------------------------------------*/
function SUSPEND_( attrs={}, ...nodes ) {
   const loc = attrs[ "%location" ];
   let axs = nodes.filter( isValSignalAccessor );
   const args = getArgumentsExpressionNode( "SUSPEND", attrs, loc, !axs.length );
   const children = checkChildrenMin( "SUSPEND", attrs, nodes, 1 );
   
   return new ast.Suspend( args.id, args.loc, args.nodebug,
			   makeImplicitSequence(attrs, children),
			   args.func, args.accessor_list.concat( axs ),
			   args.immediate);
}

/*---------------------------------------------------------------------*/
/*    SUSPEND ...                                                      */
/*---------------------------------------------------------------------*/
function SUSPEND( attrs={}, ...nodes ) {
   let sig_list = get_signal_name_list( attrs, attrsLoc( attrs ) );
   let signal_name = sig_list[ 0 ];
   let loc = attrsLoc( attrs );

   delete attrs[signal_name];
   for( let key in attrs ) {
      attrs[ key.toLowerCase() ] = attrs[ key ];
   }

   let condFrom = attrs.from
       || attrs.fromapply
       || attrs.fromvalue;
   let condToggle = attrs.togglesignal
       || attrs.toggleapply
       || attrs.togglevalue;
   let condRegular = attrs.apply
       || attrs.value;
   
   if( sig_list.length == 0 && !condFrom && !condRegular && !condToggle ) {
      throw new SyntaxError( "SUSPEND: missing suspend condition.",
			     attrs[ "%location" ] );
   } else if( (condFrom && condToggle)
	      || (condFrom && condRegular)
	      || (condToggle && condRegular) ) {
      throw new SyntaxError( "SUSPEND: cannot use suspend-from/-toggle/apply/value"
			     + " together",
			     attrs[ "%location" ] );
   } else if( condFrom && signal_name ) {
      throw new SyntaxError( "SUSPEND: cannot use suspend-from with a signal.",
			     attrs[ "%location" ] );
   } else if( condToggle && signal_name ) {
      throw new SyntaxError( "SUSPEND: cannot use suspend-toggle with a signal.",
			     attrs[ "%location" ] );
   } else if( condRegular && signal_name ) {
      throw new SyntaxError( "SUSPEND: cannot use suspend with apply/value and a signal.",
			     attrs[ "%location" ] );
   } else if( sig_list.length > 1 ) {
      throw new SyntaxError( "SUSPEND: cannot have more than 1 signal.",
			     attrs[ "%location" ] );
   }

   if( ("from" in attrs || "fromapply" in attrs || "fromvalue" in attrs) &&
       ("to" in attrs || "toapply" in attrs || "tovalue" in attrs) ) {
      // Handle the suspend-from-to
      return <hh.local SUSPEND_CONTINUOUS nodebug>
	<hh.trap END_BODY nodebug>
	  <hh.fork nodebug>

	    <hh.sequence nodebug>
	      <suspend_ immediate SUSPEND_CONTINUOUS>
		${SEQUENCE.apply( nodes.unshift( {} ) ) }
	      </suspend_>
	      <hh.exit END_BODY nodebug/>
	    </hh.sequence>

	    <hh.every signal=${attrs.from}
		      immediate=${attrs.immediate}
	              apply=${attrs.fromapply}
		      applyAccessors=${attrs.fromAccessors}
		      value=${attrs.fromvalue}
                      nodebug>
	      <hh.abort signal=${attrs.to}
			apply=${attrs.toapply}
			applyAccessors=${attrs.toAccessors}
			value=${attrs.tovalue} nodebug>
		<hh.fork nodebug>
			<hh.sustain SUSPEND_CONTINUOUS nodebug/>
			${(attrs.emitWhenSuspended
			   ? <hh.sustain ${attrs.emitwhensuspended} nodebug/>
			   : undefined)}
		</hh.fork>
	      </hh.abort>
	    </hh.every>

          </hh.fork>
	</hh.trap>
      </hh.local>;
   } else if ("togglesignal" in attrs
	      || "togglevalue" in attrs
	      || "toggleapply" in attrs) {
      return <hh.local SUSPEND_CONTINUOUS nodebug>
	<hh.trap END_BODY nodebug>
	  <hh.fork nodebug>

	    <hh.sequence nodebug>
	      <suspend_ immediate SUSPEND_CONTINUOUS>
		${SEQUENCE.apply( nodes.unshift( {} ) ) }
	      </suspend_>
	      <hh.exit END_BODY  nodebug/>
	    </hh.sequence>

	    <hh.loop>
	      <hh.await immediate=${attrs.immediate}
			signal=${attrs.togglesignal}
			apply=${attrs.toggleapply}
			applyAccessors=${attrs.toggleAccessors}
			value=${attrs.togglevalue} nodebug/>
	      <hh.abort signal=${attrs.togglesignal}
			apply=${attrs.toggleapply}
			applyAccessors=${attrs.toggleAccessors}
			value=${attrs.togglevalue} nodebug>
		<hh.fork nodebug>
		  <hh.sustain SUSPEND_CONTINUOUS nodebug/>
			${(attrs.emitWhenSuspended
			   ? <hh.sustain ${attrs.emitwhensuspended} nodebug/>
			   : undefined)}
		</hh.fork>
	      </hh.abort>
	      <hh.pause/>
	    </hh.loop>
          </hh.fork>
	</hh.trap>
      </hh.local>;
   } else {
      return <suspend_ apply=${attrs.apply}
		       applyAccessors=${attrs.applyAccessors}
		       value=${attrs.value}
                       signal=${signal_name}
		       immediate=${attrs.immediate}>
	${ SEQUENCE.apply( nodes.unshift( {} ) ) }
      </suspend_>;
   }
}

/*---------------------------------------------------------------------*/
/*    LOOP ...                                                         */
/*---------------------------------------------------------------------*/
function LOOP( attrs={}, ...nodes ) {
   const children = checkChildrenMin( "LOOP", attrs, nodes, 1 );
   
   return new ast.Loop( attrs.id, attrsLoc( attrs ), has_nodebug_kwd( attrs ),
			makeImplicitSequence( attrs, children ) );
}

/*---------------------------------------------------------------------*/
/*    LOOPEACH ...                                                     */
/*---------------------------------------------------------------------*/
function LOOPEACH( attrs={}, ...nodes ) {
   let axs = nodes.filter( isValSignalAccessor );
   let cntaxs = nodes.filter( isCntSignalAccessor );
   const args = getArgumentsCountExpressionNode( "LOOPEACH", attrs, !axs.length );
   const children = checkChildrenMin( "LOOPEACH", attrs, nodes, 1 );

   return new ast.LoopEach( args.id, args.loc, args.nodebug,
			    makeImplicitSequence( attrs, children ),
			    args.func, args.accessor_list.concat( axs ),
			    args.func_count,
			    args.accessor_list_count.concat( cntaxs ) );
}

/*---------------------------------------------------------------------*/
/*    EVERY ...                                                        */
/*---------------------------------------------------------------------*/
function EVERY( attrs={}, ...nodes ) {
   let axs = nodes.filter( isValSignalAccessor );
   let cntaxs = nodes.filter( isCntSignalAccessor );
   const args = getArgumentsCountExpressionNode( "EVERY", attrs, !axs.length );
   const children = checkChildrenMin( "EVERY", attrs, nodes, 1 );

   return new ast.Every( args.id, args.loc, args.nodebug,
			 makeImplicitSequence(attrs, children),
			 args.func, args.accessor_list.concat( axs ),
			 args.immediate,
			 args.func_count,
			 args.accessor_list_count.concat( cntaxs ) );
}

/*---------------------------------------------------------------------*/
/*    SEQUENCE ...                                                     */
/*---------------------------------------------------------------------*/
function SEQUENCE( attrs={}, ...nodes ) {
   const children = checkChildrenMin( "SEQUENCE", attrs, nodes, 1);
   
   return new ast.Sequence(attrs.id, attrsLoc( attrs ),
			   has_nodebug_kwd( attrs ),
			   children );
}

/*---------------------------------------------------------------------*/
/*    ATOM ...                                                         */
/*---------------------------------------------------------------------*/
function ATOM( attrs={}, ...nodes ) {
   let axs = nodes.filter( isValSignalAccessor );
   const args = getArgumentsActionNode( "ATOM", attrs, !axs.length );
   checkNoChildren( "ATOM", attrs, nodes );

   return new ast.Atom( args.id, args.loc, args.nodebug, args.func,
			args.accessor_list.concat( axs ) );
}

/*---------------------------------------------------------------------*/
/*    TRAP ...                                                         */
/*---------------------------------------------------------------------*/
function TRAP( attrs={}, ...nodes ) {
   const children = checkChildrenMin( "TRAP", attrs, nodes, 1 );
   
   return new ast.Trap(attrs.id, attrsLoc( attrs ), has_nodebug_kwd( attrs ),
		       getTrapName( "TRAP", attrs ),
		       makeImplicitSequence( attrs, children ) );
}

/*---------------------------------------------------------------------*/
/*    EXIT ...                                                         */
/*---------------------------------------------------------------------*/
function EXIT( attrs={}, ...nodes ) {
   checkNoChildren( "EXIT", attrs, nodes );
   
   return new ast.Exit(attrs.id, attrsLoc( attrs ), has_nodebug_kwd( attrs ),
		       getTrapName( "EXIT", attrs ) );
}

/*---------------------------------------------------------------------*/
/*    RUN ...                                                          */
/*---------------------------------------------------------------------*/
function RUN( attrs={}, ...nodes ) {
   let loc = attrsLoc( attrs );

   if( !attrs.module || !(attrs.module instanceof ast.Module) )
      throw new SyntaxError( "RUN: module must be a Hiphop.js module",
			     attrs[ "%location" ] );

   let module = attrs.module.clone();
   let signal_declaration_list = module.signal_declaration_list;

   checkNoChildren( "RUN", attrs, nodes );
   
   for( let sig in signal_declaration_list ) {
      let sigdecl = signal_declaration_list[ sig ];
      let sigbound = attrs[ sigdecl.name ];

      if( sigbound ) {
	 if( typeof( sigbound ) != "string" && !(sigbound instanceof String) ) {
	    throw new SyntaxError( "RUN: string expected on signal " +
				   sigdecl.name + " bounding.",
				   attrs[ "%location" ] );
	 } else {
	    sigdecl.bound = sigbound;
	 }
      } else {
	 // Bind implicitly signals with the same name, or don't bind at all
	 // (if signal with same name didn't exists at compile time).
	 sigdecl.bound = -1;
      }
   }

   let body = new ast.Local( attrs.id, loc, false, signal_declaration_list,
			     makeImplicitSequence( attrs, module.children ) );
   body.in_run_context = true;
   return new ast.Run( attrs.id, loc, module.name, has_nodebug_kwd(attrs), body );
}

/*---------------------------------------------------------------------*/
/*    EXEC ...                                                         */
/*---------------------------------------------------------------------*/
function EXEC( attrs={}, ...nodes ) {
   let args = getEmitNodeArguments( "EXEC", attrs, true );
   let axs = nodes.filter( isValSignalAccessor );

   checkNoChildren( "EXEC", attrs, nodes );
   if( attrs.value )
      throw new SyntaxError( "EXEC: must takes an apply argument.",
			   attrs[ "%location" ] );

   if (attrs.res && !(attrs.res instanceof Function))
      throw new TypeError( "Function", typeof attrs.res, attrs[ "%location" ] );

   if (attrs.susp && !(attrs.susp instanceof Function))
      throw new TypeError( "Function", typeof attrs.susp, attrs[ "%location" ] );

   if (attrs.kill && !(attrs.kill instanceof Function))
      throw new TypeError( "Function", typeof attrs.kill, attrs[ "%location" ] );

   return new ast.Exec( args.id, args.loc, args.nodebug,
			args.signal_name_list[ 0 ], args.func,
			args.accessor_list.concat( axs ),
			attrs.res, attrs.susp, attrs.kill);
}


//
// Accessibility constants for signal declarations
//
const IN = 1;
const OUT = 2;
const INOUT = 3;

/*---------------------------------------------------------------------*/
/*    exports                                                          */
/*---------------------------------------------------------------------*/
exports.KEYWORDS = KEYWORDS;
exports.format_loc = attrsLoc;
exports.get_signal_name_list = get_signal_name_list;
exports.isHiphopInstruction = isHiphopInstruction;
exports.expandChildren = expandChildren;
exports.getAccessorList = getAccessorList;

exports.MODULE = MODULE;
exports.LOCAL = LOCAL;
exports.SIGNAL = SIGNAL;
exports.EMIT = EMIT;
exports.SUSTAIN = SUSTAIN;
exports.IF = IF;
exports.NOTHING = NOTHING;
exports.PAUSE = PAUSE;
exports.HALT = HALT;
exports.AWAIT = AWAIT;
exports.SIGACCESS = SIGACCESS;
exports.FORK = FORK;
exports.ABORT = ABORT;
exports.WEAKABORT = WEAKABORT;
exports.SUSPEND = SUSPEND;
exports.LOOP = LOOP;
exports.LOOPEACH = LOOPEACH;
exports.EVERY = EVERY;
exports.SEQUENCE = SEQUENCE;
exports.ATOM = ATOM;
exports.TRAP = TRAP;
exports.EXIT = EXIT;
exports.RUN = RUN;
exports.EXEC = EXEC;

exports.IN = IN;
exports.OUT = OUT;
exports.INOUT = INOUT;

