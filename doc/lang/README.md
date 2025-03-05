<!-- ${ var doc = require("@hop/hopdoc") } -->

The HipHop Programming Language
===============================

HipHop is a _synchronous programming_ language. It supports
**sequence**, **parallelism**, **preemption**, **instantaneous** communication
between components by the means of signals, and it is _deterministic_. 

A HipHop program executes by reacting to external events. Each of
these executions is called a _reaction_ or an _instant_. It is the
role of JavaScript to decide when a HipHop program should execute its
next instant.

During a HipHop reaction, all components see the very same
information.  For instance, all compoments share the same information
about signals that have been emitted or not. Programs are to be _causal_.
That is:

  1. programs have only one possible unambigious execution path and during;
  2. programs cannot contradict themselves during a reaction, that is, they
  can perform an action that contradict a decision already take during the
  reaction;
  3. programs cannot take decision based on action not already executed during
  the reaction;
  4. programs cannot execute infinite loop during a reaction.
  
Programs that do not respect these four rules are rejected, either 
statically or dynamically. See the section [Errors](./lang/error.md)
for examples of incorrect programs.

HipHop and JavaScript cooperate all along the execution. The program
_always_ starts as a regular JavaScript program, which is in charge
of constructing the HipHop program and triggering its reaction. 

During the reaction, JavaScript is used to evaluate the HipHop predicates
and to compute the values associated with signals. JavaScript can
be notified of HipHop signal emission by attaching listeners to a
reaction machine. These listeners are invoked for each output signals
(thoses declared with the `out` keyword) at the end of the reaction.

<!-- github -->
Table of contents
-----------------

  1. [Modules](./module.md), _how to define HipHop modules._
  2. [Signals](./signal.md), _how to deal with signals and variables._
  3. [Flow](./flow.md), _the HipHop statements._
  4. [Async](./async.md), _the `async` form to orchestrate JavaScript asynchronous operations._
  5. [Errors](./error.md), _errors and causes._
  6. [BNF](../syntax/hiphop.bnf), _the full HipHop programming language syntax._

<!-- /github -->


Syntax and JavaScript embedding
-------------------------------

> [!WARNING]
> HipHop requires the program to use ECMAScript modules.

The HipHop syntax extends the JavaScript syntax with one single
statement:

```ebnf
  hiphop <HHstatement>
```

The `hiphop` tag is to be followd by a HipHop statement, whose
syntax is described in this [bnf grammar](syntax/hiphop.bnf).

This chapter documents the HipHop programming language.  The
connection with JavaScript is described in chapter [api](./api.md) and
the standard HipHop modules are described in chapter [standard
modules](./stdmod.md).


### Example ###

<span class="hopscript">&#x2605;</span> [abro.hh.js](../../test/abro.hh.js)
<!-- ${doc.includeCode("../../test/abro.hh.js", "hiphop")} -->


- - - - - - - - - - - - - - - - - - - - - - - - - - - 
[[main page]](../README.md) | [[documentation]](./README.md) | [[license]](./license.md)
