<!-- ${ var doc = require( "hopdoc" ) }
${ var path = require( "path" ) }
${ var ROOT = path.dirname( module.filename ) } -->

HipHop Module
=============

Modules are the HipHop architectural tool for structuring programs. 
They are syntactic constructs that facilitate code re-use. There is
two ways to use a module:

  * to [load](./.api.md) it into a reactive machine;
  * to [run](#run) it from another module via the `run` statement

Modules are lexically scoped and each module introduces it own signal
and trap scopes. That is:

  * a module can only use the signal it defines, either in its 
  argument list or locally;
  * trap labels are only visible inside a module.

### module [ident](arg, ...) [implements [mirror] intf, ...] { sigdecl... } ###
<!-- [:@glyphicon glyphicon-tag syntax] -->

[&#x2604 Formal syntax](../syntax/syntax.md#HHModule)

If the optional `ident` is specified a JavaScript constant named
`ident` is automatically declared and bound to the HipHop module.
That is, the two following forms are equivalent:

```javascript
const M0 = hiphop module () { ... };
hiphop module M0() { ... };
```

Modules parameters (`arg`, ...) are equivalent to variables declared
with `var` or `let` forms. They denote Hop values that can be used in
any expressions of the module.  They are passed to the module with the
`run` form.

Module bodies constist of HipHop
[statements](../syntax/syntax.md#HHStatement). The arguments, which are
signal declarations, constitute its interface. Module arguments are
either _input_ signals, _output_ signals, or _input/output_
signals. Here is an example of a module with an input, an output
signal, and an input/output signal:

```javascript
module M1(x) {
  in S; out T; inout U;
  ...
}
```

These signals, in addition to the ones declared in the optional
interfaces (`intf`, ...), form the module interface. For a
module to be executed, its signals have to be bound the
caller signals in its scope (the scope of the corresponding
`run` form).

For instance, the `M1` module can be used in the following
`run` statement from a `M2` module.

```javascript
module M2() {
  ...
  run M1(10) { myS as S, myT as T, U a U }
  ...
}
```

In that example, the `M2`'s `myS` signal is bound to
the `M1`'s `S`, `myT` to `T` and `M2`'s signal `U` is
bound to `M1`'s signal `U`.

&#x2605; Example: [run2.hh.js](../../test/run2.hh.js)

See [`run`](#running-modules) for a complete description
of the `run` form.

Signals that are declared after the first body statements are
local signals and they cannot be bound in a `run` statement.

#### module.precompile() ####

Compiles a module. Compiling a module is optional and serves only the
purpose of running preliminary checks such as signal names resolution.


HipHop Interface
----------------

Module arguments can either be specified in the module declaration
or packed into an _interface_ that a module can then implements. 
The interface declaration is all similar to a module declaration but an
interface contains no body.

### interface [ident] [extends intf, ...] { ... } ###
<!-- [:@glyphicon glyphicon-tag syntax] -->

[&#x2604 Formal syntax](../syntax/syntax.md#HHInterface)

If the optional `ident` is specified a JavaScript constant named
`ident` is automatically declared and bound to the HipHop interface.
That is, the two following forms are equivalent:

```javascript
const I0 = hiphop interface { in I, out O };
hiphop interface I0 { in I, out O };
```

Here is an example of interface declaration and use to define a module:

```hiphop
interface common { in S; out T };

module mod() implements common { inout U; ... }
```

The signals `S`, `T`, and `U` are all defined in `mod`.

A module can also implements the _mirror_ of an interface. This is lets two
modules, one emitted, the other receiving to be easily connected. The syntax
is as follows:

```hiphop
interface intf(out T);

module producer() implements intf { ; }
module consumer() implements mirror intf { ; }
```

&#x2605 Example: [imirror.hh.js](../../test/imirror.hh.js)


Running Modules
---------------

A module can be executed either because it is directly loaded into a
[reactive machine](./api.html) or because it is ran by other module
via the `run` syntactif form.

### run module(arg, ...) { sig, ...} ###
<!-- [:@glyphicon glyphicon-tag syntax] -->

[Formal syntax](../syntax#HHRun). 

The module can either be:

  1. `ident`, this identifier refers to a module declared under that name.
 Its is an error to refer to an unbound module.
  2. a dollar expression, which must evaluate to a module. If it fails to do
 so, a `TypeError` is signal when the program is construct.

${ <span class="label label-warning">Note:</span> } The module resolution
always take place *before* the HipHop execution. That is, when a 
module identifier is used, that identifier is searched before the execution,
when a dollar expression is used, that expression is evaluated *before* the
HipHop execution.

The arguments of the `run` form are bound the module variables.

When a module is ran the signals of the callee are _linked_ to the
caller signals. The purpose of the signals list is to specify are to
proceed to this linking.

The linkings can either be:

  1. `ident`; 
  2. `ident to ident`; bind the caller signal to the module input signal
  3. `ident from ident`; bind the caller signal to the module output signal
  4. `ident as ident`; bind the caller signal to the module signal
  5. `+`; autocomplete the signals list, bind automatically signals with
      same names, raises an error if some signals are unbound.
  6. `***`; autocomplete the signals list, bind automatically signals with
      same names, but contrary to `+`, ignore unbound signals.


Top level Definitions
---------------------

Modules and interfaces have an optional name. When a named is declared
at the JavaScript top-level, it is automatically bound to an eponym
JavaScript global variable. That is


```hiphop
const intf = hiphop intf { ... };
const mod = hiphop module() implements ${intf} { .... }
```

are equivalent to:

```hiphop
hiphop interface intf { ... };
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

### Example of Mirrored Interfaces ###

This example defines two modules connected with mirrored interfaces.

${ <span class="label label-info">imirror.hh.js</span> }

```hiphop
${ doc.include( ROOT + "/../../tests/imirror.hh.js" ) }
```

### Generated Modules ###

This example uses a module generator (the function `Timer`). HipHop modules are
lexically scopped with regard to Hop environment so all the expressions they
contain can refer to Hop variables bound in the environment. In this example,
the function parameter `timeout` is used in the `async` form to set the
timeout duration.

The new modules are directly created when run, using the dollar-form
in the main HipHop program. 

${ <span class="label label-info">run3.hh.js</span> }

```hiphop
${ doc.include( ROOT + "/../../tests/run3.hh.js" ) }
```

### Modules Variables ###

This example shows how to use module variable parameters. In that example,
two instances of the smae module `mod` are executed in parallel construct,
each invoking the module with a different variable paramter value. This
example shows, that each instance "sees" its own copy of the parameter.

${ <span class="label label-info">run4.hh.js</span> }

```hiphop
${ doc.include( ROOT + "/../../tests/run4.hh.js" ) }
```


### Example of Dynamically Generated Interfaces ###

When interfaces are to be generated dynamically, the XML interface
must be used.

${ <span class="label label-info">imirrordyn.js</span> }

```hiphop
${ doc.include( ROOT + "/../../tests/imirrordyn.hh.js" ) }
```


- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
[[main page]](./README.md) | [[language]](../lang.md) | [[license]](./license.md)

