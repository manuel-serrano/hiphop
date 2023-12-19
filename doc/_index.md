<!-- ${ var doc = require("hopdoc") } -->

HipHop.js: Synchronous Multitier JavaScript Reactive Programming
================================================================

__HipHop.js__ is a JavaScript DLS for orchestrating asynchronous
applications. It helps programming applications that require complex
orchestration tasks. Its main application domains are web applications
and IoT application. HipHop.js helps programming and maintaining Web
applications where the

HipHop.js adds synchronous concurrency and preemption to
JavaScript. Inspired from Esterel, it simplifies the programming of
non-trivial temporal behaviors as found in complex web interfaces or
IoT controllers and the cooperation between synchronous and
asynchronous activities. HipHop.js is compiled into plain sequential
JavaScript and executes on unmodified JavaScript runtime environments.

Example
-------

Here is a seminal example of synchronous programming languages. This
program simulates a machine that has three input buttons. It waits for
buttons `A` and `B` to be clicked before emitting the signal `O`. The
machine is reset when button `R` is pressed, whatever its current
state.

```javascript
// abro.hh.js
import { ReactiveMachine } from "@hop/hiphop";

const abro = hiphop module() {
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

const m = new ReactiveMachine(abro);
m.addEventListener("O", e => console.log("got: ", e));
m.react({ A: 1 });
m.react({ B: 2 });
m.react({ R: true });
m.react({ A: 3, B: 4 });
```

> [!NOTE]
> HipHop programs have to be stored in files whose names are suffixed 
> with `.hh.js`.

The statement `do`/`every` implements a loop that executes its body
each time the condition of the `every` is statisfied. The statement
`fork`/`par` spawns new computation threads. The statement `await`
blocs the execution of the current thread until the condition is
satisfied. For instance, the statement `await (A.now)` blocs the
first thread of the `fork` statement until the signal `A` is emitted.

To be executed, a HipHop program has to be loaded into a [_reactive machine_](./api.md).
This is done with the expression `new ReactiveMachine(abro)`, which creates
a new reactive machine and loads the `abro` into it.

Event listeners can be added to a reactive machine so that JavaScript
can be notified of HipHop executions. In our example, a listener
is attached to the HipHip signal `O` so that at the end of each
reactive step, also called a _reaction_, the JavaScript listener will
be invoked if during the reaction the HipHop signal `O` as been emitted.

At the first reaction, we HipHop program `abro` is executed with
the signal `A` emitted with the associated value 1. For the second
reaction, the program is sent the signal `B` with value 2. At
the third reaction the signal `R` is emitted, and finally, at
the forth reaction, both signals `A` and `B` are emitted.

- - - - - - - - - - - - - - - - - - - - - - - - - - - 
[[main page]](./README.md) | [[license]](./license.md)
