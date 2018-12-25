/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/preprocessor/astparser.js     */
/*    -------------------------------------------------------------    */
/*    Author      :  Manuel Serrano                                    */
/*    Creation    :  Tue Jul 17 17:53:13 2018                          */
/*    Last change :  Mon Dec 24 10:01:33 2018 (serrano)                */
/*    Copyright   :  2018 Manuel Serrano                               */
/*    -------------------------------------------------------------    */
/*    HipHop parser based on the genuine Hop parser                    */
/*=====================================================================*/
"use hopscript"

const hopc = require( hop.hopc );
const ast = require( hopc.ast );
const astutils = require( "./astutils.js" );
const error = require( "../lib/error.js" );
const parser = new hopc.Parser();
const hhaccess = require( "./_hhaccess.hop" );

const hhname = "__hh_module";
const hhmodule = "hiphop";

/*---------------------------------------------------------------------*/
/*    self ...                                                         */
/*---------------------------------------------------------------------*/
function self( loc ) {
   return astutils.J2SDecl( loc, "this", "var", "this" );
}

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
/*    tagInit ...                                                      */
/*---------------------------------------------------------------------*/
function tagInit( tag, loc ) {
   return astutils.J2SDataPropertyInit(
      loc,
      astutils.J2SString( loc, "%tag" ),
      astutils.J2SString( loc, tag ) );
}
   
/*---------------------------------------------------------------------*/
/*    tokenLocation ...                                                */
/*---------------------------------------------------------------------*/
function tokenLocation( token ) {
   return { filename: token.filename, pos: token.pos };
}

/*---------------------------------------------------------------------*/
/*    tokenValueError ...                                              */
/*---------------------------------------------------------------------*/
function tokenValueError( token ) {
   return error.SyntaxError( "unexpected token `" + token.value + "'",
			     tokenLocation( token ) );
}


/*---------------------------------------------------------------------*/
/*    tokenTypeError ...                                               */
/*---------------------------------------------------------------------*/
function tokenTypeError( token ) {
   return error.SyntaxError( "unexpected token `" + token.type + "'",
			     tokenLocation( token ) );
}

/*---------------------------------------------------------------------*/
/*    tokenReferenceError ...                                          */
/*---------------------------------------------------------------------*/
function tokenReferenceError( token ) {
   error.ReferenceError( "unbound interface `" + token.value + "'",
			 tokenLocation( token ) );
}

/*---------------------------------------------------------------------*/
/*    isIdToken ...                                                    */
/*---------------------------------------------------------------------*/
function isIdToken( parser, token, id ) {
   return token.type === parser.ID && token.value === id;
}

/*---------------------------------------------------------------------*/
/*    hhref ...                                                        */
/*---------------------------------------------------------------------*/
function hhref( loc, name ) {
   return astutils.J2SAccess(
      loc,
      astutils.J2SUnresolvedRef( loc, hhname ),
      astutils.J2SString( loc, name ) );
}

/*---------------------------------------------------------------------*/
/*    hhwrapDecl ...                                                   */
/*    -------------------------------------------------------------    */
/*    Generate:                                                        */
/*      STMT -> __hh_module = require( "hiphop" ); STMT                */
/*---------------------------------------------------------------------*/
function hhwrapDecl( token, stmt ) {
   const loc = token.location;
   const req = astutils.J2SCall( loc, astutils.J2SUnresolvedRef( loc, "require" ),
				 [ astutils.J2SUndefined( loc ) ],
				 [ astutils.J2SString( loc, hhmodule ) ] );
   const decl = astutils.J2SDeclInit( loc, hhname, req, "var" );

   return astutils.J2SVarDecls( stmt.loc, [ decl ].concat( stmt.decls ) );
}

/*---------------------------------------------------------------------*/
/*    hhwrapExpr ...                                                   */
/*    -------------------------------------------------------------    */
/*    Generate:                                                        */
/*      EXPR -> ((__hh_module => EXPR)require( "hiphop" ))             */
/*---------------------------------------------------------------------*/
function hhwrapExpr( token, expr ) {
   const loc = token.location;
   const req = astutils.J2SCall( loc, astutils.J2SUnresolvedRef( loc, "require" ),
				 [ astutils.J2SUndefined( loc ) ],
				 [ astutils.J2SString( loc, hhmodule ) ] );
   const fun = astutils.J2SFun(
      loc, "hhwrap", [ astutils.J2SDecl( loc, hhname, "param" ) ],
      astutils.J2SBlock( loc, loc, [ astutils.J2SReturn( loc, expr ) ] ) );

   return astutils.J2SCall( loc, fun,
			    [ astutils.J2SUndefined( loc ) ],
			    [ req ] );
}
   
/*---------------------------------------------------------------------*/
/*    parseHHThisExpr ...                                              */
/*    -------------------------------------------------------------    */
/*    hhexpr ::= ${ jsexpr }                                           */
/*       | jsexpr                                                      */
/*       | now.ident                                                   */
/*       | pre.ident                                                   */
/*       | nowval.ident                                                */
/*       | preval.ident                                                */
/*---------------------------------------------------------------------*/
function parseHHThisExpr( parser, iscnt = false ) {
   
   let accessors = [];

   const hhparser = function( token ) {
      const loc = token.location;
      const access = token.value;
      let pre = false, val = false;
      
      this.consumeToken( this.LPAREN );
      
      const tid = this.consumeToken( this.ID );
      const locid = tid.location;
      
      this.consumeToken( this.RPAREN );

      switch( token.value ) {
	 case "now": break;
	 case "pre": pre = true; break;
	 case "nowval": val = true; break;
	 case "preval": pre = true, val = true; break;
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

      // push the accessor in the dependencies list
      accessors.push( sigaccess );

      // return the actual expression
      return astutils.J2SAccess(
	 locid,
	 astutils.J2SAccess( locid,
			     astutils.J2SHopRef( loc, "this" ),
			     astutils.J2SString( loc, tid.value ) ),
	 astutils.J2SString( locid, access ) );
   }
   
   this.addPlugin( "now", hhparser );
   this.addPlugin( "pre", hhparser );
   this.addPlugin( "nowval", hhparser );
   this.addPlugin( "preval", hhparser );
   try {
      const { expr: e, accessors: axs } = parser.call( this, accessors );
      const expr = hhaccess( e, iscnt, hhname, accessors );
      return { expr: expr, accessors: accessors };
/*       return parser.call( this, accessors );                        */
   } finally {
      this.removePlugin( "preval" );
      this.removePlugin( "nowval" );
      this.removePlugin( "pre" );
      this.removePlugin( "now" );
   }
}

/*---------------------------------------------------------------------*/
/*    parseHHThisBlock ...                                             */
/*    -------------------------------------------------------------    */
/*    Parse JS block with augmented expressions as in parseHHThisExpr  */
/*---------------------------------------------------------------------*/
function parseHHThisBlock() {
   let accessors = [];

   const hhparser = function( token ) {
      const loc = token.location;
      const access = token.value;
      let pre = false, val = false;
      
      this.consumeToken( this.LPAREN );
      
      const tid = this.consumeToken( this.ID );
      const locid = tid.location;
      
      this.consumeToken( this.RPAREN );

      switch( token.value ) {
	 case "now": break;
	 case "pre": pre = true; break;
	 case "nowval": val = true; break;
	 case "preval": pre = true, val = true; break;
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

      const attrs =
	    astutils.J2SObjInit( loc, [ signame, sigpre, sigval ] );
      const sigaccess = astutils.J2SCall(
	 loc, hhref( loc, "SIGACCESS" ), null, [ attrs ] );

      // push the accessor dependencies list
      accessors.push( sigaccess );

      // return the actual expression
      return astutils.J2SAccess(
	 locid,
	 astutils.J2SAccess( locid,
			     astutils.J2SUnresolvedRef( loc, "this" ),
			     astutils.J2SString( loc, tid.value ) ),
	 astutils.J2SString( locid, access ) );
   }
   
   this.addPlugin( "now", hhparser );
   this.addPlugin( "pre", hhparser );
   this.addPlugin( "nowval", hhparser );
   this.addPlugin( "preval", hhparser );
   try {
      const block = hhaccess( this.parseBlock(), false, hhname, accessors );
      return { block: block, accessors: accessors };
   } finally {
      this.removePlugin( "preval" );
      this.removePlugin( "nowval" );
      this.removePlugin( "pre" );
      this.removePlugin( "now" );
   }
}

/*---------------------------------------------------------------------*/
/*    parseHHExpression ...                                            */
/*---------------------------------------------------------------------*/
function parseHHExpression() {
   return parseHHThisExpr.call( this, accessors => {
      if( this.peekToken().type === this.DOLLAR ) {
	 const expr = this.parseDollarExpression();
	 return { expr: expr, accessors: accessors };
      } else {
	 const expr = this.parseCondExpression();
	 return { expr: expr, accessors: accessors };
      }
   } );
}

/*---------------------------------------------------------------------*/
/*    parseHHRunExpression ...                                         */
/*---------------------------------------------------------------------*/
function parseHHRunExpression() {
   try {
      const hhdotsparser = function( token ) { 
	 return new astutils.J2SLiteralValue( token.location, undefined );
      }
      
      this.addPlugin( "...", hhdotsparser );
      return parseHHExpression.call( this );
   } finally {
      this.removePlugin( "..." );
   }
}

/*---------------------------------------------------------------------*/
/*    parseHHCondExpression ...                                        */
/*---------------------------------------------------------------------*/
function parseHHCondExpression( iscnt, isrun ) {
   return parseHHThisExpr.call(
      this,
      accessors => {
	 if( this.peekToken().type === this.DOLLAR ) {
	    const expr = this.parseDollarExpression();
	    return { expr: expr, accessors: accessors };
	 } else {
	    const expr = this.parseCondExpression();
	    return { expr: expr, accessors: accessors };
	 }
      },
      iscnt );
}

/*---------------------------------------------------------------------*/
/*    parseValueApply ...                                              */
/*---------------------------------------------------------------------*/
function parseValueApply( loc ) {
   const { expr: expr, accessors } = parseHHExpression.call( this );
   let init;
   if( typeof expr === "J2SDollar" ) {
      init = astutils.J2SDataPropertyInit(
	 loc,
	 astutils.J2SString( loc, "value" ),
	 expr.node );
   } else {
      const fun = astutils.J2SMethod(
	 loc, "iffun", [],
	 astutils.J2SBlock( loc, loc, [ astutils.J2SReturn( loc, expr ) ] ),
	 self( loc ) );
      init = astutils.J2SDataPropertyInit(
	 loc,
	 astutils.J2SString( loc, "apply" ),
	 fun );
   }
   return { init: init, accessors: accessors }
}
   
/*---------------------------------------------------------------------*/
/*    parseDelay ...                                                   */
/*    -------------------------------------------------------------    */
/*    delay ::= hhexpr                                                 */
/*       | count( hhexpr, hhexpr )                                     */
/*       | immediate( hhexpr )                                         */
/*---------------------------------------------------------------------*/
function parseDelay( loc, tag, action = "apply", id = false ) {
   if( isIdToken( this, this.peekToken(), "count" ) ) {
      // COUNT( hhexpr, hhexpr )
      const loccnt = this.consumeAny();
      this.consumeToken( this.LPAREN );
      const { expr: count, accessors: cntaccessors } =
	    parseHHCondExpression.call( this, true, false );
      this.consumeToken( this.COMMA );
      const { expr, accessors } =
	    parseHHCondExpression.call( this, false, false );

      this.consumeToken( this.RPAREN );

      const fun = astutils.J2SMethod(
	 loc, "delayfun", [], 
	 astutils.J2SBlock( loc, loc, [ astutils.J2SReturn( loc, expr ) ] ),
         self( loc ) );
      const cntfun = astutils.J2SMethod(
	 loc, "cntfun", [], 
	 astutils.J2SBlock( loc, loc, [ astutils.J2SReturn( loc, count ) ] ),
         self( loc ) );
      
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
	 // immediate( hhexpr )
	 const imm = this.consumeAny();
	 immediate = true;
	 if( isIdToken( this, this.peekToken(), "count" ) ) {
	    throw error.SyntaxError( tag + ": can't use immediate with count expression.",
				     tokenLocation( imm ) );
	 }
      }

      // hhexpr
      const { expr, accessors } = parseHHExpression.call( this );
      let inits;

      if( typeof expr === "J2SUnresolvedRef" ) {
	 inits = [
	    astutils.J2SDataPropertyInit(
	       loc, astutils.J2SString( loc, "immediate" ),
	       astutils.J2SBool( loc, immediate ) ), 
	    astutils.J2SDataPropertyInit(
	       loc, astutils.J2SString( loc, expr.id ),
	       astutils.J2SString( loc, expr.id ) ) ];
      } else {
	 const fun = astutils.J2SMethod(
	    loc, "hhexprfun", [], 
	    astutils.J2SBlock( loc, loc, [ astutils.J2SReturn( loc, expr ) ] ),
            self( loc ) );
	 
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
	    if( nodes.length === 0 ) {
	       return [ parseEmpty( nothing, "NOTHING", "nothing" ) ];
	    } else {
	       return nodes;
	    }
	 }

	 case this.let:
	    nodes.push( parseLet.call( this, this.consumeAny(), "let" ) );
	    return nodes;

	 case this.const:
	    nodes.push( parseLet.call( this, this.consumeAny(), "const" ) );
	    return nodes;

	 case this.ID:
	    if( this.peekToken().value === "signal" ) {
	       nodes.push( parseSignal.call( this, this.consumeAny() ) );
	       return nodes;
	    } else {
	       nodes.push( parseStmt.call( this, this.peekToken(), false ) );
	       break;
	    }
	       
	 default:
	    nodes.push( parseStmt.call( this, this.peekToken(), false ) );
	    break;
      }
   }
}

/*---------------------------------------------------------------------*/
/*    parseMachineModule ...                                           */
/*    -------------------------------------------------------------    */
/*    stmt ::= ...                                                     */
/*       | MODULE [ident] ( signal, ... )                              */
/*           [implements dollarexpr, ...] block                        */
/*       | MACHINE [ident] ( signal, ... )                             */
/*           [implements dollarexpr, ...] block                        */
/*    intf ::= [mirror] ident | [mirror] $dollar                       */
/*    signal ::= [direction] ident [combine]                           */
/*    direction ::= in | out | inout                                   */
/*    combine ::= combine expr                                         */
/*---------------------------------------------------------------------*/
function parseMachineModule( token, declaration, ctor ) {
   const loc = token.location;
   const tag = tagInit( ctor.toLowerCase(), loc );
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
	   locInit( loc ), tag ] );
   } else if( declaration ) {
      throw tokenTypeError( this.consumeAny() );
   } else {
      attrs = astutils.J2SObjInit( loc, [ locInit( loc ), tag ] );
   }

   let args = parseModuleSiglist.call( this );
   
   if( this.peekToken().type === this.ID 
       && this.peekToken().value === "implements" ) {
      this.consumeAny();
      args = args.concat( parseInterfaceIntflist.call( this ) );
   }
   
   const stmts = parseHHBlock.call( this );
   const mod = astutils.J2SCall( loc, hhref( loc, ctor ), 
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
/*    parseInterface ...                                               */
/*    -------------------------------------------------------------    */
/*    stmt ::= ...                                                     */
/*       | interface [ident] ( signal, ... ) [extends dollarexpr, ...] */
/*---------------------------------------------------------------------*/
function parseInterface( token, declaration ) {
   const loc = token.location;
   const tag = tagInit( "interface", loc );
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
	   locInit( loc ), tag ] );
   } else if( declaration ) {
      throw tokenTypeError( this.consumeAny() );
   } else {
      attrs = astutils.J2SObjInit( loc, [ locInit( loc ), tag ] );
   }

   let args = parseModuleSiglist.call( this );

   if( this.peekToken().type === this.extends ) {
      this.consumeAny();

      args = args.concat( parseInterfaceIntflist.call( this ) );
   }

   const intf = astutils.J2SCall( loc, hhref( loc, "INTERFACE" ), 
				 null,
				 [ attrs ].concat( args ) );
   
   if( declaration ) {
      return astutils.J2SVarDecls(
	 loc, [ astutils.J2SDeclInit( loc, id.value, intf ) ] );
   } else {
      return intf;
   }
}

/*---------------------------------------------------------------------*/
/*    parseInterfaceIntflist ...                                       */
/*---------------------------------------------------------------------*/
function parseInterfaceIntflist() {
   let args = [];

   do {
      let mirror = false;
      
      if( this.peekToken().type === this.ID 
	  && this.peekToken().value === "mirror" ) {
	 mirror = true;
	 this.consumeAny();
      } 
      
      const token = this.peekToken();
      const loc = token.location;
      const tag = tagInit( "interface", loc );
      let expr;
      
      switch( token.type ) {
	 case this.DOLLAR:
	    expr = this.parseDollarExpression().node;
	    break;
	    
	 case this.ID:
	    this.consumeAny();
	    expr = astutils.J2SCall( loc, hhref( loc, "getInterface" ),
	       null, 
	       [ astutils.J2SString( loc, token.value ),
		 location( loc ) ] );
	    break;
	    
	 default: 
	    throw error.SyntaxError( "interface: bad interface", tokenLocation( token ) );
      }
      
      const attrs = astutils.J2SObjInit(
	 loc,
	 [ astutils.J2SDataPropertyInit(
	      loc,
	      astutils.J2SString( loc, "value" ),
	      expr ),
	   astutils.J2SDataPropertyInit(
	      loc,
	      astutils.J2SString( loc, "mirror" ),
	      astutils.J2SBool( loc, mirror ) ),
	   locInit( loc ), tag ] );
      const intf = 
	 astutils.J2SCall( loc, hhref( loc, "INTF" ), null, [ attrs ] );
      args.push( intf );
   } while( this.peekToken().type === this.COMMA ? (this.consumeAny(), true) : false )
   
   return args;
}
   
/*---------------------------------------------------------------------*/
/*    parseModuleSiglist ...                                           */
/*---------------------------------------------------------------------*/
function parseModuleSiglist() {

   function parseSignalModule( token ) {
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
	 throw tokenTypeError( token )
      }
      
      const dir = astutils.J2SDataPropertyInit(
	 loc,
	 astutils.J2SString( loc, "direction" ),
	 astutils.J2SString( loc, direction ) );
      const id = astutils.J2SDataPropertyInit(
	 loc,
	 astutils.J2SString( loc, "name" ),
	 astutils.J2SString( loc, name ) );

      const inits = [ locInit( loc ), dir, id ];
      let accessors = [];
      
      if( this.peekToken().type === this.EGAL ) {
	 this.consumeAny();
	 const { expr, accessors: axs } = parseHHExpression.call( this );

	 const func = astutils.J2SMethod(
	    loc, "initfunc", [],
	    astutils.J2SBlock(
	       loc, loc,
	       [ astutils.J2SReturn( loc, expr ) ] ),
            self( loc ) );
	 const initfunc = astutils.J2SDataPropertyInit(
	    loc,
	    astutils.J2SString( loc, "init_func" ),
	    func );

	 accessors = axs;
	 inits.push( initfunc );
      }
	 
      if( isIdToken( this, this.peekToken(), "combine" ) ) {
	 const locc = this.consumeAny().location;
	 const fun = this.parseCondExpression();

	 const combine = astutils.J2SDataPropertyInit(
	    loc,
	    astutils.J2SString( loc, "combine_func" ),
	    fun );
	 inits.push( combine );
      }

      const attrs = astutils.J2SObjInit( loc, inits );
      return astutils.J2SCall( loc, hhref( loc, "SIGNAL" ), null,
			       [ attrs ].concat( accessors ) );
   }

   let lbrace = this.consumeToken( this.LPAREN );
   let args = [];

   while( true ) {
      if( this.peekToken().type === this.RPAREN ) {
	 this.consumeAny();
	 return args;
      } else {
	 args.push( parseSignalModule.call( this, this.consumeAny() ) );
	 
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
/*    parseHop ...                                                     */
/*    -------------------------------------------------------------    */
/*    stmt ::= ...                                                     */
/*       | hop statement                                               */
/*---------------------------------------------------------------------*/
function parseAtom( token ) {
   
   function parseAtomBlock( loc ) {
      return parseHHThisBlock.call( this );
   }

   const loc = token.location;
   const { block, accessors } = parseAtomBlock.call( this, loc );
   const appl = astutils.J2SDataPropertyInit(
      loc, 
      astutils.J2SString( loc, "apply" ),
      astutils.J2SMethod( loc, "atomfun", [], block, self( loc ) ) );
   const tag = tagInit( "hop", loc );
   const attrs = astutils.J2SObjInit( loc, [ locInit( loc ), tag, appl ] );
   
   return astutils.J2SCall( loc, hhref( loc, "ATOM" ), null,
			    [ attrs ].concat( accessors ) );
}

/*---------------------------------------------------------------------*/
/*    parseEmpty ...                                                   */
/*---------------------------------------------------------------------*/
function parseEmpty( token, fun, tag ) {
   const loc = token.location;
   const attrs = astutils.J2SObjInit( loc, [ locInit( loc ), tagInit( tag, loc ) ] );
   
   return astutils.J2SCall( loc, hhref( loc, fun ), null, [ attrs ] );
}

/*---------------------------------------------------------------------*/
/*    parseNothing ...                                                 */
/*    -------------------------------------------------------------    */
/*    stmt ::= ...                                                     */
/*       | NOTHING                                                     */
/*---------------------------------------------------------------------*/
function parseNothing( token ) {
   return parseEmpty( token, "NOTHING", "nothing" );
}

/*---------------------------------------------------------------------*/
/*    parsePause ...                                                   */
/*    -------------------------------------------------------------    */
/*    stmt ::= ...                                                     */
/*       | yield                                                       */
/*---------------------------------------------------------------------*/
function parsePause( token ) {
   return parseEmpty( token, "PAUSE", "yield" );
}

/*---------------------------------------------------------------------*/
/*    parseExit ...                                                    */
/*    -------------------------------------------------------------    */
/*    stmt ::= ...                                                     */
/*       | break lbl                                                   */
/*---------------------------------------------------------------------*/
function parseExit( token ) {
   const id = this.consumeToken( this.ID );
   const loc = id.location;
   const attrs = astutils.J2SObjInit(
      loc,
      [ astutils.J2SDataPropertyInit(
	 loc,
	 astutils.J2SString( loc, id.value ),
	 astutils.J2SString( loc, id.value ) ),
	locInit( loc ), tagInit( "break", loc ) ] );
   
   return astutils.J2SCall( loc, hhref( loc, "EXIT" ), null, [ attrs ] );
}

/*---------------------------------------------------------------------*/
/*    parseHalt ...                                                    */
/*    -------------------------------------------------------------    */
/*    stmt ::= ...                                                     */
/*       | exit                                                        */
/*---------------------------------------------------------------------*/
function parseHalt( token ) {
   return parseEmpty( token, "HALT", "exit" );
}

/*---------------------------------------------------------------------*/
/*    parseSequence ...                                                */
/*    -------------------------------------------------------------    */
/*    stmt ::= ...                                                     */
/*       | SEQUENCE block                                              */
/*---------------------------------------------------------------------*/
function parseSequence( token, tagname, consume ) {
   const loc = token.location;
   const tag = tagInit( tagname, loc );
   const attrs = astutils.J2SObjInit( loc, [ locInit( loc ), tag ] );
   const body = parseHHBlock.call( this, consume );

   return astutils.J2SCall( loc, hhref( loc, "SEQUENCE" ), 
			    null,
			    [ attrs ].concat( body ) );
}

/*---------------------------------------------------------------------*/
/*    parseFork ...                                                    */
/*    -------------------------------------------------------------    */
/*    stmt ::= ...                                                     */
/*       | fork ["name"] block [ par block ... ]                       */
/*---------------------------------------------------------------------*/
function parseFork( token ) {
   const loc = token.location;
   const tag = tagInit( "fork", loc );
   let id;
   let attrs;
   let body = [];

   if( this.peekToken().type === this.STRING ) {
      let id = this.consumeAny();
      const locid = id.location;

      attrs = astutils.J2SObjInit(
	 locid,
	 [ astutils.J2SDataPropertyInit(
	    locid,
	    astutils.J2SString( locid, "id" ),
	    astutils.J2SString( locid, id.value ) ),
	   locInit( loc ), tag ] );
   } else {
      attrs = astutils.J2SObjInit( loc, [ locInit( loc ), tag ] );
   }

   if( this.peekToken().type === this.DOLLAR ) {
      this.consumeToken( this.DOLLAR );
      const expr = this.parseExpression();
      this.consumeToken( this.RBRACE );
      return astutils.J2SCall( loc, hhref( loc, "FORK" ), 
			       null,
			       [ attrs ].concat( expr ) );
   } else {
      body.push( astutils.J2SCall( loc, hhref( loc, "SEQUENCE" ),
				   null,
				   [ astutils.J2SObjInit( loc, [ locInit( loc ), tag ] ) ]
   .concat( parseHHBlock.call( this ) ) ) );

      while( isIdToken( this, this.peekToken(), "par" ) ) {
      	 body.push( parseSequence.call( this, this.consumeAny(), "par", true ) );
      }

      return astutils.J2SCall( loc, hhref( loc, "FORK" ), 
			       null,
			       [ attrs ].concat( body ) );
   }
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
      const tag = tagInit( command.toLowerCase(), loc );
      let inits = [ locInit( locid ), tag, astutils.J2SDataPropertyInit(
	 locid,
	 astutils.J2SString( locid, id.value ),
	 astutils.J2SString( locid, id.value ) ) ];
      let accessors = [];

      const lparen = this.consumeToken( this.LPAREN );
	 
      if( this.peekToken().type !== this.RPAREN ) {
	 const ll = lparen.location;
	 const { init: val, accessors: axs } = parseValueApply.call( this, ll );
	 const rparen = this.consumeToken( this.RPAREN );

	 inits.push( val );
	 accessors = axs;
      } else {
	 this.consumeAny();
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

   if( nodes.length === 1 ) {
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
   return parseEmitSustain.call( this, token, "EMIT" );
}

/*---------------------------------------------------------------------*/
/*    parseSustain ...                                                 */
/*    -------------------------------------------------------------    */
/*    stmt ::= ...                                                     */
/*       | SUSTAIN emitsig, ...                                        */
/*---------------------------------------------------------------------*/
function parseSustain( token ) {
   return parseEmitSustain.call( this, token, "SUSTAIN" );
}

/*---------------------------------------------------------------------*/
/*    parseAwait ...                                                   */
/*    -------------------------------------------------------------    */
/*    stmt ::= ...                                                     */
/*       | AWAIT delay                                                 */
/*---------------------------------------------------------------------*/
function parseAwait( token ) {
   const loc = token.location;
   const tag = tagInit( "await", loc );
   const { inits, accessors } = parseDelay.call( this, loc, "AWAIT", "apply" );

   return astutils.J2SCall(
      loc, hhref( loc, "AWAIT" ),
      null,
      [ astutils.J2SObjInit( loc, [ locInit( loc ), tag ].concat( inits ) ) ]
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
   const { init, accessors } = parseValueApply.call( this, loc );
   const attrs = astutils.J2SObjInit( 
      loc, [ locInit( loc ), tagInit( "if", loc ),init ] );
   this.consumeToken( this.RPAREN );
   
   const then = parseStmt.call( this, this.peekToken(), false );

   const args = [ attrs ].concat( accessors );
   args.push( then );
   
   if( this.peekToken().type === this.ELSE ) {
      const loce = this.consumeAny().location;
      args.push( parseStmt.call( this, this.peekToken(), false ) );
   }

   return astutils.J2SCall( loc, hhref( loc, "IF" ), null, args );
}

/*---------------------------------------------------------------------*/
/*    parseAbortWeakabort ...                                          */
/*    stmt ::= ...                                                     */
/*       | ABORT( delay ) block                                        */
/*       | WEAKABORT( delay ) block                                    */
/*---------------------------------------------------------------------*/
function parseAbortWeakabort( token, command ) {
   const loc = token.location;
   const tag = tagInit( command.toLowerCase(), loc );
   this.consumeToken( this.LPAREN );
   const { inits, accessors } = parseDelay.call( this, loc, tag, "apply" );
   this.consumeToken( this.RPAREN );
   const stmts = parseHHBlock.call( this );
   
   return astutils.J2SCall(
      loc, hhref( loc, command ), null,
      [ astutils.J2SObjInit( loc, [ locInit( loc ), tag ].concat( inits ) ) ]
	 .concat( accessors )
	 .concat( stmts ) );
}
   
/*---------------------------------------------------------------------*/
/*    parseAbort ...                                                   */
/*    -------------------------------------------------------------    */
function parseAbort( token ) {
   return parseAbortWeakabort.call( this, token, "ABORT" );
}
   
/*---------------------------------------------------------------------*/
/*    parseWeakabort ...                                               */
/*---------------------------------------------------------------------*/
function parseWeakabort( token ) {
   return parseAbortWeakabort.call( this, token, "WEAKABORT" );
}

/*---------------------------------------------------------------------*/
/*    parseSuspend ...                                                 */
/*    -------------------------------------------------------------    */
/*    stmt ::= ...                                                     */
/*       | SUSPEND( delay ) { stmt }                                   */
/*       | SUSPEND( from delay to delay [emit <Identifier>]) { stmt }  */
/*       | SUSPEND( toggle delay [emit <Identifier>]) { stmt }         */
/*                                                                     */
/*    (MS: I am not sure about the delay arguments. It looks like      */
/*    to me that immediate would be meaning less here.)                */
/*---------------------------------------------------------------------*/
function parseSuspend( token ) {

   function parseEmitwhensuspended( inits ) {
      if( isIdToken( this, this.peekToken(), "emit" ) ) {
	 const loc = this.consumeAny().location
	 const id = this.consumeToken( this.ID );

	 inits.push( 
	    astutils.J2SDataPropertyInit(
	       loc,
	       astutils.J2SString( loc, "emitwhensuspended" ),
	       astutils.J2SString( id.location, id.value ) ) )
      }
   }

   const loc = token.location;
   const tag = tagInit( "suspend", loc );

   this.consumeToken( this.LPAREN );
   let delay;
   let inits = [ locInit( loc ) ];
   let accessors = [];
   
   if( isIdToken( this, this.peekToken(), "from" ) ) {
      // SUSPEND FROM delay TO delay [whenemitsuspended] BLOCK
      const { inits: from, accessors: afrom } =
	    parseDelay.call(
	       this, this.consumeAny().location, "SUSPEND", "fromApply" );
      const tot = this.consumeAny();
      if( !isIdToken( this, tot, "to" ) ) {
	 throw error.SyntaxError( "SUSPEND: unexpected token `" + tot.value + "'",
				  tokenLocation( tot ) );
      }

      const { inits: to, accessors: ato } =
	    parseDelay.call( this, tot.location, "SUSPEND", "toApply" );

      parseEmitwhensuspended.call( this, inits );
      
      inits = inits.concat( from );
      inits = inits.concat( to );
      accessors = afrom.concat( ato );
      accessors = [ astutils.J2SArray( loc, afrom ),
		    astutils.J2SArray( loc, ato ) ];
   } else if( isIdToken( this, this.peekToken(), "toggle" ) ) {
      // SUSPEND TOGGLE delay [whenemitsuspended] BLOCK
      const tot = this.consumeAny();
      const { inits: toggle, accessors: atoggle } =
	    parseDelay.call( this, tot.location, "SUSPEND", "toggleApply", "toggleSignal" );
      
      parseEmitwhensuspended.call( this, inits );

      inits = inits.concat( toggle );
      accessors = atoggle;
   } else {
      // SUSPEND delay BLOCK
      const { inits: is, accessors: aexpr } =
	    parseDelay.call( this, loc, "SUSPEND", "apply" );

      inits = inits.concat( is );
      accessors = aexpr;
   }
   this.consumeToken( this.RPAREN );
   const stmts = parseHHBlock.call( this );

   const attrs = astutils.J2SObjInit( loc, inits, tag );
   return astutils.J2SCall(
      loc, hhref( loc, "SUSPEND" ), null,
      [ attrs ].concat( accessors, stmts ) );
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
/*    parseEvery ...                                                   */
/*    -------------------------------------------------------------    */
/*    stmt ::= ...                                                     */
/*       | every ( delay ) block                                       */
/*---------------------------------------------------------------------*/
function parseEvery( token ) {
   const loc = token.location;
   const tag = tagInit( "every", loc );

   this.consumeToken( this.LPAREN );
   const { inits, accessors } = parseDelay.call( this, loc, "while" );
   this.consumeToken( this.RPAREN );

   const stmts = parseHHBlock.call( this );
   const attrs = astutils.J2SObjInit(
      loc, [ locInit( loc ), tag ].concat( inits ) );
   
   return astutils.J2SCall( loc, hhref( loc, "EVERY" ), 
			    null,
			    [ attrs ].concat( accessors, stmts ) );
}

/*---------------------------------------------------------------------*/
/*    parseLoopeach ...                                                */
/*    -------------------------------------------------------------    */
/*    stmt ::= ...                                                     */
/*       | do block every ( delay )                                    */
/*---------------------------------------------------------------------*/
function parseLoopeach( token ) {
   const loc = token.location;
   const tag = tagInit( "do/every", loc );
   const stmts = parseHHBlock.call( this );

   const tok = this.consumeToken( this.ID );
   
   if( tok.value != "every" ) throw tokenValueError( tok );
      
   this.consumeToken( this.LPAREN );
   const { inits, accessors } = parseDelay.call( this, loc, "do" );
   this.consumeToken( this.RPAREN );

   const attrs = astutils.J2SObjInit(
      loc, [ locInit( loc ),tag ].concat( inits ) );
   
   return astutils.J2SCall( loc, hhref( loc, "LOOPEACH" ), 
			    null,
			    [ attrs ].concat( accessors, stmts ) );
}

/*---------------------------------------------------------------------*/
/*    parseExec ...                                                    */
/*    -------------------------------------------------------------    */
/*    stmt ::= ...                                                     */
/*       | exec [ident] block                                          */
/*           [kill block] [suspend block] [resume block]               */
/*---------------------------------------------------------------------*/
function parseExec( token ) {
   const loc = token.location;
   const tag = tagInit( "async", loc );
   let inits = [ locInit( loc ), tag ];
   
   if( this.peekToken().type === this.ID ) {
      const id = this.consumeAny();

      // check for reserved exec keywords
      if( "res susp kill".indexOf( id ) >= 0 ) {
	 throw error.SyntaxError( "async: reserved identifier `" 
				  + id.value + "'",
				  tokenLocation( id ) );
      }
      
      inits.push( astutils.J2SDataPropertyInit(
	 loc, astutils.J2SString( loc, id.value ),
	 astutils.J2SString( loc, "" ) ) );
   }
      
   const { block, accessors } = parseHHThisBlock.call( this );
   inits.push( astutils.J2SDataPropertyInit(
      loc, astutils.J2SString( loc, "apply" ),
      astutils.J2SMethod( loc, "execfun", [], block, self( loc ) ) ) );

   if( isIdToken( this, this.peekToken(), "kill" ) ) {
      this.consumeAny();
      const block = this.parseBlock();
      inits.push( astutils.J2SDataPropertyInit(
	 loc, astutils.J2SString( loc, "killApply" ),
	 astutils.J2SMethod( loc, "execkill", [], block, self( loc ) ) ) );
   }
   
   if( isIdToken( this, this.peekToken(), "suspend" ) ) {
      this.consumeAny();
      const block = this.parseBlock();
      inits.push( astutils.J2SDataPropertyInit(
	 loc, astutils.J2SString( loc, "suspApply" ),
	 astutils.J2SMethod( loc, "execsusp", [], block, self( loc ) ) ) );
   }
   
   if( isIdToken( this, this.peekToken(), "resume" ) ) {
      this.consumeAny();
      const block = this.parseBlock();
      inits.push( astutils.J2SDataPropertyInit(
	 loc, astutils.J2SString( loc, "resApply" ),
	 astutils.J2SMethod( loc, "execresume", [], block, self( loc ) ) ) );
   }
   
   const attrs = astutils.J2SObjInit( loc, inits );
   
   return astutils.J2SCall( loc, hhref( loc, "EXEC" ), null,
			    [ attrs ].concat( accessors ) );
}
   
/*---------------------------------------------------------------------*/
/*    parseRun ...                                                     */
/*    -------------------------------------------------------------    */
/*    stmt ::= ...                                                     */
/*       | run dollarexpr ( sigalias, ... )                            */
/*    dollarexpr ::= $dollar | hhexpr                                  */
/*    sigalias ::= ident | ident = ident                               */
/*---------------------------------------------------------------------*/
function parseRun( token ) {
   const loc = token.location;
   const next = this.peekToken();
   const tag = tagInit( "run", loc );
   let inits = [ locInit( loc ), tag ];
   
   const { expr: call, accessors } = parseHHRunExpression.call( this );
   
   if( !(typeof call === "J2SCall" ) ) {
      throw error.SyntaxError( "RUN: bad form", tokenLocation( token ) );
   } else {
      const module = call.fun;
      const args = call.args;
      
      switch( typeof module ) {
	 case "J2SDollar":
      	    inits.push( astutils.J2SDataPropertyInit(
	 		   loc, astutils.J2SString( loc, "module" ), 
			   module.node ) );
	    break;
	    
	 case "J2SUnresolvedRef":
      	    inits.push( astutils.J2SDataPropertyInit(
	 		   location( module.loc ), 
			   astutils.J2SString( loc, "module" ), 
			   astutils.J2SCall( loc, hhref( loc, "getModule" ),
			      null, 
			      [ astutils.J2SString( loc, module.id ),
			      	location( module.loc ) ] ) ) );
	    break;

	 default:
      	    throw error.SyntaxError( "RUN: bad module", tokenLocation( token ) );
      }

      if( typeof args === "pair" ) {
	 args.forEach( a => {
	    if( typeof a === "J2SUnresolvedRef" ) {
	       inits.push( astutils.J2SDataPropertyInit(
		  a.loc, astutils.J2SString( a.loc, a.id ),
		  astutils.J2SString( a.loc, "" ) ) );
	    } else if( (typeof a === "J2SAssig") &&
		       (typeof a.lhs === "J2SUnresolvedRef") &&
		       (typeof a.rhs === "J2SUnresolvedRef") ) {
	       inits.push( astutils.J2SDataPropertyInit(
		  a.loc, astutils.J2SString( a.loc, a.lhs.id ),
		  astutils.J2SString( a.loc, a.rhs.id ) ) );
	    } else if( typeof a === "J2SLiteralValue" && a.val === undefined  ) {
	       inits.push( astutils.J2SDataPropertyInit(
		  a.loc, astutils.J2SString( a.loc, "autocomplete" ),
		  astutils.J2SBool( a.loc, true ) ) );
	    } else {
	       let eloc;

	       try {
		  eloc = {
		     filename: a.loc.cdr.car,
		     pos: a.loc.cdr.cdr.car
		  }
	       } catch( _ ) {
		  eloc = tokenLocation( token );
	       }

	       throw error.SyntaxError( "RUN: bad argument", eloc );
	    }
	 } );
      }

      const attrs = astutils.J2SObjInit( loc, inits );
      
      return astutils.J2SCall( loc, hhref( loc, "RUN" ), null,
			       [ attrs ].concat( accessors ) );
   }
}

/*---------------------------------------------------------------------*/
/*    parseLet ...                                                     */
/*    -------------------------------------------------------------    */
/*    stmt ::= ...                                                     */
/*       | { let id [= val], ; ... }                                   */
/*---------------------------------------------------------------------*/
function parseLet( token, binder ) {
   const loc = token.location;

   function parseLetInit( loc ) {
      if( this.peekToken().type === this.EGAL ) {
	 this.consumeAny();
	 return parseHHExpression.call( this );
      } else {
	 return { expr: astutils.J2SUndefined( loc ), accessors: [] };
      }
   }
   
   function parseDecls() {
      let decls = [];
      let inits = [];

      while( true ) {
	 const t = this.consumeToken( this.ID );
	 const iloc = t.location;

	 const { expr, accessors: axs } = parseLetInit.call( this, iloc );
	 
	 const decl = astutils.J2SDecl( iloc, t.value );
	 const assig = astutils.J2SAssig( iloc, astutils.J2SRef( loc, decl ), expr );
	 const ret = astutils.J2SReturn( loc, assig );
	 const block = astutils.J2SBlock( loc, loc, [ ret ] );
	 const appl = astutils.J2SDataPropertyInit(
	    loc, 
	    astutils.J2SString( loc, "apply" ),
	    astutils.J2SMethod( loc, "atomfun", [], block, self( loc ) ) );
	 const attrs = astutils.J2SObjInit( loc, [ locInit( loc ), appl ] );
	 const init = astutils.J2SCall( iloc,
					hhref( loc, "ATOM" ), null,
					[ attrs ].concat( axs ) );
	 
	 inits.push( init );
	 decls.push( decl );
	 
	 switch( this.peekToken().type ) {
	    case this.SEMICOLON:
	       this.consumeAny();
	       return { decls, inits };
	       
	    case this.COMMA:
	       this.consumeAny();
	       break;
	       
	    default:
	       throw tokenTypeError( this.consumeAny() );
	 }
      }
   }

   const { decls, inits } = parseDecls.call( this );
   const stmts = inits.concat( parseHHBlock.call( this, false ) );
   const attrs = astutils.J2SObjInit( loc, [ locInit( loc ) ] );
   const stmt = stmts.length === 1 ? stmts[ 0 ] : astutils.J2SCall( loc, hhref( loc, "SEQUENCE" ), null, [ attrs ].concat( stmts ) );
   const ret = astutils.J2SReturn( loc, stmt );
   const vdecls = astutils.J2SVarDecls( loc, decls );
   const block = astutils.J2SBlock( loc, loc, [ vdecls, ret ] );
   const fun = astutils.J2SFun( loc, "letfun", [], block );
				
   return astutils.J2SCall( loc, fun, [ astutils.J2SUndefined( loc ) ], [] );
}

/*---------------------------------------------------------------------*/
/*    parseSignal ...                                                  */
/*    -------------------------------------------------------------    */
/*    stmt ::= ...                                                     */
/*       | { signal id [= val], ; ... }                                */
/*       | { signal implements intf, ; ... }                           */
/*---------------------------------------------------------------------*/
function parseSignal( token ) {
   const loc = token.location;

   function signal( loc, name, direction, init, accessors ) {
      const id = astutils.J2SDataPropertyInit(
	 loc,
	 astutils.J2SString( loc, "name" ),
	 astutils.J2SString( loc, name ) );
      const inits = [ id ];

      if( init ) {
	 const func = astutils.J2SMethod(
		  loc, "initfunc", [],
		  astutils.J2SBlock(
		     loc, loc,
		     [ astutils.J2SReturn( loc, init ) ] ),
	          self( loc ) );
	 const initfunc = astutils.J2SDataPropertyInit(
	    loc,
	    astutils.J2SString( loc, "init_func" ),
	    func );

	 inits.push( initfunc );
      }
      
      if( isIdToken( this, this.peekToken(), "combine" ) ) {
	 const locc = this.consumeAny().location;
	 const fun = this.parseCondExpression();

	 const combine = astutils.J2SDataPropertyInit(
	    loc,
	    astutils.J2SString( loc, "combine_func" ),
	    fun );
	 inits.push( combine );
      }

      const attrs = astutils.J2SObjInit( loc, inits );
      return astutils.J2SCall( loc, hhref( loc, "SIGNAL" ), null,
			       [ attrs ].concat( accessors ) );
   }

   function parseSiglist() {
      let args = [];

      while( true ) {
	 const t = this.consumeToken( this.ID );
	 
	 if( t.value === "implements" ) {
	    args = args.concat( parseInterfaceIntflist.call( this ) );
	 } else {
	    if( this.peekToken().type === this.EGAL ) {
	       this.consumeAny();
	       const { expr, accessors } = parseHHExpression.call( this );
	       args.push( signal.call( this, t.location, t.value, "INOUT", expr, accessors ) );
	    } else {
	       args.push( signal.call( this, t.location, t.value, "INOUT", false, [] ) );
	    }
	 }
	 switch( this.peekToken().type ) {
	    case this.SEMICOLON:
	       this.consumeAny();
	       return args;
	       
	    case this.COMMA:
	       this.consumeAny();
	       break;
	       
	    default:
	       throw tokenTypeError( this.consumeAny() );
	 }
      }
   }

   const tag = tagInit( "signal", loc );
   const attrs = astutils.J2SObjInit( loc, [ locInit( loc ), tag ] );
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
   const block = parseStmt.call( this, this.peekToken, false );
   const loc = token.location;
   const attrs = astutils.J2SObjInit(
      loc,
      [ astutils.J2SDataPropertyInit(
	 loc,
	 astutils.J2SString( loc, token.value ),
	 astutils.J2SString( loc, token.value ) ),
	locInit( loc ), tagInit( token.value, loc ) ] );
   
   return astutils.J2SCall( loc, hhref( loc, "TRAP" ), 
			    null,
			    [ attrs ].concat( [ block ] ) );
}

/*---------------------------------------------------------------------*/
/*    parseStmt ...                                                    */
/*---------------------------------------------------------------------*/
function parseStmt( token, declaration ) {
   const next = this.consumeAny();

   switch( next.type ) {
      case this.ID:
	 switch( next.value ) {
	    case "hop":
	       return parseAtom.call( this, next );
	    case "module":
	      return parseMachineModule.call( this, next, declaration, "MODULE" );
	    case "halt":
	       return parseHalt.call( this, next );
	    case "fork":
	       return parseFork.call( this, next );
	    case "emit":
	       return parseEmit.call( this, next );
	    case "sustain":
	       return parseSustain.call( this, next );
	    case "abort":
	       return parseAbort.call( this, next );
	    case "weakabort":
	       return parseWeakabort.call( this, next );
	    case "suspend":
	       return parseSuspend.call( this, next );
	    case "loop":
	       return parseLoop.call( this, next );
	    case "every":
	       return parseEvery.call( this, next );
	    case "async":
	       return parseExec.call( this, next );
	    case "run":
	       return parseRun.call( this, next );
	       
	    default:
	       if( this.peekToken().type === this.COLUMN ) {
		  return parseTrap.call( this, next );
	       } else {
		  throw tokenValueError( next );
	       }
	 }
	 
      case this.do:
	 return parseLoopeach.call( this, next );
	 
      case this.if:
	 return parseIf.call( this, next );
	 
      case this.break:
	 return parseExit.call( this, next );
	 
      case this.yield:
	 return parsePause.call( this, next );
	 
      case this.await:
	 return parseAwait.call( this, next );
	 
      case this.DOLLAR: {
	    const expr = this.parseExpression();
	    this.consumeToken( this.RBRACE );
	    return expr;
	 }

      case this.LBRACE:
	 return parseSequence.call( this, next, "sequence", false );

      default:
	 throw tokenTypeError( this.consumeAny() );
   }
}

/*---------------------------------------------------------------------*/
/*    parseHiphop ...                                                  */
/*---------------------------------------------------------------------*/
function parseHiphop( token, declaration ) {
   
   function wrapVarDecl( val ) {
      if( val instanceof ast.J2SVarDecls ) {
	 return hhwrapDecl( token, val );
      } else {
	 return hhwrapExpr( token, val );
      }
   }
   
   const next = this.peekToken();

   if( next.type === this.ID && next.value === "machine" ) {
      this.consumeAny();
      return wrapVarDecl( parseMachineModule.call( this, next, declaration, "MACHINE" ) );
   } else if( next.type === this.ID && next.value === "module" ) {
      this.consumeAny();
      return wrapVarDecl( parseMachineModule.call( this, next, declaration, "MODULE" ) );
   } else if( next.type === this.ID && next.value === "interface" ) {
      this.consumeAny();
      return wrapVarDecl( parseInterface.call( this, next, declaration ) );
   } else {
      return hhwrapExpr( token, parseStmt.call( this, token, declaration  ) );
   }
}

/*---------------------------------------------------------------------*/
/*    exports                                                          */
/*---------------------------------------------------------------------*/
parser.addPlugin( "hiphop", parseHiphop );

exports.parser = parser;
exports.parse = parser.parse.bind( parser );
