${ var doc = require( "hopdoc" ) }
${ var path = require( "path" ) }
${ var ROOT = path.dirname( module.filename ) }

Loops
=====

HipHop provides several sort of loops.

```ebnf
<HHLoop> --> loop <HHBlock>
<HHEvery> --> every( <HHDelay> ) <HHBlock>
<HHDo> --> do <HHBlock> every( <HHDelay> )
```

### loop { ... } ###
[:@glyphicon glyphicon-tag syntax]

Implements an infinite loop

Example of a simple loop:

${ <span class="label label-info">sync1.hh.js</span> }

```hiphop
${ doc.include( ROOT + "/../../tests/sync1.hh.js" ) }
```

A loop executed each time an event is present:

${ <span class="label label-info">every1.hh.js</span> }

```hiphop
${ doc.include( ROOT + "/../../tests/every1.hh.js" ) }
```



A loop always executing its body and repeating the loop for each
signal:

${ <span class="label label-info">abcro.hh.js</span> }

```hiphop
${ doc.include( ROOT + "/../../tests/abcro.hh.js" ) }
```

