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
escape sequence `${...}` (similar to the escape sequence of JavaScript
string templates), _inserts_ a HipHop statement into the program being
build. For instance, compare the two equivalent programs.  The first
one uses any stagging facility.

&#x2605; Example: [staging-abro.hh.js](../../test/staging-abro.hh.js)

The second one, which executes similarly and produces the same result does not:

&#x2605; Example: [abro.hh.js](../../test/abro.hh.js)

Note in this example, how HipHop statments are stored in JavaScript
variables and then inserted into the main program. 

Inside a Hiphop statement an escape sequence `${...}` is replaced
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

&#x2605; Example: [staging-abcro.hh.js](../../test/staging-abcro.hh.js)

In the second example:

&#x2605; Example: [staging-emit-if2.hh.js](../../test/staging-emit-if2.hh.js)

The `emit` statements uses generated signal names.


Dynamic Signal Names in Delay Expressions
-----------------------------------------

When HipHop programs are generated dynamically using the staging facilities,
it happens that delay expressions (e.g., used in `if` or `await` statements)
should used dynamically generated signal names. This is accomplished
using the JavaScript `this[expre]` syntax. For instance, in the following
example:

&#x2605; Example: [staging-emit-if2.hh.js](../../test/staging-emit-if2.hh.js)

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

&#x2605; [run3.hh.js](../test/run3.hh.js)


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

&#x2605; [staging-interface.hh.js](../test/staging-interface.hh.js)

which can be compared to the non-staged version:

&#x2605; [interface.hh.js](../test/interface.hh.js).


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

Example:

&#x2605; [appendseqchild.hh.js](../test/appendseqchild.hh.js)


- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
[[main page]](../README.md) | [[documentation]](./README.md) | [[license]](./license.md)



