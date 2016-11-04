${ var doc = require( "hopdoc" ) }
${ var config = require( hop.config ) }
${ var xml = require( config.docDir + "/xml.js" ) }
${ var cfg = require( "./doc.json" ) }
${ var dockerurl = cfg.urlbase + "docker.tgz" }

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
       href=${cfg.urlbase + "hiphopjs-" + cfg.version + ".tar.gz"}/>
  </div>
</div>}

#### Hiphop.js installation ####

Hiphop.js requires
[Bigloo](http://www-sop.inria.fr/members/Manuel.Serrano/bigloo/) and
[Hop.js](http://hop-dev.inria.fr/home/index.html) to works.

Move the Hiphop.js directory inside the node path, for instance, `$HOME/.node\_modules/`.

## Git ##

Hop.js can be forked at

${<a href=${cfg.github}>${cfg.github}</a>}

## Docker ##

A Dockerfile that builds a functional Hop.js runtime with Hiphop.js
installed is [availible](${dockerurl}).

Docker installation procedure:

* `wget ${dockerurl}`

* `tar xf docker.tgz`

* `cd docker; docker build -t hop .`

Then, let's consider that `$HOME/myApp` is a directory containing your
Hop.js application, and the file `main.js` the entry point,
implementing Hop.js service `myService`.

* `docker run -d -p 8080:8080 -v $HOME/myApp:/app hop /app/main.js`

* Open your browser in the host system, and go to
  `http://localhost:8080/hop/myService`.
