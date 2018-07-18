/*=====================================================================*/
/*    serrano/prgm/project/hiphop/0.2.x/preprocessor/astparser.js      */
/*    -------------------------------------------------------------    */
/*    Author      :  Manuel Serrano                                    */
/*    Creation    :  Tue Jul 17 17:53:13 2018                          */
/*    Last change :  Wed Jul 18 16:55:51 2018 (serrano)                */
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
/*    parseHHExpression ...                                            */
/*---------------------------------------------------------------------*/
function parseHHExpression() {
   this.addPlugin( "NOW", parseNow );
   this.addPlugin( "PRE", parsePre );
   this.addPlugin( "VAL", parseVal );
   this.addPlugin( "PREVAL", parsePreval );
   try {
      return this.parseExpression();
   } finally {
      this.removePlugin( "PREVAL" );
      this.removePlugin( "VAL" );
      this.removePlugin( "PRE" );
      this.removePlugin( "NOW" );
   }
}

/*---------------------------------------------------------------------*/
/*    parseNow ...                                                     */
/*---------------------------------------------------------------------*/
function parseNow() {
   console.log( "parseNow" );
}

/*---------------------------------------------------------------------*/
/*    parsePre ...                                                     */
/*---------------------------------------------------------------------*/
function parsePre() {
   console.log( "parsePre" );
}

/*---------------------------------------------------------------------*/
/*    parseVal ...                                                     */
/*---------------------------------------------------------------------*/
function parseVal() {
   console.log( "parseVal" );
}

/*---------------------------------------------------------------------*/
/*    parsePreval ...                                                  */
/*---------------------------------------------------------------------*/
function parsePreval() {
   console.log( "parsePreval" );
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
	       case "AWAIT":
		  nodes.push( parseAwait.call( this, this.consumeAny() ) );
		  break
	       case "VAL":
		  nodes.push( parseVal.call( this, this.consumeAny() ) );
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

   #:tprint( "MOD=", #:typeof( this ) );

   console.log( "this.peek=", this.peekToken );
   
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
   const loc = token[ "%location" ];
   const appl = astutils.J2SDataPropertyInit(
      loc, 
      astutils.J2SString( loc, "apply" ),
      astutils.J2SFun( loc, [], this.parseBlock( this ) ) );
   const attrs = astutils.J2SObjInit( loc, [ locInit( loc ), appl ] );
   
   return astutils.J2SCall( loc, hhref( loc, "ATOM" ), null, [ attrs ] );
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
/*    parseEmit ...                                                    */
/*---------------------------------------------------------------------*/
function parseEmit( token ) {
   
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
	 const expr = this.parseExpression();
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

      
      return astutils.J2SCall( loc, hhref( loc, "EMIT" ), null,
			       [ astutils.J2SObjInit( locid, inits ) ] );
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
/*    parseDelay ...                                                   */
/*---------------------------------------------------------------------*/
function parseDelay() {
   if( isIdToken( this, this.peekToken(), "COUNT" ) ) {
      this.consumeAny();
      this.consumeToken( this.LPAREN );
      const count = this.parseExpression();
      this.consumeToken( this.COMMA );
      const expr = this.parseExpression();
      this.consumeToken( this.RPAREN );
   } else if( isIdToken( this, this.peekToken(), "IMMEDIATE" ) ) {
      this.consumeAny();
      const expr = this.parseExpression();
   } else {
      const expr = this.parseExpression();
   }
}
      
/*---------------------------------------------------------------------*/
/*    parseAwait ...                                                   */
/*---------------------------------------------------------------------*/
function parseAwait( token ) {
   const loc = token[ "%location" ];
   const id = this.consumeToken( this.ID );
   const locid = id[ "%location" ];
   const init =  astutils.J2SDataPropertyInit(
      locid,
      astutils.J2SString( locid, id.value ),
      astutils.J2SString( locid, id.value ) );
   const sig = astutils.J2SObjInit( locid, [ init ] );
   
   return astutils.J2SCall( loc, hhref( loc, "AWAIT" ), null, [ sig ] );
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
parser.addPlugin( "AWAIT", parseAwait );

exports.parse = parser.parse.bind( parser );
