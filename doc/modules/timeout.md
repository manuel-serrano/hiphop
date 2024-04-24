<!-- ${ var doc = require("hopdoc") } -->

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

### Timeout ###
<!-- [:@glyphicon glyphicon-tag interface] -->

The `Timeout` interface declares the following HipHop signals:

  * `in reset`;
  * `in pause`; 
  * `out elapsed`.
  
These signals are used to control a running instance of the
`timeout` module.
  
### timeout(duration) implements Timeout ###
<!-- [:@glyphicon glyphicon-tag module] -->

A HipHop `timeout` module is an asynchronous tasks that run in the
background of the application. When it expires, it emits its signal
`elapsed`.

A `timeout` is created by running the `timeout` module passing
it a numerical value, which is the timeout in millisecond before
the signal `elapsed` is emitted. Example:

```hiphop
run timeout(2000) { e as elapsed }; // wait for two seconds before emitting `e`.
```

A timeout instance is paused by emitting its `pause` signals. It is
resumed by emitting the same signal again. When a timeout is paused,
it stops counting elapsed time.  For instance, if a timeout is spawned
to wait for 1000 ms and if it is suspended after 100ms, when resumed,
and whenever resumed, it will wait for an extra 900ms before emitting
its `elapsed` signal.

If a timeout receives its `reset` signal, it resets its internal
counter and waits again for the full duration before emiting `elapsed`.

<span class="hopscript">&#x2605;</span> Example: [timeout-mod.hh.js](../../test/timeout-mod.hh.js)
<!-- ${doc.includeCode("../../test/timeout-mod.hh.js", "hiphop")} -->


Implementation
--------------

  * JavaScript implementation: [timeout.hh.js](../../modules/timeout.hh.js)
  * TypeScript type declaration: [timeout.d.ts](../../modules/timeout.d.ts)


- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
[[main page]](../../README.md) | [[documentation]](../README.md) | [[modules]](./README.md) | [[license]](../license.md)

