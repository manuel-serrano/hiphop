${ var path = require( "path" ); }
${ var config = require( hop.config ); }
${ var docxml = require( require( hop.config ).docDir + "/xml.js" ); }
${ var ipath = path.join( config.iconsDir, "hop" ); }

${<footer>
    <div class="container">
       <div class="copyright col-md-2 copyright-left">
          &copy; ${docxml.copyrightYears( 2006 )}
	      <a href="http://www.inria.fr">Inria</a>
       </div>
	   <div class="copyright col-md-8 copyright-middle"></div>
	   <div class="copyright copyright-right col-md-2">
	     <button type="button" class="inria btn btn-danger">
           <a href="http://www.inria.fr">
             <svg:img class="inria"
		              src=${path.join( ipath, "inria.svg" )}
		              height="1.6ex" width="4em"/>
           </a>
	     </button>
	   </div>
     </div>
   </footer>}
