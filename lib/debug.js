/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/lib/debug.js                  */
/*    -------------------------------------------------------------    */
/*    Author      :  Manuel Serrano                                    */
/*    Creation    :  Wed Jul 17 19:28:54 2019                          */
/*    Last change :  Fri Sep  3 17:21:44 2021 (serrano)                */
/*    Copyright   :  2019-21 Manuel Serrano                            */
/*    -------------------------------------------------------------    */
/*    HipHop debugging facilities                                      */
/*=====================================================================*/
"use hopscript";

/*---------------------------------------------------------------------*/
/*    The package                                                      */
/*---------------------------------------------------------------------*/
const hh = require( "hiphop" );
const fontifier = require( hop.fontifier );

/*---------------------------------------------------------------------*/
/*    debugCycles ...                                                  */
/*---------------------------------------------------------------------*/
service debugCycles( o ) {
   const dir = o.dir || process.cwd();
   const path = o.path ||  dir + hh.CAUSALITY_JSON;
   
   try { 
      const components = require( path ).map( component );
      
      return <html>
	${components.map( component => {
		return <div>
		  ${component.map( component )}
		</div>;
	     } )}
      </html>
   } catch( e ) {
      return <html>
	Cannot find json file ${path}
      </html>
   }
}

/*---------------------------------------------------------------------*/
/*    component ...                                                    */
/*---------------------------------------------------------------------*/
function component( filelocs ) {
   return [ fileSource( filelocs.filename ),
     	    locationStyle( filelocs.locations ) ];
}

/*---------------------------------------------------------------------*/
/*    fileSource ...                                                   */
/*---------------------------------------------------------------------*/
function fileSource(path) {
   const ip = #:open-input-file( #:js-tostring( path, #:%this ) );
   
   if( !ip ) {
      throw new Error( 'Cannot find file "' + path + '"' );
   }

   try {
      return <pre><code class="fontifier-prog">${fontifier.javascript( ip, 1, undefined )}</code></pre>
   } finally {
      #:close-input-port( ip );
   }
}

/*---------------------------------------------------------------------*/
/*    locationStyle ...                                                */
/*---------------------------------------------------------------------*/
function locationStyle( locs ) {
   const head = <style type="text/css">
     ${locs.map( id => `[data-charpos="${id}"] { background-color: #f00 }` )}
   </style>;

   return <script>document.head.appendChild( ${head} );</script>;
}


   
