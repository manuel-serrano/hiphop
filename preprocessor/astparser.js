/*=====================================================================*/
/*    serrano/prgm/project/hiphop/0.2.x/preprocessor/astparser.js      */
/*    -------------------------------------------------------------    */
/*    Author      :  Manuel Serrano                                    */
/*    Creation    :  Tue Jul 17 17:53:13 2018                          */
/*    Last change :  Thu Jul 19 13:30:43 2018 (serrano)                */
/*    Copyright   :  2018 Manuel Serrano                               */
/*    -------------------------------------------------------------    */
/*    HipHop parser based on the genuine Hop parser                    */
/*=====================================================================*/
"use hopscript"

const hopc = require( hop.hopc );
const ast = require( hopc.ast );
const astutils = require( "./astutils.js" );
const parser = new hopc.Parser();

/*---------------------------------------------------------------------*/
/*    location ...                                                     */
/*---------------------------------------------------------------------*/
function location( loc ) {
   return astutils.J2SObjInit(
      undefined,
      [ astutils.J2SDataPropertyInit(
	 undefined,
	 astutils.J2SString( undefined, "filename" ),
	 astutils.J2SString( undefined, loc.cdr.car ) ),
	astutils.J2SDataPropertyInit(
	   undefined,
	   astutils.J2SString( undefined, "pos" ),
	   astutils.J2SNumber( undefined, loc.cdr.cdr.car ) ) ] );
}

/*---------------------------------------------------------------------*/
/*    locInit ...                                                      */
/*---------------------------------------------------------------------*/
function locInit( loc ) {
   return astutils.J2SDataPropertyInit(
      loc,
      astutils.J2SString( loc, "%location" ),
      location( loc ) );
}

/*---------------------------------------------------------------------*/
/*    tokenValueError ...                                              */
/*---------------------------------------------------------------------*/
function tokenValueError( token ) {
   const loc = token[ "%location" ];
   return new SyntaxError( "unexpected token `" + token.value + "'",
			   { filename: loc.cdr.car, pos: loc.cdr.cdr.car } );
}

/*---------------------------------------------------------------------*/
/*    tokenTypeError ...                                               */
/*---------------------------------------------------------------------*/
function tokenTypeError( token ) {
   const loc = token[ "%location" ];

   return new SyntaxError( "unexpected token `" + token.type + "'",
			   { filename: loc.cdr.car, pos: loc.cdr.cdr.car } );
}

/*---------------------------------------------------------------------*/
/*    isIdToken ...                                                    */
/*---------------------------------------------------------------------*/
function isIdToken( parser, token, id ) {
   return token.type === parser.ID && token.value == id;
}

/*---------------------------------------------------------------------*/
/*    hhref ...                                                        */
/*---------------------------------------------------------------------*/
function hhref( loc, name ) {
   return astutils.J2SAccess(
      loc,
      astutils.J2SRef( loc, "hh" ),
      astutils.J2SString( loc, name ) );
}

/*---------------------------------------------------------------------*/
/*    parseHHAccessors ...                                             */
/*---------------------------------------------------------------------*/
function parseHHAccessors( parser ) {
   
   let accessors = [];

   const hhparser = function( token ) {
      const loc = token[ "%location" ];
      let pre = false, val = false, access = "present";
      
      this.consumeToken( this.LPAREN );
      const tid = this.consumeToken( this.ID );
      const ltid = tid[ "%location" ];
      
      this.consumeToken( this.RPAREN );

      switch( token.value ) {
	 case "NOW": break;
	 case "PRE": pre = true; access = "pre"; break;
	 case "VAL": val = true; access = "value"; break;
	 case "PREVAL": pre = true, val = true; access = "preValue"; break;
      }

      const signame = astutils.J2SDataPropertyInit(
	 ltid,
	 astutils.J2SString( ltid, "signame" ),
	 astutils.J2SString( ltid,  tid.value ) );
      const sigpre = astutils.J2SDataPropertyInit(
	 ltid,
	 astutils.J2SString( ltid, "pre" ),
	 astutils.J2SBool( ltid, pre ) );
      const sigval = astutils.J2SDataPropertyInit(
	 ltid,
	 astutils.J2SString( ltid, "val" ),
	 astutils.J2SBool( ltid, val ) );
      const attrs = astutils.J2SObjInit( loc, [ signame, sigpre, sigval ] );
      const sigaccess = astutils.J2SCall(
	 loc, hhref( loc, "SIGACCESS" ), null, [ attrs ] );

      // push the accessor dependencies list
      accessors.push( sigaccess );

      // return the actual expression
      return astutils.J2SAccess(
	 ltid,
	 astutils.J2SAccess( ltid,
			     astutils.J2SHopRef( loc, "this" ),
			     astutils.J2SString( loc, access ) ),
	 astutils.J2SString( ltid, tid.value ) );
   }
   
   this.addPlugin( "NOW", hhparser );
   this.addPlugin( "PRE", hhparser );
   this.addPlugin( "VAL", hhparser );
   this.addPlugin( "PREVAL", hhparser );
   try {
      return parser( accessors );
   } finally {
      this.removePlugin( "PREVAL" );
      this.removePlugin( "VAL" );
      this.removePlugin( "PRE" );
      this.removePlugin( "NOW" );
   }
}

/*---------------------------------------------------------------------*/
/*    parseHHExpression ...                                            */
/*---------------------------------------------------------------------*/
function parseHHExpression() {
   return parseHHAccessors.call( this, accessors => {
      const expr = this.parseExpression();
      return { expr: expr, accessors: accessors };
   } );
}

/*---------------------------------------------------------------------*/
/*    parseAtomBlock ...                                               */
/*---------------------------------------------------------------------*/
function parseAtomBlock() {
   return parseHHAccessors.call( this, accessors => {
      const block = this.parseBlock();
      return { block: block, accessors: accessors };
   } );
}

/*---------------------------------------------------------------------*/
/*    parseDelay ...                                                   */
/*---------------------------------------------------------------------*/
function parseDelay() {
   if( isIdToken( this, this.peekToken(), "COUNT" ) ) {
      this.consumeAny();
      this.consumeToken( this.LPAREN );
      const { expr: count, accessors } = parseHHExpression.call( this );
      this.consumeToken( this.COMMA );
      const { expr, accessors } = parseHHExpression.call( this );
      this.consumeToken( this.RPAREN );
      return { expr: expr, count: count, immediate: false, accessors: accessors };
   } else if( isIdToken( this, this.peekToken(), "IMMEDIATE" ) ) {
      this.consumeAny();
      const { expr, accessors } = parseHHExpression.call( this );
      return { expr: expr, count: false, immediate: true, accessors: accessors };
   } else {
      const { expr, accessors } = parseHHExpression.call( this );

      return { expr: expr, count: false, immediate: false, accessors: accessors };
   }
}
      
/*---------------------------------------------------------------------*/
/*    parseHHBlock ...                                                 */
/*---------------------------------------------------------------------*/
function parseHHBlock() {
   let nodes = [];
   
   this.consumeToken( this.LBRACE );

   while( true ) {
      switch( this.peekToken().type ) {
	 case this.SEMICOLON:
	    this.consumeAny();
	    break;
	    
	 case this.RBRACE:
	    this.consumeAny();
	    return nodes;

	 case this.DOLLAR:
	    this.consumeAny();
	    nodes.push( this.parseExpression() );
	    this.consumeToken( this.RBRACE );
	    break;

	 case this.ID:
	    switch( this.peekToken().value ) {
	       case "ATOM":
		  nodes.push( parseAtom.call( this, this.consumeAny() ) );
		  break
	       case "NOTHING":
		  nodes.push( parseNothing.call( this, this.consumeAny() ) );
		  break
	       case "PAUSE":
		  nodes.push( parsePause.call( this, this.consumeAny() ) );
		  break
	       case "HALT":
		  nodes.push( parseHalt.call( this, this.consumeAny() ) );
		  break
	       case "SEQUENCE":
		  nodes.push( parseSequence.call( this, this.consumeAny() ) );
		  break
	       case "FORK":
		  nodes.push( parseFork.call( this, this.consumeAny() ) );
		  break
	       case "EMIT":
		  nodes.push( parseEmit.call( this, this.consumeAny() ) );
		  break
	       case "SUSTAIN":
		  nodes.push( parseSustain.call( this, this.consumeAny() ) );
		  break
	       case "AWAIT":
		  nodes.push( parseAwait.call( this, this.consumeAny() ) );
		  break
	       case "IF":
		  nodes.push( parseIf.call( this, this.consumeAny() ) );
		  break
	       case "ABORT":
		  nodes.push( parseAbort.call( this, this.consumeAny() ) );
		  break
	       case "WEAKABORT":
		  nodes.push( parseWeakabort.call( this, this.consumeAny() ) );
		  break
	       default:
		  throw tokenValueError( this.consumeAny() );
	    }
	    break;

	 default:
	    throw tokenTypeError( this.consumeAny() );
      }
   }
}

/*---------------------------------------------------------------------*/
/*    parseModuleArgs ...                                              */
/*---------------------------------------------------------------------*/
function parseModuleArgs() {

   function signal( loc, name, direction ) {
      const dir = astutils.J2SDataPropertyInit(
	 loc,
	 astutils.J2SString( loc, "direction" ),
	 astutils.J2SString( loc, direction ) );
      const id = astutils.J2SDataPropertyInit(
	 loc,
	 astutils.J2SString( loc, "name" ),
	 astutils.J2SString( loc, name ) );
      const attrs = astutils.J2SObjInit( loc, [ dir, id ] );
      
      return astutils.J2SCall( loc, hhref( loc, "SIGNAL" ), null, [ attrs ] );
   }

   let lbrace = this.consumeToken( this.LPAREN );
   let args = [];

   while( true ) {
      if( this.peekToken().type === this.RPAREN ) {
	 this.consumeAny();
	 return args;
      } else {
	 const t = this.consumeToken( this.ID );
	 const loc = t[ "%location" ];
	 
	 switch( t.value ) {
	    case "IN": {
	       let t = this.consumeToken( this.ID );
	       args.push( signal( loc, t.value, "IN" ) );
	       break;
	    }
	    case "OUT": {
	       let t = this.consumeToken( this.ID );
	       args.push( signal( loc, t.value, "OUT" ) );
	       break;
	    }
	    case "INOUT": {
	       let t = this.consumeToken( this.ID );
	       args.push( signal( loc, t.value, "INOUT" ) );
	       break;
	    }
	    default: {
	       args.push( signal( loc, t.value, "INOUT" ) );
	    }

	 }

	 if( this.peekToken().type === this.RPAREN ) {
	    this.consumeAny();
	    return args;
	 } else {
	    this.consumeToken( this.COMMA );
	 }
      }
   }
}

/*---------------------------------------------------------------------*/
/*    parseModule ...                                                  */
/*---------------------------------------------------------------------*/
function parseModule( token ) {
   const loc = token[ "%location" ];
   let id;
   let attrs;

   if( this.peekToken().type === this.ID ) {
      let id = this.consumeAny();
      const locid = id[ "%location" ];

      attrs = astutils.J2SObjInit(
	 locid,
	 [ astutils.J2SDataPropertyInit(
	    locid,
	    astutils.J2SString( locid, "id" ),
	    astutils.J2SString( locid, id.value ) ),
	   locInit( loc ) ] );
   } else {
      attrs = astutils.J2SObjInit( loc, [ locInit( loc ) ] );
   }

   const args = parseModuleArgs.call( this );
   const body = parseHHBlock.call( this );

   return astutils.J2SCall( loc, hhref( loc, "MODULE" ), 
			    null,
			    [ attrs ].concat( args, body ) );
}

/*---------------------------------------------------------------------*/
/*    parseAtom ...                                                    */
/*---------------------------------------------------------------------*/
function parseAtom( token ) {
   #:tprint( "parseAtom" );
   const loc = token[ "%location" ];
   const { block, accessors } = parseAtomBlock.call( this );
   const appl = astutils.J2SDataPropertyInit(
      loc, 
      astutils.J2SString( loc, "apply" ),
      astutils.J2SFun( loc, [], block ) );
   const attrs = astutils.J2SObjInit( loc, [ locInit( loc ), appl ] );
   
   return astutils.J2SCall( loc, hhref( loc, "ATOM" ), null,
			    [ attrs ].concat( accessors ) );
}

/*---------------------------------------------------------------------*/
/*    parseEmpty ...                                                   */
/*---------------------------------------------------------------------*/
function parseEmpty( token, fun ) {
   const loc = token[ "%location" ];
   const attrs = astutils.J2SObjInit( loc, [ locInit( loc ) ] );
   
   return astutils.J2SCall( loc, hhref( loc, fun ), null, [ attrs ] );
}

/*---------------------------------------------------------------------*/
/*    parseNothing ...                                                 */
/*---------------------------------------------------------------------*/
function parseNothing( token ) {
   return parseEmpty( token, "NOTHING" );
}

/*---------------------------------------------------------------------*/
/*    parsePause ...                                                   */
/*---------------------------------------------------------------------*/
function parsePause( token ) {
   return parseEmpty( token, "PAUSE" );
}

/*---------------------------------------------------------------------*/
/*    parseHalt ...                                                    */
/*---------------------------------------------------------------------*/
function parseHalt( token ) {
   return parseEmpty( token, "HALT" );
}

/*---------------------------------------------------------------------*/
/*    parseSequence ...                                                */
/*---------------------------------------------------------------------*/
function parseSequence( token ) {
   const loc = token[ "%location" ];
   const attrs = astutils.J2SObjInit( loc, [ locInit( loc ) ] );
   const body = parseHHBlock.call( this );

   return astutils.J2SCall( loc, hhref( loc, "SEQUENCE" ), 
			    null,
			    [ attrs ].concat( body ) );
}

/*---------------------------------------------------------------------*/
/*    parseFork ...                                                    */
/*---------------------------------------------------------------------*/
function parseFork( token ) {
   const loc = token[ "%location" ];
   let id;
   let attrs;
   let body = [];

   if( this.peekToken().type === this.ID ) {
      let id = this.consumeAny();
      const locid = id[ "%location" ];

      attrs = astutils.J2SObjInit(
	 locid,
	 [ astutils.J2SDataPropertyInit(
	    locid,
	    astutils.J2SString( locid, "id" ),
	    astutils.J2SString( locid, id.value ) ),
	   locInit( loc ) ] );
   } else {
      attrs = astutils.J2SObjInit( loc, [ locInit( loc ) ] );
   }

   body.push( astutils.J2SCall( loc, hhref( loc, "SEQUENCE" ),
				null,
				[ astutils.J2SObjInit( loc, [] ) ]
				.concat( parseHHBlock.call( this ) ) ) );

   while( isIdToken( this, this.peekToken(), "PAR" ) ){
      body.push( parseSequence.call( this, this.consumeAny() ) );
   }

   return astutils.J2SCall( loc, hhref( loc, "FORK" ), 
			    null,
			    [ attrs ].concat( body ) );
}

/*---------------------------------------------------------------------*/
/*    parseEmitSustain ...                                             */
/*---------------------------------------------------------------------*/
function parseEmitSustain( token, command ) {
   
   function parseSignalEmit( loc, locinit ) {
      const id = this.consumeToken( this.ID );
      const locid = id[ "%location" ];
      let inits = [ locinit, astutils.J2SDataPropertyInit(
	 locid,
	 astutils.J2SString( locid, id.value ),
	 astutils.J2SString( locid, id.value ) ) ];

      if( this.peekToken().type === this.LPAREN ) {
	 const lparen = this.consumeAny();
	 const ll = lparen[ "%location" ];
	 const { expr, accessors } = this.parseHHExpression();
	 const rparen = this.consumeToken( this.RPAREN );
	 const lr = rparen[ "%location" ];
	 const fun = astutils.J2SFun(
	    ll, [],
	    astutils.J2SBlock(
	       ll, lr,
	       [ astutils.J2SStmtExpr( ll, astutils.J2SReturn( ll, expr ) ) ] ) );

	 const val = astutils.J2SDataPropertyInit(
	    locid,
	    astutils.J2SString( locid, "ifapply" ),
	    fun );

	 inits.push( val );
      }

      
      return astutils.J2SCall(
	 loc, hhref( loc, command ), null,
	 [ astutils.J2SObjInit( locid, inits ) ].concat( accessors ) );
   }

   const loc = token[ "%location" ];
   let locinit = locInit( loc );
   let nodes = [ astutils.J2SUndefined( loc ),
		 parseSignalEmit.call( this, loc, locinit ) ];

   while( this.peekToken().type === this.COMMA ) {
      this.consumeAny();
      nodes.push( parseSignalEmit.call( this, loc, locinit ) );
   }

   if( nodes.length == 1 ) {
      return nodes[ 0 ];
   } else {
      return astutils.J2SCall( loc, hhref( loc, "SEQUENCE" ), null, nodes );
   }
}

/*---------------------------------------------------------------------*/
/*    parseEmit ...                                                    */
/*---------------------------------------------------------------------*/
function parseEmit( token ) {
   return parseEmitSustain( token, "EMIT" );
}

/*---------------------------------------------------------------------*/
/*    parseSustain ...                                                 */
/*---------------------------------------------------------------------*/
function parseSustain( token ) {
   return parseEmitSustain( token, "SUSTAIN" );
}

/*---------------------------------------------------------------------*/
/*    parseAwait ...                                                   */
/*---------------------------------------------------------------------*/
function parseAwait( token ) {
   const loc = token[ "%location" ];
   const { expr, count, immediate, accessors } = parseDelay.call( this );

   const fun = astutils.J2SFun(
      loc, [],
      astutils.J2SBlock( loc, loc, [ astutils.J2SReturn( loc, expr ) ] ) );
   const cntfun = count
	 ? astutils.J2SFun(
	    loc, [],
	    astutils.J2SBlock(
	       loc, loc,
	       [ astutils.J2SStmtExpr( loc, astutils.J2SReturn( loc, count ) ) ] ) )
	 : false;
   const appl = astutils.J2SDataPropertyInit(
      loc,
      astutils.J2SString( loc, "apply" ),
      fun );
   const imm = astutils.J2SDataPropertyInit(
      loc,
      astutils.J2SString( loc, "immediate" ),
      astutils.J2SBool( loc, immediate ) );
   const cntappl = cntfun
	 ? astutils.J2SDataPropertyInit(
	    loc,
	    astutils.J2SString( loc, "countapply" ),
	    cntfun )
	 : false;
   const attrs = cntappl
	 ? astutils.J2SObjInit( loc, [ appl, cntappl, imm ] )
	 : astutils.J2SObjInit( loc, [ appl, imm ] );
   
   return astutils.J2SCall( loc, hhref( loc, "AWAIT" ),
			    null,
			    [ attrs ].concat( accessors ) );
}

/*---------------------------------------------------------------------*/
/*    parseIf ...                                                      */
/*---------------------------------------------------------------------*/
function parseIf( token ) {
   const loc = token[ "%location" ];

   this.consumeToken( this.LPAREN );
   const { expr: expr, accessors } = parseHHExpression.call( this );
   this.consumeToken( this.RPAREN );

   const fun = astutils.J2SFun(
      loc, [],
      astutils.J2SBlock( loc, loc, [ astutils.J2SReturn( loc, expr ) ] ) );
   const appl = astutils.J2SDataPropertyInit(
      loc,
      astutils.J2SString( loc, "apply" ),
      fun );
   const attrs = astutils.J2SObjInit( loc, [ appl ] );

   const then = astutils.J2SBlock( loc, loc, parseHHBlock.call( this ) );

   const args = [ attrs ].concat( accessors );
   args.push( then );
   
   if( this.peekToken().type == this.ELSE ) {
      const loce = this.consumeAny()[ "%location" ];
      args.push( astutils.J2SBlock( loce, loce, parseHHBlock.call( this ) ) );
   }

   return astutils.J2SCall( loc, hhref( loc, "IF" ), null, args );
}

/*---------------------------------------------------------------------*/
/*    parseAbortWeakabort ...                                          */
/*---------------------------------------------------------------------*/
function parseAbortWeakabort( loc, command ) {
   const loc = token[ "%location" ];
   
   const block = astutils.J2SBlock( loc, loc, parseHHBlock.call( this ) );
   
   return astutils.J2SCall( loc, hhref( loc, command ), null, [ block] );
}
   
/*---------------------------------------------------------------------*/
/*    parseAbort ...                                                   */
/*---------------------------------------------------------------------*/
function parseAbort( token ) {
   return parseAbortWeakabort( token[ "%location" ], "ABORT" );
}
   
/*---------------------------------------------------------------------*/
/*    parseWeakabort ...                                               */
/*---------------------------------------------------------------------*/
function parseWeakAbort( token ) {
   return parseAbortWeakabort( token[ "%location" ], "WEAKABORT" );
}
   
/*---------------------------------------------------------------------*/
/*    exports                                                          */
/*---------------------------------------------------------------------*/
parser.addPlugin( "MODULE", parseModule );
parser.addPlugin( "ATOM", parseAtom );
parser.addPlugin( "NOTHING", parseNothing );
parser.addPlugin( "PAUSE", parsePause );
parser.addPlugin( "HALT", parseHalt );
parser.addPlugin( "SEQUENCE", parseSequence );
parser.addPlugin( "FORK", parseFork );
parser.addPlugin( "EMIT", parseEmit );
parser.addPlugin( "SUSTAIN", parseSustain );
parser.addPlugin( "AWAIT", parseAwait );
parser.addPlugin( "IF", parseIf );
parser.addPlugin( "ABORT", parseAbort );
parser.addPlugin( "WEAKABORT", parseAbort );

exports.parse = parser.parse.bind( parser );
