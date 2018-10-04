${ var doc = require( "hopdoc" ) }
${ var path = require( "path" ) }
${ var ROOT = path.dirname( module.filename ) }

HipHop Module
=============

Modules are the HipHop execution unit. A Module can be
[loaded](./api.html) into a reactive machine or _ran_ by another
module.  Modules are lexically scoped and each module introduces it own
signal and trap scopes. That is:

  * a module can only use the signal
 it defines, either in its argument list or locally;
  * trap labels are only visible inside a module .


### module [ident]( arg, ... ) [implements intf, ...] { ... } ###
[:@glyphicon glyphicon-tag syntax]

[Formal syntax](./syntax.html#HHModule)

Modules body constist of HipHop
[statements](./syntax.html#HHStatement). The arguments, which are
signal declarations, constitute its interface. Module arguments are
either _input_ signals, _output_ signals, or _input/output_
signals. Here is an example of a module with an input, an output
signal, and an input/output signal:

```hiphop
module mod( in S, out T, inout U ) { ; }
```

HipHop Interface
================

Module arguments can either be specified in the module declaration
or packed into an _interface_ that a module can then implements. 
The interface declaration is all similar to a module declaration but an
interface contains no body.

### interface [ident]( arg, ... ) [extends intf, ...] ###
[:@glyphicon glyphicon-tag syntax]

[Formal syntax](./syntax.html#HHInterface)

Here is an example of interface declaration and use to define a module:

```hiphop
interface common( in S, out T );

module mod( inout U ) implements common { ; }
```

The signals `S`, `T`, and `U` are all defined in `mod`.


Running Modules
===============

A module can be executed either because it is directly loaded into a
[reactive machine](./api.html) or because it is ran by other module
via the run syntactif form.

### run module( arg, ... ) ###
[:@glyphicon glyphicon-tag syntax]

[Forma syntax](./syntax#HHRun). 

The arguments can either be:

  1. `ident`;
  2. `ident=ident`;
  1. `...`.

When a module is ran the signal of the callee must be _linked_ to the
caller signals. The purpose of the arguments is to specify are to
proceed to this linking. The first form links a caller signal and a callee
signal whose names are both `ident`. The second form links the signals
of two different names. The third form links all the caller modules
that are defined at the `run` location whose name matches a callee signal.


Top level Definitions
=====================

Modules and interfaces have an optional name. When a named is declared
at the JavaScript top-level, it is automatically bound to an eponym
JavaScript global variable. That is


```hiphop
const intf = hiphop intf( ... );
const mod = hiphop module() implements ${intf} { .... }
```

are equivalent to:

```hiphop
hiphop interface intf( ... );
hiphop module mod() implements intf { .... }
```


Examples
========

### A Basic example ###

A basic module with one input signal `I`, and one input/output signal `O`.
Each time `I` is received, `O` is emitted. The module is directly loaded
into a reactive machine. It constitutes the program this machine will
execute.

${ <span class="label label-info">every1.js</span> }

```hiphop
${ doc.include( ROOT + "/../../tests/every1.hh.js" ) }
```

### Example using combined signals ###

A module with an input/output signal `O` with default value `5`
and a combine function.

${ <span class="label label-info">value1.js</span> }

```hiphop
${ doc.include( ROOT + "/../../tests/value1.hh.js" ) }
```

### Example of submodule ###

This example defines a `main` module that runs a submodule `sub`.  The
signals `S` and `U` are connected to the submodule under the same
name. That is when the input signal `S` is sent to the machine, both
modules see it simultaneously and when `sub` emits the output signal
`U`, the program behaves as if the emission was executed by `main`.

${ <span class="label label-info">run.js</span> }

```hiphop
${ doc.include( ROOT + "/../../tests/run.hh.js" ) }
```

### Example of Interfaces ###

This example defines two interfaces that are used in two distinct modules.
The module `M1` runs the module `M2` by aliasing its signal `Z` to the 
`M2`'s signal `D` and by linking all the other signals (`A`, `B`, and `C`)
directly.

${ <span class="label label-info">interface.js</span> }

```hiphop
${ doc.include( ROOT + "/../../tests/interface.hh.js" ) }
```

