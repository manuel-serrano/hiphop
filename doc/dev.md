${ var doc = require("hopdoc") }

HipHop Environment
==================

Running HipHop programs
-----------------------

In this section we assume the file `abro.hh.js` defined as:

${ <span class="label label-info">abro.hh.js</span> }
```hiphop
"use hiphop"
"use hopscript"

hiphop machine prg( in A, in B, in R, out O = 0 ) {
   do {
      fork {
	 await( A.now );
      } par {
	 await( B.now );
      }
      emit O( O.preval + 1 );
   } every( R.now )
}

module.exports = prg;
```

### Hop server ###

HipHop programs can be executed _as is_ in a running Hop server. HipHop
modules can be required as any regular modules. Example:

${ <span class="label label-info">hop.js</span> }
```hopscript
const mach = require( "./abro.hh.js" );

mach.addEventListener( "O", e => console.log( e.nowval ) );

mach.react();
mach.react( { A: undefined } );
mach.react( { B: undefined } );
mach.react( { B: undefined } );
mach.react( { R: undefined } );
mach.react( { A: undefined, B: undefined } );
mach.react();
```

This program can be executed with:

```shell
hop --no-server hop.js
```

### Web browsers ###

To run HipHop programs on Web browsers, the web must include both 
the HipHop library and the HipHop programs. Example:

${ <span class="label label-info">hop-client.js</span> }
```hopscript
service abro() {
   return <html>
     <head>
       <script src="hiphop" lang="hopscript"/>
       <script src=${require.resolve( "./abro.hh.js" )} lang="hiphop"/>
       <script defer>
	 const mach = require( "./abro.hh.js" );
	 mach.addEventListener( "O", e => alert( e.nowval ) );
       </script>
     </head>
     <body>
       <button onclick=~{mach.react( "A" )}>A</button>
       <button onclick=~{mach.react( "B" )}>B</button>
       <button onclick=~{mach.react( "R" )}>R</button>
     </body>
   </html>
}
```

${<span class="label label-primary">Note:</span>} Both the `script` tag
and the `require` expression are necessary. The `script` tells the Web browser
to request the compiled HipHop source from the Hop server. The second, 
is used within the Web environment to create the reactive machine and to
make it accessible to the rest of the application.


### Nodejs ###

${<span class="label label-warning">Note:</span>} HipHop programs can 
be executed inside unmodified Nodejs environment but for that they have to 
be compiled first. This compilation **requires** an operational Hop 
installation.

Before executing HipHop programs within Nodejs, the package has to be
compiled and installed first with:

```shell
./configure && make nodejs && make install-nodejs
```

Then, each HipHop programs has to be compiled with the `hhc` compiler
that is shipped with the `HipHop` package. Considering the file `abro.hh.js`
defined above, it can be compiled with:

```shell
~/.node_modules/hiphop/bin/hhc.sh abro.hh.js -o abro.js
```

After the compilation, HipHop compiled modules can be used as any
plain JavaScript module. Example:

${ <span class="label label-info">nodejs.js</span> }
```javascript
const mach = require( "./abro.js" );

mach.addEventListener( "O", e => console.log( e.nowval ) );

mach.react();
mach.react( { A: undefined } );
mach.react( { B: undefined } );
mach.react( { B: undefined } );
mach.react( { R: undefined } );
mach.react( { A: undefined, B: undefined } );
mach.react();
```

To execute it:

```shell
nodejs nodejs.js
```


Editing HipHop programs
-----------------------

The HipHop distribution comes with a dedicated Emacs package that
implements a HipHop plugin for the `hopjs.el` Emacs mode. To use is,
add the following declaration to you Emacs custom configuration

```lisp
(custom-set-variables
   ...
   (hopjs-site-lisp-extra-dir (quote ("/usr/local/share/hiphop/site-lisp"))))
```

This example assumes that HipHop has been installed in the default `/usr/local`
directory. Otherwise, adjust the path according to your configuration.

${<span class="label label-warning">Node:</span>} The `hiphop.el`
minor mode requires `hopjs.el`. It does not work with standard Emacs
JavaScript mode. The major mode `hopjs.el` is still highly experimental
and will improve in the future.

