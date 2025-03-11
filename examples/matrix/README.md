HipHop example: matrix animation
================================

This example illustrates how to combine HipHop and Hop to build
reactive web applications. This one implements an interfactive program
that follows mouse moves.


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
node --no-warnings --enable-source-maps --loader ./node_modules/@hop/hopc/node/hop-loader.mjs ./matrix.hop.mjs
```

  2. Browse the client side at the URL [http://localhost:8888/matrix].
