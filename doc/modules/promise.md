<!-- ${ var doc = require("hopdoc") } -->

Standard Module: promise
========================

To use the `promise` module and the `Promise` interface in a HipHop program,
import the JavaScript module with:

```javascript
import { promise, Promise } from "@hop/hiphop/modules/promise.js";
```

The `promise` HipHop module maps JavaScript promises to
HipHop signals. It enables to spawn a JavaScript promise which
upon resolution or rejection emits a HipHop signal.

### Promise ###
<!-- [:@glyphicon glyphicon-tag interface] -->

The `Promise` interface declares the following HipHop signals:

  * `out value`, whether it resolves or rejects, a `Promise` HipHop
  module emits a single signal. That signal is an object with two
  attributes: `{res: resolution-value, rej: rejection-value}`.
  
### promise(duration) implements Promise ###
<!-- [:@glyphicon glyphicon-tag module] -->

A HipHop `promise` module is an asynchronous tasks that run in the
background of the application. When it resolves or rejects, it emits
its signal `value`. Example:

```hiphop
// emits v with the value { resolve: "yep", reject: false }
run promise(new Promise((res, rej) => res("yep")))) { v as value }; 
```

<span class="hopscript">&#x2605;</span> Example: [promise-mod.hh.js](../../test/promise-mod.hh.js)
<!-- ${doc.includeCode("../../test/promise-mod.hh.js", "hiphop")} -->


Implementation
--------------

  * JavaScript implementation: [promise.hh.js](../../modules/promise.hh.js)
  * TypeScript type declaration: [promise.d.ts](../../modules/promise.d.ts)


- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
[[main page]](../../README.md) | [[documentation]](../README.md) | [[modules]](./README.md) | [[license]](../license.md)

