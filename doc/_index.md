HipHip.js: a reactive extension for Hop.js and JavaScript
---------------------------------------------------------

__HipHop.js__ is a [Hop.js](http://hop-dev.inria.fr) library witch
allow orchestrate web applications.

## How to use it ?

* Install [Hop.js](http://hop-dev.inria.fr)
* Download [HipHop.js](), and extract the tarball inside
`$HOME/.node\_modules/`
* Add theses lines on the top of Hop program :
```hopscript
"use hopscript"

var hiphop = require("hiphop")
```

## Hello world example

```hopscript
var prg =
  <hiphop.Module>
    <hiphop.InputSignal name="IN"/>
    <hiphop.OutputSignal name="OUT"/>
    <hiphop.Loop>
      <hiphop.Present signal_name="IN">
        <hiphop.Emit signal_name="OUT"/>
      </hiphop.Present>
      <hiphop.Pause/>
    </hiphop.Loop>
  </hiphop.Module>;

var machine = new hiphop.ReactiveMachine(prg, "Hello, world!");

machine.addEventListener("OUT", function(evt) {
	alert(evt.signalName + "emitted!");
});
machine.setInput("IN");
machine.react();
```
