<!-- ${ var doc = require("hopdoc") } -->

HipHop Staging
==============

HipHop is a _staged_ programming language. That is, although hidden
by the syntax, _all_ HipHop programs are the result of a JavaScript
execution and _all_ HipHop programs are first class values in the 
JavaScript world. 

From the JavaScript standpoint, the `hiphop` construct (see
[Syntax](./syntax/hiphop.bnf)) is an expression, which evaluates to
a HipHop programs. This value representing a HipHop program can be
manipulated as any other JavaScript value. It can be stored in variables
or data structures, passed and returned from functions, etc.

Generating statements
---------------------

The HipHop syntax provides _escapes_ that enable HipHop programs to be
assembled from separately developed statements. Within HipHop, the
escape sequence <tt>&#36;{...}</tt> (similar to the escape sequence of
JavaScript string templates), _inserts_ a HipHop statement into the
program being build. For instance, compare the two equivalent
programs.  The first one uses any stagging facility.

<span class="hiphop">&#x2605;</span> [staging-abro.hh.js](../test/staging-abro.hh.js)
<!-- ${doc.includeCode("../test/staging-abro.hh.js", "hiphop")} -->

The second one, which executes similarly and produces the same result does not:

<span class="hiphop">&#x2605;</span> [abro.hh.js](../test/abro.hh.js)
<!-- ${doc.includeCode("../test/abro.hh.js", "hiphop")} -->

Note in this example, how HipHop statments are stored in JavaScript
variables and then inserted into the main program. 

Inside a Hiphop statement an escape sequence <tt>&#36;{...}</tt> is replaced
at compile-time by the corresponding value. The type of the inserted
value depends on the context of the escape sequence. 

   * an *array of statements*, when used, after the `fork` keyword;
   of HipHop statement;
   * a *statement* or an *array of statements*, when used inside a sequence;
   * a *string*, when used in the signal position of an `emit` statement;
   * a *HipHop statement* otherwise.
   
In the following example, the three arms of a `fork` construct are first
stored in a JavaScript array and then inserted into the constructed
HipHop program.

<span class="hiphop">&#x2605;</span> [staging-abcro.hh.js](../test/staging-abcro.hh.js)
<!-- ${doc.includeCode("../test/staging-abcro.hh.js", "hiphop")} -->

In the second example:

<span class="hiphop">&#x2605;</span> [staging-emit-if2.hh.js](../test/staging-emit-if2.hh.js)
<!-- ${doc.includeCode("../test/staging-emit-if2.hh.js", "hiphop")} -->

The `emit` statements uses generated signal names.

This last example illustrates many of the staging features, included
those described in the next sections. It shows how to generate a `fork`
construct with as many branches as values contained in a JavaScript
array. It shows how to wait for and emit signals whose names are generated.

<span class="hiphop">&#x2605;</span> [staging-fork.hh.js](../test/staging-fork.hh.js)
<!-- ${doc.includeCode("../test/staging-fork.hh.js", "hiphop")} -->


Dynamic Signal Names in Delay Expressions
-----------------------------------------

When HipHop programs are generated dynamically using the staging facilities,
it happens that delay expressions (e.g., used in `if` or `await` statements)
should used dynamically generated signal names. This is accomplished
using the JavaScript `this[expre]` syntax. For instance, in the following
example:

<span class="hiphop">&#x2605;</span> [staging-emit-if2.hh.js](../test/staging-emit-if2.hh.js)
<!-- ${doc.includeCode("../test/staging-emit-if2.hh.js", "hiphop")} -->

The two HipHop `if` statements uses dynamic signal expressions for 
refering to signals `B` and `C`.


Generated Modules
-----------------

This example uses a module generator (the function `Timer`). HipHop modules are
lexically scopped with regard to Hop environment so all the expressions they
contain can refer to Hop variables bound in the environment. In this example,
the function parameter `timeout` is used in the `async` form to set the
timeout duration.

The new modules are directly created when run, using the dollar-form
in the main HipHop program. 

<span class="hiphop">&#x2605;</span> [run3.hh.js](../test/run3.hh.js)
<!-- ${doc.includeCode("../test/run3.hh.js", "hiphop")} -->

The input/output signal declaration syntax enables staging. The
`...` form can be followed by a _dollar_ expression that should evaluate
to an array of strings that will denote the names of the declared signals.

<span class="hiphop">&#x2605;</span> Example: [staging-incr-branch2.hh.js](../test/staging-incr-branch2.hh.js)
<!-- ${doc.includeCode("../test/staging-incr-branch2.hh.js", "hiphop")} -->


Generated Interfaces
--------------------

Staged interfaces are created by using regular objects whose properites
are HipHop signal descriptor. An signal descriptor is described by the
following properties:

  * `direction`: a string that might either be `"IN"`, `"OUT"`, or `"INOUT"`;
  * `init`: a JavaScript thunk (a function with no argument) that initializes
  the signal during the reaction;
  * `combine`: an associated binary function used for multiple emissions
  during a reaction.
  * `transient`: a boolean to declare transient signals, i.e., signales not
  preserving their `nowval` value accross instants.

In a `run` statement, the signal bindings can also being staged using
JavaScript objects associating bound names. In these binding objects,
special properties `*` and `+` play the same role as the `*` and
`+` operators of the non-staged binders (see [modules](./lang/module.md)).

Example:

<span class="hiphop">&#x2605;</span> [staging-interface.hh.js](../test/staging-interface.hh.js)
<!-- ${doc.includeCode("../test/staging-interface.hh.js", "hiphop")} -->

which can be compared to the non-staged version:

<span class="hiphop">&#x2605;</span> [interface.hh.js](../test/interface.hh.js).
<!-- ${doc.includeCode("../test/interface.hh.js", "hiphop")} -->


Dynamic Program Modifications
-----------------------------

HipHop `fork` and `sequence` statements can be modified in between two
reactions using the function `appendChild`.

### mach.getElementById(id) ###

Returns the HipHop `fork` or `sequence` labeld with `id`.

### mach.appendChild(node, hhstmt) ###
<!-- [:@glyphicon glyphicon-tag function] -->

Append a child to a statement. If `node` is a `fork` construct, the
child is added as a new parallel branch. If node is a sequence, the
child is added after the node children.

### mach.removeChild(node, child) ###
<!-- [:@glyphicon glyphicon-tag function] -->

Remove a child.

<span class="hiphop">&#x2605;</span> Example [appendseqchild.hh.js](../test/appendseqchild.hh.js)
<!-- ${doc.includeCode("../test/appendseqchild.hh.js", "hiphop")} -->


- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
[[main page]](../README.md) | [[documentation]](./README.md) | [[license]](./license.md)



