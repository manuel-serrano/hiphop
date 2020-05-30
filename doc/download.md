${ var doc = require( "hopdoc" ) }
${ var config = require( hop.config ) }
${ var xml = require( config.docDir + "/xml.js" ) }
${ var cfg = require( "./doc.json" ) }
${ var dockerurl = cfg.urlbase + "docker.tgz" }
${ const pkg = require( "../package.json" ) }

## License ##

${doc.include( "./license.md" )}

## Binary distributions ##

Precompiled HipHop.js distributions are available.

### Debian/Raspberry ###

A repository is available. To use it, add the following
to your `apt` path:

```shell[:@config]
deb [trusted=yes] http://hop.inria.fr/linux/Debian buster hop
```

The Debian packages are all installed in the `/opt/hop` directory.

### Ubuntu ###

An Ubuntu repository is available. To use it, add the following
to your `apt` path:

```shell[:@config]
deb [trusted=yes] http://hop.inria.fr/linux/Ubuntu focal hop
```

The Ubuntu packages are all installed in the `/opt/hop` directory.

### Homebrew ###

Homebrew users (MacOS X), can use the pre-built version by using:

```shell[:@shell]
$ brew tap homebrew/hop https://gitlab.inria.fr/mserrano/hopbrew.git
$ brew install homebrew/hop/bigloo-latest
```

## Source code installation ##

${<div class="row">
  <div class="col-xs-8">
This is the file you should download if you want to get HipHop.js
  stable version from the sources.
  </div>
  <div class="col-xs-3">
    <xml.downloadButton
       class="success"
       title="Stable"
       icon="glyphicon-download"
       href=${cfg.urlbase + "/hiphop-" + pkg.version + ".tar.gz"}/>
  </div>
</div>}

#### Hiphop.js installation ####

Hiphop.js requires
[Bigloo](http://www-sop.inria.fr/members/Manuel.Serrano/bigloo/) and
[Hop.js](http://hop-dev.inria.fr/home/index.html) to works.

To install it:

```shell
./configure && make && sudo make install
```

You can also install it locally (without root access) with:

```shell
./configure && make && sudo make install-local
```

## Git ##

Hop.js can be forked at

${<a href=${cfg.github}>${cfg.github}</a>}

## Docker installation ##

${<div class="row">
  <div class="col-xs-8">
The recommanded way to install and run Hop is to use
<a href="https://docs.docker.com/install/">Docker</a>. The docker image
is to be built in two steps. 
  </div>
  <div class="col-xs-4">
    <xml.downloadButton
       class="primary"
       title="Stable"
       icon="glyphicon-download"
       href=${cfg.urlbase + "/hiphop-" + cfg.version + ".dockerfile"}/>
  </div>
</div>}

 1. Build the __Hop__ image following these
 [instructions](http://hop-dev.inria.fr#/home/download.html).
 2. Build the __HipHop__ image by downloading the 
`${"hop-" + cfg.version + ".dockerfile"}` script and by issuing the
following docker command: `docker build -f hop-${cfg.version}.dockerfile -t hop .`

${ <span class="label label-warning">Note:</span> } If you already
have installed Hop or HipHop within docker, you might find useful to
remove the old image first. This can be achieved with:

```shell
$ docker container prune
$ docker rmi `docker images | grep hop | awk '{print $3}'`
```

### Running the image ###

Once the docker is built, the image can be executed using the
`hop.docker` that can be found
[here](http://hop-dev.inria.fr#/home/download.html). This is
recommended on Linux and MacOS. 

The docker image can also be executed directly. Let's consider that
`$HOME/myApp` is a directory containing your Hop.js application, and
the file `main.js` the entry point, implementing Hop.js service
`myService`.

* `docker run -d -p 8080:8080 -v $HOME/myApp:/app hop /app/main.js`

* Open your browser in the host system, and go to
  `http://localhost:8080/hop/myService`.

