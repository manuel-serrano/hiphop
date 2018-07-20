/*=====================================================================*/
/*    serrano/prgm/project/hiphop/0.2.x/preprocessor/astparser.js      */
/*    -------------------------------------------------------------    */
/*    Author      :  Manuel Serrano                                    */
/*    Creation    :  Tue Jul 17 17:53:13 2018                          */
/*    Last change :  Fri Jul 20 19:39:11 2018 (serrano)                */
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
/*       | NOW( ident )                                                */
/*       | PRE( ident )                                                */
/*       | VAL( ident )                                                */
/*       | PREVAL( ident )                                             */
/*---------------------------------------------------------------------*/
function parseHHAccessors( parser ) {
   
   let accessors = [];

   const hhparser = function( token ) {
      const loc = token.location
      let pre = false, val = false, access = "present";
      
      this.consumeToken( this.LPAREN );
      
      const tid = this.consumeToken( this.ID );
      const locid = tid.location;
      
      this.consumeToken( this.RPAREN );

      switch( token.value ) {
	 case "NOW": break;
	 case "PRE": pre = true; access = "prePresent"; break;
	 case "VAL": val = true; access = "value"; break;
	 case "PREVAL": pre = true, val = true; access = "preValue"; break;
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
      const attrs = astutils.J2SObjInit( loc, [ signame, sigpre, sigval ] );
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
   
   this.addPlugin( "NOW", hhparser );
   this.addPlugin( "PRE", hhparser );
   this.addPlugin( "VAL", hhparser );
   this.addPlugin( "PREVAL", hhparser );
   try {
      return parser.call( this, accessors );
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
/*    parseDelay ...                                                   */
/*---------------------------------------------------------------------*/
/* function parseDelay() {                                             */
/*    if( isIdToken( this, this.peekToken(), "COUNT" ) ) {             */
/*       this.consumeAny();                                            */
/*       this.consumeToken( this.LPAREN );                             */
/*       const { expr: count, accessors } = parseHHExpression.call( this ); */
/*       this.consumeToken( this.COMMA );                              */
/*       const { expr, accessors } = parseHHExpression.call( this );   */
/*       this.consumeToken( this.RPAREN );                             */
/*       return { expr: expr, count: count, immediate: false, accessors: accessors }; */
/*    } else if( isIdToken( this, this.peekToken(), "IMMEDIATE" ) ) {  */
/*       this.consumeAny();                                            */
/*       const { expr, accessors } = parseHHExpression.call( this );   */
/*       return { expr: expr, count: false, immediate: true, accessors: accessors }; */
/*    } else {                                                         */
/*       const { expr, accessors } = parseHHExpression.call( this );   */
/*                                                                     */
/*       return { expr: expr, count: false, immediate: false, accessors: accessors }; */
/*    }                                                                */
/* }                                                                   */
      
/*---------------------------------------------------------------------*/
/*    parseDelay ...                                                   */
/*    -------------------------------------------------------------    */
/*    delay ::= hhexpr                                                 */
/*       | COUNT( hhexpr, hhexpr )                                     */
/*       | IMMEDIATE( hhexpr )                                         */
/*---------------------------------------------------------------------*/
function parseDelay( loc, action = "apply", id = false ) {
   if( isIdToken( this, this.peekToken(), "COUNT" ) ) {
      // COUNT( hhexpr, hhexpr )
      this.consumeAny();
      this.consumeToken( this.LPAREN );
      const { expr: count, accessors: axsc } = parseHHExpression.call( this );
      this.consumeToken( this.COMMA );
      const { expr, accessors: axse } = parseHHExpression.call( this );
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
	    fun ) ];
      
      return { inits: inits, accessors: axsc + axse };
   } else {
      let immediate = false;
      
      if( isIdToken( this, this.peekToken(), "IMMEDIATE" ) ) {
	 // IMMEDIATE( hhexpr )
	 this.consumeAny();
	 immediate = true;
      }

      // hhexpr
      const { expr, accessors } = parseHHExpression.call( this );
      
      const fun = astutils.J2SFun(
	 loc, "hhexprfun", [], 
	 astutils.J2SBlock( loc, loc, [ astutils.J2SReturn( loc, expr ) ] ) );
      
      const inits = [
	 astutils.J2SDataPropertyInit(
	    loc, astutils.J2SString( loc, "immediate" ),
	    astutils.J2SBool( loc, immediate ) ), 
	 astutils.J2SDataPropertyInit(
	    loc, astutils.J2SString( loc, action ),
	    fun ) ];

      return { inits: inits, accessors: accessors };
   }
}
      
/*---------------------------------------------------------------------*/
/*    parseHHBlock ...                                                 */
/*    -------------------------------------------------------------    */
/*    block ::= { stmt; ... }                                          */
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
	       case "SUSPEND":
		  nodes.push( parseSuspend.call( this, this.consumeAny() ) );
		  break
	       case "LOOP":
		  nodes.push( parseLoop.call( this, this.consumeAny() ) );
		  break
	       case "LOOPEACH":
		  nodes.push( parseLoopeach.call( this, this.consumeAny() ) );
		  break
	       case "LOCAL":
		  nodes.push( parseLocal.call( this, this.consumeAny() ) );
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
/*    parseModule ...                                                  */
/*    -------------------------------------------------------------    */
/*    stmt ::= ...                                                     */
/*       | MODULE [ident] ( signal, ... ) block                        */
/*---------------------------------------------------------------------*/
function parseModule( token ) {
   
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

   function parseSiglist() {

      let lbrace = this.consumeToken( this.LPAREN );
      let args = [];

      while( true ) {
	 if( this.peekToken().type === this.RPAREN ) {
	    this.consumeAny();
	    return args;
	 } else {
	    const t = this.consumeToken( this.ID );
	    
	    switch( t.value ) {
	       case "IN": {
		  let t = this.consumeToken( this.ID );
		  args.push( signal( t.location, t.value, "IN" ) );
		  break;
	       }
	       case "OUT": {
		  let t = this.consumeToken( this.ID );
		  args.push( signal( t.location, t.value, "OUT" ) );
		  break;
	       }
	       case "INOUT": {
		  let t = this.consumeToken( this.ID );
		  args.push( signal( t.location, t.value, "INOUT" ) );
		  break;
	       }
	       default: {
		  args.push( signal( t.location, t.value, "INOUT" ) );
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
   
   const loc = token.location;
   let id;
   let attrs;

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

   const args = parseSiglist.call( this );
   const stmts = parseHHBlock.call( this );

   return astutils.J2SCall( loc, hhref( loc, "MODULE" ), 
			    null,
			    [ attrs ].concat( args, stmts ) );
}

/*---------------------------------------------------------------------*/
/*    parseAtom ...                                                    */
/*    -------------------------------------------------------------    */
/*    stmt ::= ...                                                     */
/*       | atom block                                                  */
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
/*       | PAUSE                                                       */
/*---------------------------------------------------------------------*/
function parsePause( token ) {
   return parseEmpty( token, "PAUSE" );
}

/*---------------------------------------------------------------------*/
/*    parseHalt ...                                                    */
/*    -------------------------------------------------------------    */
/*    stmt ::= ...                                                     */
/*       | HALT                                                        */
/*---------------------------------------------------------------------*/
function parseHalt( token ) {
   return parseEmpty( token, "HALT" );
}

/*---------------------------------------------------------------------*/
/*    parseSequence ...                                                */
/*    -------------------------------------------------------------    */
/*    stmt ::= ...                                                     */
/*       | SEQUENCE block                                              */
/*---------------------------------------------------------------------*/
function parseSequence( token ) {
   const loc = token.location;
   const attrs = astutils.J2SObjInit( loc, [ locInit( loc ) ] );
   const body = parseHHBlock.call( this );

   return astutils.J2SCall( loc, hhref( loc, "SEQUENCE" ), 
			    null,
			    [ attrs ].concat( body ) );
}

/*---------------------------------------------------------------------*/
/*    parseFork ...                                                    */
/*    -------------------------------------------------------------    */
/*    stmt ::= ...                                                     */
/*       | FORK [ident] block [ PAR block ... ]                        */
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

   while( isIdToken( this, this.peekToken(), "PAR" ) ){
      body.push( parseSequence.call( this, this.consumeAny() ) );
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
	 const { expr, axs } = this.parseHHExpression();
	 const rparen = this.consumeToken( this.RPAREN );
	 const lr = rparen.location;
	 const fun = astutils.J2SFun(
	    ll, "emitfun", [],
	    astutils.J2SBlock(
	       ll, lr,
	       [ astutils.J2SReturn( ll, expr ) ] ) );

	 const val = astutils.J2SDataPropertyInit(
	    locid,
	    astutils.J2SString( locid, "ifapply" ),
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
	 [ astutils.J2SObjInit( locid, locinit ) ].concat( nodes ) );
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
/*       | AWAIT delay                                                 */
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

   const then = astutils.J2SBlock( loc, loc, parseHHBlock.call( this ) );

   const args = [ attrs ].concat( accessors );
   args.push( then );
   
   if( this.peekToken().type == this.ELSE ) {
      const loce = this.consumeAny().location;
      args.push( astutils.J2SBlock( loce, loce, parseHHBlock.call( this ) ) );
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
/*    parseLoopeach ...                                                */
/*    -------------------------------------------------------------    */
/*    stmt ::= ...                                                     */
/*       | LOOPEACH ( delay ) block                                    */
/*---------------------------------------------------------------------*/
function parseLoopeach( token ) {
   const loc = token.location;

   this.consumeToken( this.LPAREN );
   const { inits, accessors } = parseDelay.call( this, loc );
   this.consumeToken( this.RPAREN );

   const stmts = parseHHBlock.call( this );
   const attrs = astutils.J2SObjInit(
      loc, [ locInit( loc ) ].concat( inits ) );
   
   return astutils.J2SCall( loc, hhref( loc, "LOOPEACH" ), 
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
parser.addPlugin( "WEAKABORT", parseWeakabort );
parser.addPlugin( "SUSPEND", parseSuspend );
parser.addPlugin( "LOOP", parseLoop );
parser.addPlugin( "LOOPEACH", parseLoopeach );
parser.addPlugin( "LOCAL", parseLocal );

exports.parse = parser.parse.bind( parser );
