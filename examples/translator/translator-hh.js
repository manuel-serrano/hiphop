/*=====================================================================*/
/*    .../hiphop/hiphop/examples/translator/translator-hh.js           */
/*    -------------------------------------------------------------    */
/*    Author      :  Manuel Serrano                                    */
/*    Creation    :  Thu Aug  2 01:01:22 2018                          */
/*    Last change :  Fri Sep 14 08:30:18 2018 (serrano)                */
/*    Copyright   :  2018 Manuel Serrano                               */
/*    -------------------------------------------------------------    */
/*    translator demo, client and hiphop parts.                        */
/*=====================================================================*/
"use hiphop";
"use hopscript";

/*---------------------------------------------------------------------*/
/*    import                                                           */
/*---------------------------------------------------------------------*/
const hh = require( "hiphop" );

/*---------------------------------------------------------------------*/
/*    constant                                                         */
/*---------------------------------------------------------------------*/
const mymemory = "http://mymemory.translated.net/api/get";

/*---------------------------------------------------------------------*/
/*    translate                                                        */
/*    -------------------------------------------------------------    */
/*    For the sake of the example, this demo does not use builtin      */
/*    Hop services. It uses plain xmlhttprequests instead.             */
/*---------------------------------------------------------------------*/
function translate( langPair, text ) {
   var req = new XMLHttpRequest();
   var svc = mymemory + "?langpair=" + langPair + "&q=" + text;

   return new Promise( (resolve, reject) => {
      req.onreadystatechange = () => {
	 if( req.readyState === 4 ) {
	    if( req.status === 200 ) {
	       const txt = JSON.parse( req.responseText )
		     .responseData
		     .translatedText;

	       // mymemory sometime returns "&" instead of the translation
	       if( txt != "&" ) {
		  resolve( txt );
	       } else {
		  reject( txt );
	       }
	    } else {
	       reject( txt );
	    }
	 }
      };
      req.open( "GET", svc, true );
      req.send();
   });
}

/*---------------------------------------------------------------------*/
/*    execColor ...                                                    */
/*---------------------------------------------------------------------*/
function execColor( langPair ) {
   return hiphop module( in text, out color, out trans, out error ) {
      let result;
      emit color( "red" );

      await immediate( now( text ) );
      
      async result {
	 this.notifyAndReact( translate( langPair, nowval( text ) ) );
      }

      if( nowval( result ).resolve ) {
	 emit trans( nowval( result ).val );
	 emit color( "green" );
      } else {
	 emit color( "orange" );
      }
   }
}

/*---------------------------------------------------------------------*/
/*    trans ...                                                        */
/*---------------------------------------------------------------------*/
hiphop module trans( in text,
		     out transEn, out colorEn,
		     out transNe, out colorNe,
		     out transEs, out colorEs,
		     out transSe, out colorSe ) {
   for( now( text ) ) {
      fork {
	 run execColor( "fr|en" )( color=colorEn, trans=transEn );
      } par {
	 run execColor( "en|fr" )( color=colorNe, text=transEn, trans=transNe );
      } par {
	 run execColor( "fr|es" )( color=colorEs, trans=transEs );
      } par {
	 run execColor( "es|fr" )( color=colorSe, text=transEs, trans=transSe );
      }
   }
}


module.exports =
//   new hh.ReactiveMachine( trans, { debuggerName: "debug", sweep: false } );
   new hh.ReactiveMachine( trans );
