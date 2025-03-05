${ var path = require( "path" ); }
${ var config = require( hop.config ); }
${ var docxml = require( require( hop.config ).docDir + "/xml.js" ); }

${<footer>
    <div class="container">
       <div class="copyright col-md-4 copyright-left">
          &copy; ${docxml.copyrightYears(2006)}
	      <a href="https://github.com/manuel-serrano">Manuel Serrano</a>
       </div>
	   <div class="copyright col-md-6 copyright-middle"></div>
	   <div class="copyright copyright-right col-md-2">
	   </div>
     </div>
   </footer>}
