HipHop Environment
==================

Running HipHop programs 
-----------------------

In this document, we show how to run HipHop programs on a server-side
of an application, e.g., on Nodejs, or on the client-side of a web
application. To prepare a directory for running these examples, one
may proceed as follows:

```shell
mkdir example
cd example
npm install https://www-sop.inria.fr/members/Manuel.Serrano/software/npmx/hiphop.tgz
```

In the rest of this section we assume the file `abro.hh.js` defined as:

<span class="label label-info">abro.hh.mjs</span>

```hiphop
import { ReactiveMachine } from "@hop/hiphop";

const prg = hiphop module() {
   in A;
   in B;
   in R;
   out O = 0;
   
   do {
      fork {
	 await (A.now);
      } par {
	 await (B.now);
      }
      emit O(O.preval + 1);
   } every (R.now)
}

export const mach = new ReactiveMachine(prg);
```

### Server-side execution ###

To execute a HipHop program on an unmodified JavaScript execution engines,
let it be Nodejs, Hop, or any other compliant engine, it has to be
compiled first. This is accomplished by the `hhc.mjs` compiler that
is part of the standard HipHop distribution. To compile our `abro.hh.js`
example, one has to use the following command:

```shell
./node_module/@hop/hiphop/bin/hhc.mjs abro.hh.mjs -o abro.mjs
```

This will generate two files:

  * `abro.mjs`, which a standard JavaScript ES6 module.
  * `abro.map.json`, which is a _source map_ file that will let the
  native JavaScript engine refer to source location inside `abro.hh.js`
  instead of `abro.mjs`.

Once, compiled, the program can be imported by any regular ES6 module
and executed using the HipHop API. Example:

${ <span class="label label-info">hello.mjs</span> }
```hopscript
import { mach } from "./abro.mjs";

mach.addEventListener("O", e => console.log(e.nowval));

mach.react();
mach.react({ A: undefined });
mach.react({ B: undefined });
mach.react({ B: undefined });
mach.react({ R: undefined });
mach.react({ A: undefined, B: undefined });
mach.react();
```

This program can be executed with:

```shell
nodejs --enable-source-maps hello.mjs 
```

### Client-side execution ###

HipHop can be used on the client-side of web applications. Let us
illustrate this feature with an web app executing the `abro.hh.mjs` 
reactive program on a web browser. Let's implement a minimal web
server using the bare Node.js `http` api (this complete example
can be found in the [example/web](https://github.com/manuel-serrano/hiphop/tree/master/examples/web) directory of the HipHop distribution).

<span class="label label-info">server.mjs</span>

```javascript
import { createServer } from "node:http";
import { readFileSync, readdirSync } from "node:fs";

const host = "localhost";
const port = 8888;

const contents = {
   "/abro.mjs": readFileSync("./abro.mjs"),
   "/": readFileSync("./index.html"),
   "/hiphop.mjs": readFileSync("./node_modules/@hop/hiphop/hiphop-client.mjs")
}

for (let file of readdirSync("./node_modules/@hop/hiphop/lib")) {
   if (file.match(/\.m?js$/)) {
      contents["/lib/" + file] = readFileSync("./node_modules/@hop/hiphop/lib/" + file);
   }
}

const handler = function(req, res) {
   const content = contents[req.url];

   if (content) {
      if (req.url.match(/\.m?js$/)) {
	 res.setHeader("Content-Type", "text/javascript");
      } else {
	 res.setHeader("Content-Type", "text/html");
      }

      res.writeHead(200);
      res.end(content);
   } else {
      res.writeHead(404);
      res.end("no such file");
   }
}

const server = createServer(handler);
server.listen(port, host, () => {
    console.log(`Server is running on http://${host}:${port}`);
});
```
<span class="label label-info">index.html</span>

```html
<html>
  <script type="importmap">
    {
       "imports": {
          "@hop/hiphop": "/hiphop.mjs"
        }
    }
  </script>
  <script type="module">
    import { mach } from "./abro.mjs";
    globalThis.mach = mach;
    mach.addEventListener("O", (evt) => {
       document.getElementById("console").innerHTML = evt.nowval;
    });
  </script>
  <div>
    <button onclick="mach.react({A: 1})">A</button>
    <button onclick="mach.react({B: 1})">B</button>
    <button onclick="mach.react({R: 1})">R</button>
  </div>
  <div id="console">-</div>
</html>
```


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


Visualizing the Net List
------------------------

The HipHop compiler generates a net list from a HipHop source. This compiled
program can be executed by simulating the generated circuit. The tools
`tools/nets2dot.mjs` can be used in conjunction with the 
[dot](https://graphviz.org) graph visualizer to generate PDF files.
Here is how to proceed for generating these files, considering a HipHop
source file named `foo.hh.js`:

  1. Add the option `{ dumpNets: true }` to the reactive machine for 
  which you want to dump the net list.
  2. Run your program. This will generate two files: `foo.hh.js.nets-.json`
  and `foo.hh.js.nets+.json`. The former is the net list before optimization
  the latter with optimization.
  3. Generate the `.dot` files:
    - bin/nets2dot.js foo.hh.js.nets-.json > nets-.dot
    - bin/nets2dot.js foo.hh.js.nets+.json > nets+.dot
  4. Generate the PDF files:
    - dot -T pdf nets-.dot > nets-.pdf
    - dot -T pdf nets+.dot > nets+.pdf
