HipHop example: multiple parallel translators
=============================================

This example illustrates how to combine HipHop and Hop to build
reactive web applications. This one implements a multipple-direction
translator.

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
node --no-warnings --enable-source-maps --loader ./node_modules/@hop/hop/lib/hop-loader.mjs --loader ./node_modules/@hop/hiphop/lib/hiphop-loader.mjs ./translator.hop.js
```

  2. Browse the client side at the URL [http://localhost:8888/translator].
