HipHop: Reactive Web programming
================================

[![Travis](https://api.travis-ci.com/manuel-serrano/hiphop.svg)](https://travis-ci.com/manuel-serrano/hiphop/builds)

__Hiphop.js__ is JavaScript DSL for easing the programming of asynchronous
applications. It executes on unmodified JavaScript engines, let them run
on server-side or client-side. 

See [HipHop.js](http://hop.inria.fr/hiphop) for a complete documentation.

Installation
------------

The HipHop.js installation depends on the JavaScript host 
(see Installation chapter). The easiest way to install it is when using 
`npm`. For that system, the installation is:

Until HipHop reaches a stable state (which is expected to happen in January
2024), use the following to install it.

```
npm install https://http://www-sop.inria.fr/members/Manuel.Serrano/sotfware/npmx/hop.tgz https://http://www-sop.inria.fr/members/Manuel.Serrano/sotfware/npmx/hopc.tgz https://http://www-sop.inria.fr/members/Manuel.Serrano/sotfware/npmx/readlines.tgz https://http://www-sop.inria.fr/members/Manuel.Serrano/sotfware/npmx/hiphop.tgz
```

When HipHop is officially released in 2024, the installation procedure is:

```
npm install hiphop
```

Getting started
---------------

The tutorial chapter presents a complete HipHop.js example. Here we
merely show how to execute the `hello world` HipHop.js program,
assuming a Node.js/NPM installation. Let us consider that program
stored in a file named `hello.hh.js`, `.hh.js` being the suffix of
HipHop source files. This program waits for two events `A` and `B`
to be received. It then emits itself the event `O`. Each time the
`R` event is received, the program returns to its initial state.

```javascript
import { ReactiveMachine } from "@hop/hiphop";

const HelloWorld = hiphop module() {
   in A, in B, in R;
   out O;
   do {
      fork {
         await (A.now);
      } par {
         await (B.now);
      }
      emit O();
   } every (R.now)
}

const m = new ReactiveMachine(prg, "ABRO");
m.addEventListener("O", e => console.log("got: ", e));
m.react({ A: 1 }, { B: 2 }, { R: true }, { A: 3, B: 4 });
```

This program uses the HipHop.js syntactic extension (marked by the
`hiphop` keyword). These syntactic extensions have to be compiled down
to plain JavaScript before being executed. This compilation can be
executed in two ways. 

  1. The easiest way: just asks Nodejs to compile the file on the file. For 
  that, simply invokes Node.js as follows:
  
```
nodejs --enable-source-maps --no-warnings --experimental-loader ./node_modules/@hop/hiphoplib/hiphop-hook.mjs hello.hh.js
```

Alternatively, this can be decomposed using the shell variable environment
`NODE_OPTIONS`:

```
export NODE_OPTIONS="--enable-source-maps --no-warnings --experimental-loader ./node_modules/@hop/hiphoplib/hiphop-hook.mjs"
nodejs hello.hh.js
```

   On future versions of Nodejs, the option `--experimental-loader` is likely
   to be renamed. Please check your setting for accomodating the future new
   name.
   
   With this method, the program `hello.hh.js` will first be silently compiled
   into a `._hello.mjs` and `._hello.mjs.map` files. These are the files
   that Nodejs will use for executing.
   
   2. The explict way: the file `hello.hh.js` can be compiled in advance and
   Node.js can be feed with the result of the compilation.
   
```
nodejs node_module/@hop/hiphop/bin/hhc.mjs hello.hh.js -o hello.mjs
nodejs --enable-source-maps hello.mjs
```

   This the most reliable way as it depends on no experimental Nodejs feature.
   
The two methods produce equivalent results.



