${ var doc = require("hopdoc") }

HipHop.js: Synchronous Multitier JavaScript Reactive Programming
----------------------------------------------------------------

__HipHop.js__ is an [Hop.js](http://hop-dev.inria.fr) DLS for
orchestrating web applications. HipHop.js helps programming 
and maintaining Web applications where the orchestration of
asynchronous tasks is complex. 

How to use it?
--------------
Pretty simple:

* Install [Hop.js](http://hop-dev.inria.fr)
* Download [Hiphop.js](ftp://ftp-sop.inria.fr/indes/fp/HipHop), and extract the tarball inside
`$HOME/.node\_modules/`

You are now ready.


Example
-------

Here is a seminal example of synchronous programming languages. This
program simulates a machine that has three input buttons. It waits for
buttons A and B to be clicked before emitting the signal "O". The
machine is reset when button "R" is pressed, whatever its current
state.

```hiphop
${ doc.include( "abro-gui.hh.js" ) }
```

