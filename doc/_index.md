HipHip.js: a reactive extension for Hop.js and JavaScript
---------------------------------------------------------

__HipHop.js__ is a [Hop.js](http://hop-dev.inria.fr) library witch allow orchestrate web
applications.

Use `require( "reactive-js" )` to use it.


```hopscript
var hiphop = require("reactive-js");

var prg = <hiphop.ReactiveMachine name="hello_world">
   <hiphop.InputSignal name="IN" />
   <hiphop.OutputSignal name="OUT />
   <hiphop.Loop>
      <hiphop.Present signal_name="IN">
         <hiphop.Emit signal_name="OUT" />
      </hiphop.Present>
      <hiphop.Pause />
   </hiphop.Loop>
</hiphop.ReactiveMachine>;
```
