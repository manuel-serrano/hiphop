${ var doc = require("hopdoc") }

Hiphop.js: a reactive extension for Hop.js and JavaScript
---------------------------------------------------------

__Hiphop.js__ is a [Hop.js](http://hop-dev.inria.fr) library witch
allow orchestrate web applications.

## How to use it?

* Install [Hop.js](http://hop-dev.inria.fr)
* Download [Hiphop.js](https://www-sop.inria.fr/members/Colin.Vidal/hiphop/hiphopjs-0.0.1.tar.gz), and extract the tarball inside
`$HOME/.node\_modules/`
* Add theses lines on the top of Hop.js program :
```hopscript
"use hopscript"

const hiphop = require("hiphop")
```

<!-- ## Hello world example -->

<!-- ```hopscript -->
<!-- var prg = -->
<!--   <hiphop.Module> -->
<!--     <hiphop.InputSignal name="IN"/> -->
<!--     <hiphop.OutputSignal name="OUT"/> -->
<!--     <hiphop.Loop> -->
<!--       <hiphop.Present signal="IN"> -->
<!--         <hiphop.Emit signal="OUT"/> -->
<!--       </hiphop.Present> -->
<!--       <hiphop.Pause/> -->
<!--     </hiphop.Loop> -->
<!--   </hiphop.Module>; -->

<!-- var machine = new hiphop.ReactiveMachine(prg, "Hello, world!"); -->

<!-- machine.addEventListener("OUT", function(evt) { -->
<!-- 	alert(evt.signalName + "emitted!"); -->
<!-- }); -->
<!-- machine.input("IN"); -->
<!-- machine.react(); -->
<!-- ``` -->

## Tutorial

The goal of this tutorial is to glimpse the benefit of using Hiphop.js
to orchestrate JavaScript events. We'll building a simple translator
form. Each time a user add a new character, the program will query a
web service to ask the translation from a language to another of the
form' string. When the web service sends a result, it is display in
the screen.

### A first attempt

A naive implementation of the example would be the following:

```hopscript
${ doc.include("./naive-translator.js") }
```

But this implementation had two major drawbacks:

* The translation result is updated each times an answer comes. It is
  difficult to know if we have to wait or if this is the actual
  translation.

* Since there is no guarantee of the scheduling of the events with the
  web service, the last answer can be the answer of the first query,
  and the translation would be wrong.

It is possible to correct this behavior my manually associating a
sequence number to each request, and update the translation only when
the answer from the last query comes, and drop the others. However,
this is related to a hack which lead to:

* A complex code, hard to maintains.

* A non-understandable semantics when reading the program.

### Hiphop.js translator implementation

Here is the Hiphop.js version, without the previous drawbacks:


```hopscript
${ doc.include("./hiphop-translator.js") }
```
