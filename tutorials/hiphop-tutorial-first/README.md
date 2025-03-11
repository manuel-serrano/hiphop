HipHop Tutorial #1: first steps
===============================

Duration: 120 minutes
HipHop website: http://www-sop.inria.fr/members/Manuel.Serrano/hiphop/
Github: https://github.com/manuel-serrano/hiphop

All the solutions to the assignments can be found on the github repository.


Prerequisite
------------
Install nodejs and then install HipHop

```
npm install https://www-sop.inria.fr/members/Manuel.Serrano/software/npmx/hiphop.tgz
```

Prog 0 - global signals, loop, sequence, and pause
--------------------------------------------------

HipHop programs must be suffixed `.hh.mjs`. Let's write our first HipHop
program:

```javascript
// prog0.hh.mjs
import * as hh from "@hop/hiphop"; // import the HipHop library

const prog0 = hiphop module() {    // the HipHop program
	inout I, O;                    // two input/output signals
	
	loop {                         // an infinite loop 
	   if (I.now) {                // test if I is present
	     emit O(I.nowval);         // if it is emit O with the value of I
	   }
	   yield;                      // all loop _must_ contain a yield stmt
    }
}

const m = new hh.ReactiveMachine(prog0); // create the reactive machine

m.addEventListener("O", v => console.log(v)); // a listener to see O events

m.react();           // invoke the machine without any signal
m.react({I: 1});     // invoke the machine with I=1
m.react({I: 2});     // invoke the machine with I=2
m.react({I: 3});     // invoke the machine with I=3 ...
```

Let us compile this program:

```shell
node_modules/@hop/hiphop/bin/hhc.mjs prog0.hh.mjs > prog0.mjs
```

Let us runit!

```shell
node prog0.mjs
```

If we want to have something nicer, let us install a JS pretty-printer:

```shell
npm install js-beautify 
```

and re-compile again:

```shell
node_modules/@hop/hiphop/bin/hhc.mjs prog0.hh.mjs | node_modules/js-beautify/js/bin/js-beautify.js > prog0.mjs
```

New versions of Nodejs implements _loaders_, which are routines to be executed
before loading a program. We can use this facility to compile HipHop programs
on the fly (we'll use that feature for the rest of this tutorial):

```shell
node --enable-source-maps --no-warnings --loader $PWD/node_modules/@hop/hiphop/lib/hiphop-loader.mjs prog0.mjs
```

As you can see, in addition to executing your program, this as generated
the file prog0.mjs, exactly as if we compiled it first.

Using node's NODE_OPTIONS variable, we can make the command lines shorter:

```shell
NODE_OPTIONS="--enable-source-maps --no-warnings --loader $PWD/node_modules/@hop/hiphop/lib/hiphop-loader.mjs" 
export NODE_OPTIONS
node prog0.hh.mjs
```

### Assigment

  1. Modify `prog0.hh.mjs` so that it emits `O`, only if `I` is emitted 
  in the instant, with a value greater or equal to 3.
  
  2. Modify `prog0.hh.mjs` so that it emits a new output signal `J` at each
  reaction where the difference between the current value `I` of its previous
  value is greater that 10. For instance:
  
```
m.react({I: 0});   // no J emitted
m.react({I: 1});   // no J emitted
m.react({I: 100}); // J emitted
m.react();         // J emitted because nowval and preval are preserved
m.react({I: 101}); // no J emitted
...
```

  3. The statement `pragma { ... }` inserts inside a HipHop program a
  piece of JavaScript code. Modify the previous program so that it displays 
  a message on the console (using JavaScript expression `console.log(...)`)
  each time `J` is emitted.
  
  
Prog 1 - Abortion
-----------------

HipHop abortions is implemented with escape. The syntax 
is ```LBL:  ...; break LBL```. For instance:

```
pragma { console.log("before the loop"); }
EXIT: loop {
   pragma { console.log("Im stuck in the loop"); }
   yield;
   break EXIT;
}
pragma { console.log("after the loop"); }
```

### Assignment

  1. Write a program that takes two signals `ENTER` and `EXIT`, that waits
  for the first to enter a loop and the second to exit it.
  
  
Prog 2 - Parallelism
--------------------

The HipHop construct `fork { stmt1 } par { stmt2 } ... par { stmtN }`
execute `stmt1`, `stmt2`, ..., `stmtN` in parallel.

### Assignment

  1. Write a program that waits for two signals `A` and `B` to be present
  and then emits `O`.
  
  2. Write a program that waits for either `A` or `B` to be present
  and then emits `O`.
  
  3. Write a program that waits for `A` and `B` to have been emitted and
  then emits `O` and exits.
  
  4. Write a program that waits for `A` and `B` to have been emitted and
  then emits `O` and waits for a signal `R` to be received to re-enter its
  initial state (i.e., wait for `A` and `B` to be emitted again).
  
  5. The pattern `L: loop { yield; if (S.now) { break L; } }` is so frequent
  that it is implemented as a primitive called `await (S.now)`. The
  pattern `L: loop { if (S.now) { break L; } else { yield; } }` is called
  `await immediate(S.now)`. Rewrite your previous program using these two
  new constructs.
  
  
Prog 3 - Asynchronous expressions
---------------------------------

The construct `async (S) { stmt; }` executes the JavaScript `stmt` 
that might be it self asynchronous. The `async` statement completes when
the JavaScript code calls the method `this.notify(...)`, which also emits 
signal `S`. For instance, the following program

```
// prog3
import * as hh from "@hop/hiphop";

const prog3 = hiphop module() {    // the HipHop program
   inout O;                        // global signal
   signal S;                       // local signal
   async (S) {
      setTimeout(() => this.notify(10), 1000); // wait for one second
   }
   emit O(10);                     // when async completes, emit O
}

const m = new hh.ReactiveMachine(prog3); 
m.addEventListener("O", v => console.log(v));
m.react();
```

emits the signal `O` after 1 second.

For simplicity, `this.notify` can also be used with JavaScript promises.
For instance we can re-write `prog3` with a promise:

```
const prg3 = hiphop module() {     // the HipHop program
   inout O;
   signal S;
   async (S) {
      this.notify(new Promise((resolve, reject) => setTimeout(resolve, 1000)));
   }
   emit O(10);
}
```

### Assignment 

  1. Write a program that emits a `tick` every two seconds.
  
  2. Write a program that emits a `tick` every two seconds or when it received
  an external signal sent by JavaScript (for that you can use `setTimeout`
  from within JavaScript to trigger an asynchronous reaction).
  
  3. Modify the program so that the emitted ticks contain a logical time
  stamp.
  
  4. Write a program that behaves as that of question 3 but in addition, 
  if it emits a tick because of an JavaScript request, it should wait 
  at least two second again before sending the next periodic tick. 
  
To fullfill this assignement, it is needed to be able to cancel the
asynchronous JavaScript task previous spawned. This can be done by
attaching a `kill` handler to an async form. The syntax is as follows:
`async (e) { ... } kill { ... }`. The `kill` handler is invoked when
HipHop aborts the `async` execution, for instance, when traversed by 
a `break` escape.




