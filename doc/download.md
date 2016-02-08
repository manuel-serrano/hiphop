${ var doc = require( "hopdoc" ) }
${ var config = require( hop.config ) }
${ var xml = require( config.docDir + "/xml.js" ) }
${ var cfg = require( "./doc.json" ) }

## License ##

${doc.include( "./license.md" )}

## Source code ##

${<div class="row">
  <div class="col-xs-9">
This is the file you should download if you want to get HipHop.js
  stable version from the sources.
  </div>
  <div class="col-xs-3">
    <xml.downloadButton
       class="success"
       title="Stable"
       icon="glyphicon-download"
       href=${cfg.urlbase + "/hiphopjs-" + cfg.version + ".tar.gz"}/>
  </div>
</div>}

#### HipHip.js installation ####

HipHop.js requires
[Bigloo](http://www-sop.inria.fr/members/Manuel.Serrano/bigloo/) and
[Hop.js](http://hop-dev.inria.fr/home/index.html) to works.

Move the HipHop.js directory inside the node path, for instance, `$HOME/.node\_modules/`.

## Git ##

Hop.js can be forked at

${<a href=${cfg.github}>${cfg.github}</a>}
