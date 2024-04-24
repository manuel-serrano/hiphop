${ var path = require( "path" ); }
${ var config = require( hop.config ); }
${ var docxml = require( require( hop.config ).docDir + "/xml.js" ); }
${ var ipath = path.join( config.iconsDir, "hop" ); }

${<footer>
    <div class="container">
       <div class="copyright col-md-2 copyright-left">
          &copy; ${docxml.copyrightYears(2006)}
	      <a href="https://github.com/manuel-serrano">Manuel Serrano</a>
       </div>
	   <div class="copyright col-md-8 copyright-middle"></div>
	   <div class="copyright copyright-right col-md-2">
	   </div>
     </div>
   </footer>}
