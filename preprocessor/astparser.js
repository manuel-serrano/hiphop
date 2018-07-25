/*=====================================================================*/
/*    serrano/prgm/project/hiphop/0.2.x/preprocessor/astparser.js      */
/*    -------------------------------------------------------------    */
/*    Author      :  Manuel Serrano                                    */
/*    Creation    :  Tue Jul 17 17:53:13 2018                          */
/*    Last change :  Mon Jul 23 11:33:13 2018 (serrano)                */
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
      loc,
      [ astutils.J2SDataPropertyInit(
	 loc,
	 astutils.J2SString( loc, "filename" ),
	 astutils.J2SString( loc, loc.cdr.car ) ),
	astutils.J2SDataPropertyInit(
	   loc,
	   astutils.J2SString( loc, "pos" ),
	   astutils.J2SNumber( loc, loc.cdr.cdr.car ) ) ] );
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
   return new SyntaxError( "unexpected token `" + token.value + "'",
			   { filename: token.filename, pos: token.pos } );
}

/*---------------------------------------------------------------------*/
/*    tokenTypeError ...                                               */
/*---------------------------------------------------------------------*/
function tokenTypeError( token ) {
   return new SyntaxError( "unexpected token `" + token.type + "'",
			   { filename: token.filename, pos: token.pos } );
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
/*    -------------------------------------------------------------    */
/*    hhexpr ::= jsexpr                                                */
/*       | now( ident )                                                */
/*       | pre( ident )                                                */
/*       | val( ident )                                                */
/*       | preval( ident )                                             */
/*---------------------------------------------------------------------*/
function parseHHAccessors( parser, iscnt = false ) {
   
   let accessors = [];

   const hhparser = function( token ) {
      const loc = token.location
      let pre = false, val = false, access = "present";
      
      this.consumeToken( this.LPAREN );
      
      const tid = this.consumeToken( this.ID );
      const locid = tid.location;
      
      this.consumeToken( this.RPAREN );

      switch( token.value ) {
	 case "now": break;
	 case "pre": pre = true; access = "prePresent"; break;
	 case "val": val = true; access = "value"; break;
	 case "preval": pre = true, val = true; access = "preValue"; break;
      }

      const signame = astutils.J2SDataPropertyInit(
	 locid,
	 astutils.J2SString( locid, "signame" ),
	 astutils.J2SString( locid,  tid.value ) );
      const sigpre = astutils.J2SDataPropertyInit(
	 locid,
	 astutils.J2SString( locid, "pre" ),
	 astutils.J2SBool( locid, pre ) );
      const sigval = astutils.J2SDataPropertyInit(
	 locid,
	 astutils.J2SString( locid, "val" ),
	 astutils.J2SBool( locid, val ) );
      const sigcnt = astutils.J2SDataPropertyInit(
	 locid,
	 astutils.J2SString( locid, "cnt" ),
	 astutils.J2SBool( locid, iscnt ) );

      const attrs =
	    astutils.J2SObjInit( loc, [ signame, sigpre, sigval, sigcnt ] );
      const sigaccess = astutils.J2SCall(
	 loc, hhref( loc, "SIGACCESS" ), null, [ attrs ] );

      // push the accessor dependencies list
      accessors.push( sigaccess );

      // return the actual expression
      return astutils.J2SAccess(
	 locid,
	 astutils.J2SAccess( locid,
			     astutils.J2SHopRef( loc, "this" ),
			     astutils.J2SString( loc, access ) ),
	 astutils.J2SString( locid, tid.value ) );
   }
   
   this.addPlugin( "now", hhparser );
   this.addPlugin( "pre", hhparser );
   this.addPlugin( "val", hhparser );
   this.addPlugin( "preval", hhparser );
   try {
      return parser.call( this, accessors );
   } finally {
      this.removePlugin( "preval" );
      this.removePlugin( "val" );
      this.removePlugin( "pre" );
      this.removePlugin( "now" );
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
/*    parseHHCondExpression ...                                        */
/*---------------------------------------------------------------------*/
function parseHHCondExpression( iscnt ) {
   return parseHHAccessors.apply( this, [ accessors => {
      const expr = this.parseCondExpression();
      return { expr: expr, accessors: accessors };
   }, iscnt ] );
}

/*---------------------------------------------------------------------*/
/*    parseDelay ...                                                   */
/*    -------------------------------------------------------------    */
/*    delay ::= hhexpr                                                 */
/*       | count( hhexpr, hhexpr )                                     */
/*       | immediate( hhexpr )                                         */
/*---------------------------------------------------------------------*/
function parseDelay( loc, action = "apply", id = false ) {
   if( isIdToken( this, this.peekToken(), "count" ) ) {
      // COUNT( hhexpr, hhexpr )
      const loccnt = this.consumeAny();
      this.consumeToken( this.LPAREN );
      const { expr: count, accessors: cntaccessors } =
	    parseHHCondExpression.call( this, true );
      this.consumeToken( this.COMMA );
      const { expr, accessors } =
	    parseHHCondExpression.call( this, false );

      this.consumeToken( this.RPAREN );

      const fun = astutils.J2SFun(
	 loc, "delayfun", [], 
	 astutils.J2SBlock( loc, loc, [ astutils.J2SReturn( loc, expr ) ] ) );
      const cntfun = astutils.J2SFun(
	 loc, "cntfun", [], 
	 astutils.J2SBlock( loc, loc, [ astutils.J2SReturn( loc, count ) ] ) );
      
      const inits = [
	 astutils.J2SDataPropertyInit(
	    loc, astutils.J2SString( loc, "immediate" ),
	    astutils.J2SBool( loc, false ) ), 
	 astutils.J2SDataPropertyInit(
	    loc, astutils.J2SString( loc, action ),
	    fun ),
	 astutils.J2SDataPropertyInit(
	    loc, astutils.J2SString( loc, "count" + action ),
	    cntfun ) ];
      
      return { inits: inits, accessors: cntaccessors.concat( accessors ) };
   } else {
      let immediate = false;
      
      if( isIdToken( this, this.peekToken(), "immediate" ) ) {
	 // IMMEDIATE( hhexpr )
	 this.consumeAny();
	 immediate = true;
      }

      // hhexpr
      const { expr, accessors } = parseHHExpression.call( this );
      let inits;

      if( typeof expr == "J2SUnresolvedRef" ) {
	 inits = [
	    astutils.J2SDataPropertyInit(
	       loc, astutils.J2SString( loc, "immediate" ),
	       astutils.J2SBool( loc, immediate ) ), 
	    astutils.J2SDataPropertyInit(
	       loc, astutils.J2SString( loc, expr.id ),
	       astutils.J2SString( loc, expr.id ) ) ];
      } else {
	 const fun = astutils.J2SFun(
	    loc, "hhexprfun", [], 
	    astutils.J2SBlock( loc, loc, [ astutils.J2SReturn( loc, expr ) ] ) );
	 
	 inits = [
	    astutils.J2SDataPropertyInit(
	       loc, astutils.J2SString( loc, "immediate" ),
	       astutils.J2SBool( loc, immediate ) ), 
	    astutils.J2SDataPropertyInit(
	       loc, astutils.J2SString( loc, action ),
	       fun ) ];
      }
      return { inits: inits, accessors: accessors };
   }
}

let margin = 0;
   function mkMargin() {
      return #:make-string( margin, #:string-ref( " ", 0 ) );
   }
/*---------------------------------------------------------------------*/
/*    parseHHBlock ...                                                 */
/*    -------------------------------------------------------------    */
/*    block ::= { stmt; ... }                                          */
/*---------------------------------------------------------------------*/
function parseHHBlock( consume = true ) {
   let nodes = [];

   if( consume ) this.consumeToken( this.LBRACE );

   while( true ) {
      switch( this.peekToken().type ) {
	 case this.SEMICOLON:
	    this.consumeAny();
	    break;
	    
	 case this.RBRACE: {
	    const nothing = this.consumeAny();
	    if( nodes.length == 0 ) {
	       return [ parseEmpty( nothing, "NOTHING" ) ];
	    } else {
	       return nodes;
	    }
	 }

	 case this.let:
	    nodes.push( parseLet.call( this, this.consumeAny() ) );
	    return nodes;
	    
	 default:
	    nodes.push( parseHiphop.call( this, this.peekToken(), false ) );
	    break;
      }
   }
}
   

/*---------------------------------------------------------------------*/
/*    parseModule ...                                                  */
/*    -------------------------------------------------------------    */
/*    stmt ::= ...                                                     */
/*       | module [ident] ( signal, ... ) block                        */
/*    signal ::= [direction] ident [combine]                           */
/*    direction ::= in | out | inout                                   */
/*    combine ::= combine expr                                         */
/*---------------------------------------------------------------------*/
function parseModule( token, declaration ) {
   
   function parseSignal( token ) {
      const loc = token.location;
      let name, direction;

      if( token.type === this.in ) {
	 let t = this.consumeToken( this.ID );
	 direction = "IN"
	 name = t.value;
      } else if( token.type === this.ID ) {
	 switch( token.value ) {
	    case "out": {
	       let t = this.consumeToken( this.ID );
	       direction = "OUT"
	       name = t.value;
	       break;
	    }
	    case "inout": {
	       let t = this.consumeToken( this.ID );
	       direction = "INOUT"
	       name = t.value;
	       break;
	    }
	    default: {
	       direction = "INOUT"
	       name = token.value;
	    }

	 }
      } else {
	 tokenTypeError( token )
      }
      
      const dir = astutils.J2SDataPropertyInit(
	 loc,
	 astutils.J2SString( loc, "direction" ),
	 astutils.J2SString( loc, direction ) );
      const id = astutils.J2SDataPropertyInit(
	 loc,
	 astutils.J2SString( loc, "name" ),
	 astutils.J2SString( loc, name ) );

      const inits = [ dir, id ];
      
      if( isIdToken( this, this.peekToken(), "combine" ) ) {
	 const locc = this.consumeAny().location;
	 const fun = this.parseExpression();

	 const combine = astutils.J2SDataPropertyInit(
	    loc,
	    astutils.J2SString( loc, "combine_func" ),
	    fun );
	 inits.push( combine );
      }

      const attrs = astutils.J2SObjInit( loc, inits );
      return astutils.J2SCall( loc, hhref( loc, "SIGNAL" ), null, [ attrs ] );
   }

   function parseSiglist() {

      let lbrace = this.consumeToken( this.LPAREN );
      let args = [];

      while( true ) {
	 if( this.peekToken().type === this.RPAREN ) {
	    this.consumeAny();
	    return args;
	 } else {
	    args.push( parseSignal.call( this, this.consumeAny() ) );
	    
	    if( this.peekToken().type === this.RPAREN ) {
	       this.consumeAny();
	       return args;
	    } else {
	       this.consumeToken( this.COMMA );
	    }
	 }
      }
   }
   
   const loc = token.location;
   let id;
   let attrs;

   if( this.peekToken().type === this.ID ) {
      id = this.consumeAny();
      const locid = id.location;

      attrs = astutils.J2SObjInit(
	 locid,
	 [ astutils.J2SDataPropertyInit(
	    locid,
	    astutils.J2SString( locid, "id" ),
	    astutils.J2SString( locid, id.value ) ),
	   locInit( loc ) ] );
   } else if( declaration ) {
      tokenTypeError( this.consumeAny() );
   } else {
      attrs = astutils.J2SObjInit( loc, [ locInit( loc ) ] );
   }

   const args = parseSiglist.call( this );
   const stmts = parseHHBlock.call( this );
   const mod = astutils.J2SCall( loc, hhref( loc, "MODULE" ), 
				 null,
				 [ attrs ].concat( args, stmts ) );

   if( declaration ) {
      return astutils.J2SVarDecls(
	 loc, [ astutils.J2SDeclInit( loc, id.value, mod ) ] );
   } else {
      return mod;
   }
}

/*---------------------------------------------------------------------*/
/*    parseHop ...                                                     */
/*    -------------------------------------------------------------    */
/*    stmt ::= ...                                                     */
/*       | hop block                                                   */
/*---------------------------------------------------------------------*/
function parseAtom( token ) {
   
   function parseAtomBlock() {
      return parseHHAccessors.call( this, accessors => {
	 const block = this.parseBlock();
	 return { block: block, accessors: accessors };
      } );
   }

   const loc = token.location;
   const { block, accessors } = parseAtomBlock.call( this );
   const appl = astutils.J2SDataPropertyInit(
      loc, 
      astutils.J2SString( loc, "apply" ),
      astutils.J2SFun( loc, "atomfun", [], block ) );
   const attrs = astutils.J2SObjInit( loc, [ locInit( loc ), appl ] );
   
   return astutils.J2SCall( loc, hhref( loc, "ATOM" ), null,
			    [ attrs ].concat( accessors ) );
}

/*---------------------------------------------------------------------*/
/*    parseEmpty ...                                                   */
/*---------------------------------------------------------------------*/
function parseEmpty( token, fun ) {
   const loc = token.location;
   const attrs = astutils.J2SObjInit( loc, [ locInit( loc ) ] );
   
   return astutils.J2SCall( loc, hhref( loc, fun ), null, [ attrs ] );
}

/*---------------------------------------------------------------------*/
/*    parseNothing ...                                                 */
/*    -------------------------------------------------------------    */
/*    stmt ::= ...                                                     */
/*       | NOTHING                                                     */
/*---------------------------------------------------------------------*/
function parseNothing( token ) {
   return parseEmpty( token, "NOTHING" );
}

/*---------------------------------------------------------------------*/
/*    parsePause ...                                                   */
/*    -------------------------------------------------------------    */
/*    stmt ::= ...                                                     */
/*       | yield                                                       */
/*---------------------------------------------------------------------*/
function parsePause( token ) {
   return parseEmpty( token, "PAUSE" );
}

/*---------------------------------------------------------------------*/
/*    parseHaltExit ...                                                */
/*    -------------------------------------------------------------    */
/*    stmt ::= ...                                                     */
/*       | break                                                       */
/*       | break lbl                                                   */
/*---------------------------------------------------------------------*/
function parseHaltExit( token ) {
   if( this.peekToken().type === this.ID ) {
      const id = this.consumeAny();
      const loc = id.location;
      const attrs = astutils.J2SObjInit(
	 loc,
	 [ astutils.J2SDataPropertyInit(
	    loc,
	    astutils.J2SString( loc, id.value ),
	    astutils.J2SString( loc, id.value ) ),
	   locInit( loc ) ] );
      
      return astutils.J2SCall( loc, hhref( loc, "EXIT" ), null, [ attrs ] );
   } else {
      return parseEmpty( token, "HALT" );
   }
}

/*---------------------------------------------------------------------*/
/*    parseSequence ...                                                */
/*    -------------------------------------------------------------    */
/*    stmt ::= ...                                                     */
/*       | SEQUENCE block                                              */
/*---------------------------------------------------------------------*/
function parseSequence( token, consume ) {
   const loc = token.location;
   const attrs = astutils.J2SObjInit( loc, [ locInit( loc ) ] );
   const body = parseHHBlock.call( this, consume );

   return astutils.J2SCall( loc, hhref( loc, "SEQUENCE" ), 
			    null,
			    [ attrs ].concat( body ) );
}

/*---------------------------------------------------------------------*/
/*    parseFork ...                                                    */
/*    -------------------------------------------------------------    */
/*    stmt ::= ...                                                     */
/*       | fork [ident] block [ par block ... ]                        */
/*---------------------------------------------------------------------*/
function parseFork( token ) {
   const loc = token.location;
   let id;
   let attrs;
   let body = [];

   if( this.peekToken().type === this.ID ) {
      let id = this.consumeAny();
      const locid = id.location;

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
				[ astutils.J2SObjInit( loc, [ locInit( loc ) ] ) ]
				.concat( parseHHBlock.call( this ) ) ) );

   while( isIdToken( this, this.peekToken(), "par" ) ) {
      body.push( parseSequence.apply( this, [ this.consumeAny(), true ] ) );
   }

   return astutils.J2SCall( loc, hhref( loc, "FORK" ), 
			    null,
			    [ attrs ].concat( body ) );
}

/*---------------------------------------------------------------------*/
/*    parseEmitSustain ...                                             */
/*    -------------------------------------------------------------    */
/*    emitsig ::= ident | ident( hhexpr )                              */
/*---------------------------------------------------------------------*/
function parseEmitSustain( token, command ) {
   
   function parseSignalEmit( loc ) {
      const id = this.consumeToken( this.ID );
      const locid = id.location;
      let inits = [ locInit( locid ), astutils.J2SDataPropertyInit(
	 locid,
	 astutils.J2SString( locid, id.value ),
	 astutils.J2SString( locid, id.value ) ) ];
      let accessors = [];

      if( this.peekToken().type === this.LPAREN ) {
	 const lparen = this.consumeAny();
	 const ll = lparen.location;
	 const { expr, accessors: axs } = parseHHExpression.call( this );
	 const rparen = this.consumeToken( this.RPAREN );
	 const lr = rparen.location;

	 const fun = astutils.J2SFun(
	    ll, "emitfun", [],
	    astutils.J2SBlock(
	       ll, lr,
	       [ astutils.J2SReturn( ll, expr ) ] ) );

	 const val = astutils.J2SDataPropertyInit(
	    locid,
	    astutils.J2SString( locid, "apply" ),
	    fun );

	 inits.push( val );
	 accessors = axs;
      }
      
      return astutils.J2SCall(
	 loc, hhref( loc, command ), null,
	 [ astutils.J2SObjInit( locid, inits ) ].concat( accessors ) );
   }

   const loc = token.location;
   let locinit = locInit( loc );
   let nodes = [ parseSignalEmit.call( this, loc ) ];

   while( this.peekToken().type === this.COMMA ) {
      this.consumeAny();
      nodes.push( parseSignalEmit.call( this, loc ) );
   }

   if( nodes.length == 1 ) {
      return nodes[ 0 ];
   } else {
      return astutils.J2SCall(
	 loc, hhref( loc, "SEQUENCE" ), null,
	 [ astutils.J2SObjInit( loc, [ locinit ] ) ].concat( nodes ) );
   }
}

/*---------------------------------------------------------------------*/
/*    parseEmit ...                                                    */
/*    -------------------------------------------------------------    */
/*    stmt ::= ...                                                     */
/*       | EMIT emitsig, ...                                           */
/*---------------------------------------------------------------------*/
function parseEmit( token ) {
   return parseEmitSustain.apply( this, [ token, "EMIT" ] );
}

/*---------------------------------------------------------------------*/
/*    parseSustain ...                                                 */
/*    -------------------------------------------------------------    */
/*    stmt ::= ...                                                     */
/*       | SUSTAIN emitsig, ...                                        */
/*---------------------------------------------------------------------*/
function parseSustain( token ) {
   return parseEmitSustain.apply( this, [ token, "SUSTAIN" ] );
}

/*---------------------------------------------------------------------*/
/*    parseAwait ...                                                   */
/*    -------------------------------------------------------------    */
/*    stmt ::= ...                                                     */
/*       | await delay                                                 */
/*---------------------------------------------------------------------*/
function parseAwait( token ) {
   const loc = token.location;
   const { inits, accessors } = parseDelay.apply( this, [ loc, "apply" ] );

   return astutils.J2SCall(
      loc, hhref( loc, "AWAIT" ),
      null,
      [ astutils.J2SObjInit( loc, [ locInit( loc ) ].concat( inits ) ) ]
	 .concat( accessors ) );
}

/*---------------------------------------------------------------------*/
/*    parseIf ...                                                      */
/*    -------------------------------------------------------------    */
/*    stmt ::= ...                                                     */
/*       | IF( hhexpr ) block [else stmt]                              */
/*---------------------------------------------------------------------*/
function parseIf( token ) {
   const loc = token.location;

   this.consumeToken( this.LPAREN );
   const { expr: expr, accessors } = parseHHExpression.call( this );
   this.consumeToken( this.RPAREN );

   const fun = astutils.J2SFun(
      loc, "iffun", [],
      astutils.J2SBlock( loc, loc, [ astutils.J2SReturn( loc, expr ) ] ) );
   const appl = astutils.J2SDataPropertyInit(
      loc,
      astutils.J2SString( loc, "apply" ),
      fun );
   const attrs = astutils.J2SObjInit( loc, [ locInit( loc ), appl ] );

   const then = parseHiphop.apply( this, [ this.peekToken(), false ] );
//   const then = astutils.J2SBlock( loc, loc, parseHHBlock.call( this ) );

   const args = [ attrs ].concat( accessors );
   args.push( then );
   
   if( this.peekToken().type == this.ELSE ) {
      const loce = this.consumeAny().location;
      args.push( parseHiphop.apply( this, [ this.peekToken(), false ] ) );
//      args.push( astutils.J2SBlock( loce, loce, parseHHBlock.call( this ) ) );
   }

   return astutils.J2SCall( loc, hhref( loc, "IF" ), null, args );
}

/*---------------------------------------------------------------------*/
/*    parseAbortWeakabort ...                                          */
/*---------------------------------------------------------------------*/
function parseAbortWeakabort( token, command ) {
   const loc = token.location;
   const { inits, accessors } = parseDelay.apply( this, [ loc, "apply" ] );
   const stmts = parseHHBlock.call( this );
   
   return astutils.J2SCall(
      loc, hhref( loc, command ), null,
      [ astutils.J2SObjInit( loc, [ locInit( loc ) ].concat( inits ) ) ]
	 .concat( accessors )
	 .concat( stmts ) );
}
   
/*---------------------------------------------------------------------*/
/*    parseAbort ...                                                   */
/*    -------------------------------------------------------------    */
/*    stmt ::= ...                                                     */
/*       | ABORT delay block                                           */
/*---------------------------------------------------------------------*/
function parseAbort( token ) {
   return parseAbortWeakabort.apply( this, [ token, "ABORT" ] );
}
   
/*---------------------------------------------------------------------*/
/*    parseWeakabort ...                                               */
/*    -------------------------------------------------------------    */
/*    stmt ::= ...                                                     */
/*       | WEAKABORT delay block                                       */
/*---------------------------------------------------------------------*/
function parseWeakabort( token ) {
   return parseAbortWeakabort.apply( this, [ token, "WEAKABORT" ] );
}

/*---------------------------------------------------------------------*/
/*    parseSuspend ...                                                 */
/*    -------------------------------------------------------------    */
/*    stmt ::= ...                                                     */
/*       | SUSPEND delay { stmt }                                      */
/*       | SUSPEND FROM delay TO delay [emit] { stmt }                 */
/*       | SUSPEND TOGGLE delay [emit] { stmt }                        */
/*                                                                     */
/*    (MS: I am not sure about the delay arguments. It looks like      */
/*    to me that immediate would be meaning less here.)                */
/*---------------------------------------------------------------------*/
function parseSuspend( token ) {

   function parseEmitwhensuspended( inits ) {
      if( isIdToken( this, this.peekToken(), "EMITWHENSUSPENDED" ) ) {
	 const loc = this.consumeAny().location
	 const id = this.consumeToken( this.id );

	 inits.push( 
	    astutils.J2SDataPropertyInit(
	       loc,
	       astutils.J2SString( loc, "emitwhensuspended" ),
	       astutils.J2SString( id.location, id.value ) ) )
      }
   }

   const loc = token.location;
   let delay;
   let inits = [ locInit( loc ) ];
   let accessors = [];
   
   if( isIdToken( this, this.peekToken(), "FROM" ) ) {
      // SUSPEND FROM delay TO delay [whenemitsuspended] BLOCK
      const { inits: from, accessors: afrom } =
	    parseDelay.apply(
	       this, [ this.consumeAny().location, "fromApply" ] );
      const tot = this.consumeAny();
      if( !isIdToken( this, tot, "TO" ) ) {
	 throw new SyntaxError( "SUSPEND: unexpected token `" + tot.value + "'",
				tot.location );
      }

      parseEmitwhensuspended( inits );
      
      const { inits: to, accessors: ato } =
	    parseDelay.apply( this, [ tot.location, "toApply" ] );

      inits = inits.push( from );
      inits = inits.push( to );
      accessors = afrom.concat( ato );
   } else if( isIdToken( this, this.peekToken(), "TOGGLE" ) ) {
      // SUSPEND TOGGLE delay [whenemitsuspended] BLOCK
      const tot = this.consumeAny();
      const { inits: toggle, atoggle } =
	    parseDelay.apply( this, [ tot.location, "toggleApply", "toggleSignal" ] );
      
      parseEmitwhensuspended( inits );

      inits.push( toogle );
      accessors = atoggle;
   } else {
      // SUSPEND delay BLOCK
      const { inits: expr, accessors: aexpr } =
	    parseDelay.apply( this,  [ loc, "apply" ] );
      
      inits.push( expr );
      accessors = aexpr;
   }
   const stmts = parseHHBlock.call( this );

   const attrs = astutils.J2SObjInit( loc, inits );
   return astutils.J2SCall(
      loc, hhref( loc, "SUSPEND" ), null,
      [ attrs ].concat( stmts ) );
}

/*---------------------------------------------------------------------*/
/*    parseLoop ...                                                    */
/*    -------------------------------------------------------------    */
/*    stmt ::= ...                                                     */
/*       | LOOP block                                                  */
/*---------------------------------------------------------------------*/
function parseLoop( token ) {
   const loc = token.location;

   const stmts = parseHHBlock.call( this );
   const attrs = astutils.J2SObjInit( loc, [ locInit( loc ) ] );
   
   return astutils.J2SCall( loc, hhref( loc, "LOOP" ), 
			    null,
			    [ attrs ].concat( stmts ) );
}

/*---------------------------------------------------------------------*/
/*    parseLoopeachEvery ...                                           */
/*    -------------------------------------------------------------    */
/*    stmt ::= ...                                                     */
/*       | foreach ( delay ) block                                     */
/*---------------------------------------------------------------------*/
function parseLoopeachEvery( token, action ) {
   const loc = token.location;

   this.consumeToken( this.LPAREN );
   const { inits, accessors } = parseDelay.call( this, loc );
   this.consumeToken( this.RPAREN );

   const stmts = parseHHBlock.call( this );
   const attrs = astutils.J2SObjInit(
      loc, [ locInit( loc ) ].concat( inits ) );
   
   return astutils.J2SCall( loc, hhref( loc, action ), 
			    null,
			    [ attrs ].concat( accessors, stmts ) );
}

/*---------------------------------------------------------------------*/
/*    parseLocal ...                                                   */
/*---------------------------------------------------------------------*/
function parseLocal( token ) {
   const loc = token.location;

   function signal( loc, name, direction ) {
      const id = astutils.J2SDataPropertyInit(
	 loc,
	 astutils.J2SString( loc, "name" ),
	 astutils.J2SString( loc, name ) );
      const attrs = astutils.J2SObjInit( loc, [ id ] );
      
      return astutils.J2SCall( loc, hhref( loc, "SIGNAL" ), null, [ attrs ] );
   }

   function parseSiglist() {

      let lbrace = this.consumeToken( this.LPAREN );
      let args = [];

      while( true ) {
	 if( this.peekToken().type === this.RPAREN ) {
	    this.consumeAny();
	    return args;
	 } else {
	    const t = this.consumeToken( this.ID );
	    
	    args.push( signal( t.location, t.value, "INOUT" ) );

	    if( this.peekToken().type === this.RPAREN ) {
	       this.consumeAny();
	       return args;
	    } else {
	       this.consumeToken( this.COMMA );
	    }
	 }
      }
   }
   
   const attrs = astutils.J2SObjInit( loc, [ locInit( loc ) ] );
   const args = parseSiglist.call( this );
   const stmts = parseHHBlock.call( this );

   return astutils.J2SCall( loc, hhref( loc, "LOCAL" ), 
			    null,
			    [ attrs ].concat( args, stmts ) );
}

/*---------------------------------------------------------------------*/
/*    parseLet ...                                                     */
/*---------------------------------------------------------------------*/
function parseLet( token ) {
   const loc = token.location;

   function signal( loc, name, direction ) {
      const id = astutils.J2SDataPropertyInit(
	 loc,
	 astutils.J2SString( loc, "name" ),
	 astutils.J2SString( loc, name ) );
      const attrs = astutils.J2SObjInit( loc, [ id ] );
      
      return astutils.J2SCall( loc, hhref( loc, "SIGNAL" ), null, [ attrs ] );
   }

   function parseSiglist() {
      let args = [];

      while( true ) {
	 const t = this.consumeToken( this.ID );
	 
	 args.push( signal( t.location, t.value, "INOUT" ) );

	 if( this.peekToken().type === this.SEMICOLON ) {
	    this.consumeAny();
	    return args;
	 } else {
	    this.consumeToken( this.COMMA );
	 }
      }
   }

   const attrs = astutils.J2SObjInit( loc, [ locInit( loc ) ] );
   const args = parseSiglist.call( this );
   const stmts = parseHHBlock.call( this, false );

   return astutils.J2SCall( loc, hhref( loc, "LOCAL" ), 
			    null,
			    [ attrs ].concat( args, stmts ) );
}

/*---------------------------------------------------------------------*/
/*    parseTrap ...                                                    */
/*---------------------------------------------------------------------*/
function parseTrap( token ) {
   const col = this.consumeToken( this.COLUMN );
   const block = parseHiphop.apply( this, [ this.peekToken, false ] );
   const loc = token.location;
   const attrs = astutils.J2SObjInit(
      loc,
      [ astutils.J2SDataPropertyInit(
	 loc,
	 astutils.J2SString( loc, token.value ),
	 astutils.J2SString( loc, token.value ) ),
	locInit( loc ) ] );
   
   return astutils.J2SCall( loc, hhref( loc, "TRAP" ), 
			    null,
			    [ attrs ].concat( [ block ] ) );
}

/*---------------------------------------------------------------------*/
/*    parseHiphop ...                                                  */
/*---------------------------------------------------------------------*/
function parseHiphop( token, declaration ) {
   const next = this.consumeAny();

   switch( next.type ) {
      case this.ID:
	 switch( next.value ) {
	    case "module":
	       return parseModule.call( this, next, declaration );
	    case "hop":
	       return parseAtom.call( this, next );
	    case "nothing":
	       return parseNothing.call( this, next );
/* 	    case "pause":                                              */
/* 	       return parsePause.call( this, next );                   */
/* 	    case "halt":                                               */
/* 	       return parseHalt.call( this, next );                    */
/* 	    case "sequence":                                           */
/* 	       return parseSequence.call( this, next );                */
	    case "fork":
	       return parseFork.call( this, next );
	    case "emit":
	       return parseEmit.call( this, next );
	    case "sustain":
	       return parseSustain.call( this, next );
/* 	    case "if":                                                 */
/* 	       return parseIf.call( this, next );                      */
	    case "abort":
	       return parseAbort.call( this, next );
	    case "weakabort":
	       return parseWeakabort.call( this, next );
	    case "suspend":
	       return parseSuspend.call( this, next );
	    case "loop":
	       return parseLoop.call( this, next );
/* 	    case "loopeach":                                           */
/* 	       return parseLoopeach.call( this, next );                */
/* 	    case "local":                                              */
/* 	       return parseLocal.call( this, next );                   */
	    case "every":
	       return parseLoopeachEvery.call( this, next, "EVERY" );
	       
	    default:
	       if( this.peekToken().type === this.COLUMN ) {
		  return parseTrap.call( this, next );
	       } else {
		  throw tokenValueError( next );
	       }
	 }
	 
/*       case this.do:                                                 */
/* 	 return parseLoop.call( this, next );                          */

      case this.for:
	 return parseLoopeachEvery.call( this, next, "LOOPEACH" );
	 
      case this.if:
	 return parseIf.call( this, next );
	 
      case this.break:
	 return parseHaltExit.call( this, next );
	 
      case this.yield:
	 return parsePause.call( this, next );
	 
      case this.await:
	 return parseAwait.call( this, next );
	 
      case this.DOLLAR: {
	    let next = this.peekToken();
	    const expr = this.parseExpression();
	    this.consumeToken( this.RBRACE );
	    return expr;
	 }

      case this.LBRACE:
	 return parseSequence.apply( this, [ next, false ] );

      default:
	 throw tokenTypeError( this.consumeAny() );
   }
}

/*---------------------------------------------------------------------*/
/*    exports                                                          */
/*---------------------------------------------------------------------*/
parser.addPlugin( "hiphop", parseHiphop );
/* parser.addPlugin(                                                   */
/*    "hiphop",                                                        */
/*    function( token, decl ) {                                        */
/*       let next = this.peekToken();                                  */
/*       console.log( mkMargin(), ">>> HIPHOP next=", next.value, next.type, */
/* 		   next.location.cdr.cdr.car );                        */
/*       margin+=3;                                                    */
/*                                                                     */
/*       let r = parseHiphop.apply( this, [ token, decl ] );           */
/*                                                                     */
/*       margin-=3;                                                    */
/*       next = this.peekToken();                                      */
/*       console.log( mkMargin(), "<<< HIPHOP next=", next.value, next.type, */
/* 		   next.location.cdr.cdr.car );                        */
/*       #:tprint( #:j2s->list( parser.jsToAst( r ) ) );               */
/*       return r;                                                     */
/*    } );                                                             */

exports.parse = parser.parse.bind( parser );
