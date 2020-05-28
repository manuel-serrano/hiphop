${ var doc = require("hopdoc") }

HipHop.js: Synchronous Multitier JavaScript Reactive Programming
----------------------------------------------------------------

__HipHop.js__ is an [Hop.js](http://hop.inria.fr) DLS for
orchestrating web applications. HipHop.js helps programming 
and maintaining Web applications where the orchestration of
asynchronous tasks is complex. 

HipHop.js adds synchronous concurrency and preemption to
JavaScript. Inspired from Esterel, it simplifies the programming of
non-trivial temporal behaviors as found in complex web interfaces or
IoT controllers and the cooperation between synchronous and
asynchronous activities. HipHop.js is compiled into plain sequential
JavaScript and executes on unmodified runtime environments.


### Example 1

Here is a seminal example of synchronous programming languages. This
program simulates a machine that has three input buttons. It waits for
buttons `A` and `B` to be clicked before emitting the signal `O`. The
machine is reset when button `R` is pressed, whatever its current
state.

```hiphop
${ doc.include( "abro-gui.hh.js" ) }
```

### Example 2, Android

HipHop.js can be used on fullfledged computers such as desktops and
laptops. It can also be used on Android devices. The second example
binds on-device events inside a HipHop.js reactive machine to
automatically answer SMS messages still answered after a user defined
delay has expired.

```hiphop
${ doc.include( "../examples/hhdroid/hhdroid.js" ) }
```

