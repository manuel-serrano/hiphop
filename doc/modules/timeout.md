<!-- ${ var doc = require( "hopdoc" ) }
${ var path = require( "path" ) }
${ var ROOT = path.dirname( module.filename ) } -->

Standard Module: timeout
========================

To use the `timeout` module and the `Timeout` interface in a HipHop program,
import the JavaScript module with:

```javascript
import { timeout, Timeout } from "@hop/hiphop/modules/timeout.js";
```

The `timeout` HipHop module implements asynchronous timeouts that are
controlled by Hiphop programs. Once started, a timeout can be
paused, reset, or aborted. When the timeout expires, it emits
a signal to notify the other components of the HipHop program.

### interface Timeout ###
<!-- [:@glyphicon glyphicon-tag interface] -->

The `Timeout` interface declares the following HipHop signals:

  * `in reset`;
  * `in pause`; 
  * `out elapsed`.
  
These signals are used to control a running instance of the
`timeout` module.
  
### module timeout(duration) implements Timeout ###
<!-- [:@glyphicon glyphicon-tag module] -->

&#x2605; Example: [timeout.hh.js](../test/timeout-mod.hh.js)


Implementation
--------------

  * JavaScript implementation: [timeout.hh.js](../modules/timeout.hh.js)
  * TypeScript type declaration: [timeout.d.ts](../modules/timeout.d.ts)


- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
[[main page]](../../README.md) | [[documentation]](../README.md) | [[modules]](./README.md) | [[license]](../license.md)

