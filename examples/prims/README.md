HipHop example: animated prims numbers
======================================

This example illustrates how to combine HipHop and Hop to build
reactive web applications. This one implements a Sieve of Eratosthenes.

Installation
------------

This example uses HipHop and Hop. Both must be installed:

```
npm install
```

Run
---

  1. Spawn the server side

```
node --no-warnings --enable-source-maps --loader ./node_modules/@hop/hopc/node/hop-loader.mjs ./prims.hop.mjs
```

  2. Browse the client side at the URL [http://localhost:8888/prims].


Files
-----

  * `client.hh.js`: the client side HipHop implementation of the example.
  * `prims.hop.mjs`: the server side of the program. Mainly used to create
  the web page into which the client-side HipHop program executes.
  * `prims.hss`: some CSS styling.
  * `package.json`: description for NPM.
  * `README.md`, this file
