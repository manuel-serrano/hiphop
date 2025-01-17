<!-- ${ var doc = require( "@hop/hopdoc" ) } -->

HipHop Modules
==============

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

> [!NOTE]
> This chapter documents _static_ modules. _Dynamic_ or _staged_ modules, 
> that is, modules generated dynamically by prior JavaScrpt executions
> are described in the [staging chapter](../staging.md).


### module [ident](arg, ...) [implements [mirror] intf, ...] { sigdecl... } ###
<!-- [:@glyphicon glyphicon-tag syntax] -->

&#x2606; [Formal syntax](../syntax/hiphop.bnf#HHModule)

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
[statements](../syntax/hiphop.bnf#HHStatement). The arguments, which are
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

Within a module, the `in`, `out`, and `inout` signals can be used
as any [local signals](./signal.md).

For instance, the `M1` module can be used in the following
`run` statement from a `M2` module.

```javascript
module M2() {
  ...
  run M1(10) { myS as S, myT as T, U as U }
  ...
}
```

In that example, the `M2`'s `myS` signal is bound to
the `M1`'s `S`, `myT` to `T` and `M2`'s signal `U` is
bound to `M1`'s signal `U`.

<span class="hiphop">&#x2605;</span> Example: [run2.hh.js](../../test/run2.hh.js)
<!-- ${doc.includeCode("../../test/run2.hh.js", "hiphop")} -->

See [`run`](#running-modules) for a complete description
of the `run` form.

Signals that are declared after the first body statements are
local signals and they cannot be bound in a `run` statement.

#### module.precompile() ####

Compiles a module. Compiling a module is optional and serves only the
purpose of running preliminary checks such as signal names resolution.


HipHop Interfaces
-----------------

Module arguments can either be specified in the module declaration
or packed into an _interface_ that a module can then implements. 
The interface declaration is all similar to a module declaration but an
interface contains no body.

### interface [ident] [extends intf, ...] { ... } ###
<!-- [:@glyphicon glyphicon-tag syntax] -->

&#x2606; [Formal syntax](../syntax/hiphop.bnf#HHInterface)

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

<span class="hiphop">&#x2605;</span> Example: [imirror.hh.js](../../test/imirror.hh.js)
<!-- ${doc.includeCode("../../test/imirror.hh.js", "hiphop")} -->


Running Modules
---------------

A module can be executed either because it is directly loaded into a
[reactive machine](./api.html) or because it is ran by other module
via the `run` syntactif form.

### run ident(arg, ...) { sig, ...} ###
<!-- [:@glyphicon glyphicon-tag syntax] -->

&#x2606; [Formal syntax](../syntax/hiphop.bnf#HHRun). 

The module `ident` expression must be a JavaScript variable
holding a module.


> [!WARNING]
> The module resolution always take place *before* the HipHop execution. That is, when a 
> module identifier is used, that identifier is searched before the execution.

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


Examples
--------

### A Basic example ###

A basic module with one input signal `I`, and one input/output signal `O`.
Each time `I` is received, `O` is emitted. The module is directly loaded
into a reactive machine. It constitutes the program this machine will
execute.

<span class="hiphop">&#x2605;</span> Example: [every1.js](../../test/every1.hh.js)
<!-- ${doc.includeCode("../../test/every1.hh.js", "hiphop")} -->


### Example using combined signals ###

A module with an input/output signal `O` with default value `5`
and a combine function.

<span class="hiphop">&#x2605;</span> Example: [value1.hh.js](../../test/value1.hh.js)
<!-- ${doc.includeCode("../../test/value1.hh.js", "hiphop")} -->


### Example of submodule ###

This example defines a `main` module that runs a submodule `sub`.  The
signals `S` and `U` are connected to the submodule under the same
name. That is when the input signal `S` is sent to the machine, both
modules see it simultaneously and when `sub` emits the output signal
`U`, the program behaves as if the emission was executed by `main`.

<span class="hiphop">&#x2605;</span> Example: [run.hh.js](../../test/run.hh.js)
<!-- ${doc.includeCode("../../test/run.hh.js", "hiphop")} -->


### Example of Interfaces ###

This example defines two interfaces that are used in two distinct modules.
The module `M1` runs the module `M2` by aliasing its signal `Z` to the 
`M2`'s signal `D` and by linking all the other signals (`A`, `B`, and `C`)
directly.

<span class="hiphop">&#x2605;</span> Example: [interface.hh.js](../../test/interface.hh.js)
<!-- ${doc.includeCode("../../test/interface.hh.js", "hiphop")} -->


### Example of Mirrored Interfaces ###

This example defines two modules connected with mirrored interfaces.

<span class="hiphop">&#x2605;</span> Example: [imirror.hh.js](../../test/imirro.hh.js)
<!-- ${doc.includeCode("../../test/imirror.hh.js", "hiphop")} -->

### Modules Variables ###

This example shows how to use module variable parameters. In that example,
two instances of the smae module `mod` are executed in parallel construct,
each invoking the module with a different variable paramter value. This
example shows, that each instance "sees" its own copy of the parameter.

<span class="hiphop">&#x2605;</span> Example: [run4.hh.js](../../test/run4.hh.js)
<!-- ${doc.includeCode("../../test/run4.hh.js", "hiphop")} -->


- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
[[main page]](../../README.md) | [[documentation]](../README.md) | [[language]](./README.md) | [[license]](../license.md)

