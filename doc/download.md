<!-- ${ var doc = require( "hopdoc" ) }
${ var config = require( hop.config ) }
${ var xml = require( config.docDir + "/xml.js" ) }
${ var cfg = require( "./doc.json" ) }
${ var dockerurl = cfg.urlbase + "docker.tgz" }
${ const pkg = require( "../package.json" ) } -->

## License ##

This software is released under the [Apache 2.0 license](https://apache.org/licenses/LICENSE-2.0).


## NPM installation ##

```
npm install https://www-sop.inria.fr/members/Manuel.Serrano/software/npmx/hiphop.tgz
```

When HipHop is officially released in 2024, the installation procedure is:

```
npm install @hop/hiphop
```

To run a program:

```
nodejs --enable-source-maps --no-warnings --loader ./node_modules/@hop/hiphop/lib/hiphop-loader.mjs prog.hh.js
```
