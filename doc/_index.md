HipHip.js: a reactive extension for Hop.js and JavaScript
---------------------------------------------------------

__HipHop.js__ is a [Hop.js](http://hop-dev.inria.fr) library witch
allow orchestrate web applications.

## How to use it ?

* Install [Hop.js](http://hop-dev.inria.fr)
* Download [HipHop.js](), and extract the tarball inside
`$HOME/.nodes\_modules/`
* Add theses lines on the top of Hop program :
```hopscript
"use hopscript"

var rjs = require("reactive-js")
```

## Hello world example

```hopscript
var prg = <hiphop.ReactiveMachine debug name="hello_world">
   <hiphop.InputSignal name="IN" />
   <hiphop.OutputSignal name="OUT" />
   <hiphop.Loop>
      <hiphop.Present signal_name="IN">
         <hiphop.Emit signal_name="OUT" />
      </hiphop.Present>
      <hiphop.Pause />
   </hiphop.Loop>
   </hiphop.ReactiveMachine>;

prg.set_input("IN");
prg.react(prg.seq + 1); // Check run time console, and see HipHop running!
```
