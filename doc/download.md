<!-- ${ var doc = require( "@hop/hopdoc" ) }
${ var config = require( hop.config ) }
${ var xml = require( config.docDir + "/xml.js" ) }
${ var cfg = require( "./doc.json" ) }
${ var dockerurl = cfg.urlbase + "docker.tgz" }
${ const pkg = require( "../package.json" ) } -->

Getting HipHop.js
=================

NPM Installation
----------------

```shell
npm install https://www-sop.inria.fr/members/Manuel.Serrano/software/npmx/hiphop.tgz
```

When HipHop is officially released, the installation procedure is:

```shell
npm install @hop/hiphop
```

To test HipHop

```shell
(cd node_modules/@hop/hiphop; npm install --save-dev; npm test)
```

To run a program:

```javascript
cat > prog.hh.js <<EOF
import { ReactiveMachine } from "@hop/hiphop";

hiphop prog() {
   host { console.log("please, wake me up..."); }
   yield;
   host { console.log("thanks!"); }
}

const m = new ReactiveMachine(prog);
m.react();
m.react();
EOF
nodejs --enable-source-maps --no-warnings --loader ./node_modules/@hop/hiphop/lib/hiphop-loader.mjs prog.hh.js
```

NPM Update
----------

Until HipHop is officially available on the NPM repository, HipHop updates
require manual operations.

  1. First, clean up NPM cache with: `npm cache clean --force`.
  2. Remove the files `package.json` and `package-lock.json` in the current
  directory *and* in the parent directories. 
  3. Remove the directories `node_modules` in the current directory 
  *and* in the parent directories.
  
> [!WARNING]
> Of course, proceed to step 2 and 3, if and only if these directories
> contain only HipHop sources. *Do not* remove any of these files and
> directories if they contain other resources!


Installing from the Sources
---------------------------

HipHop needs to be installed in a prepared directory in which its two
dependencies, `hopc` and `readlines` are already installed:

```shell
mkdir project
cd project
mkdir download
(cd download; wget https://www-sop.inria.fr/members/Manuel.Serrano/software/npmx/hopc.tgz)
(cd download; wget https://www-sop.inria.fr/members/Manuel.Serrano/software/npmx/readlines.tgz)
mkdir -p node_modules/@hop
(cd node_modules/@hop; tar xvfz ../download/hopc.tgz)
(cd node_modules/@hop; tar xvfz ../download/readlines.tgz)
```

Then, to install HipHop:

```shell
(cd download; wget https://www-sop.inria.fr/members/Manuel.Serrano/software/npmx/hiphop.tgz)
(cd node_modules/@hop; tar xvfz ../download/hiphop.tgz)
```

Installing from git
-------------------

Install the HipHop dependencies as for a [source file installation](#installing-from-the-source-files)

Then, to install HipHop:

```shell
(cd node_modules/@hop; git clone https://github.com/manuel-serrano/hiphop)
```

- - - - - - - - - - - - - - - - - - - - - - - - - - - 
[[main page]](../README.md) | [[documentation]](./README.md)  | [[license]](./license.md)

