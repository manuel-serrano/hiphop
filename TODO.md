
HipHop.js TODO List
===================

Syntax
------

1. (DONE) Allowing parallel with only one branch
2. (DONE) Reject program if an unused attribute is set in a XML node
3. (DONE) Atom must get expression, like emit statement
4. (DONE) Make optional type of valued signal
5. (2015-12-18) All signals are valued
6. (2015-12-18) Signal are directly written in an XML node as a
   standard attribute, following this example :
		* `<inputsignal A B C=5 D=6/plusFunc F/minusFunc />`
		* `SIGNAL_NAME[=initvalue][/combinaisonFunction]`
		* `<emit C func=${...} exprs=%{...}/>`


Debugging
---------

1. (DONE) `!abstract-tree` command in batch must display the internal
   representation of the program (with embedded circuits inside abort,
   every, loopeach, for example). /!\ Display the location of nodes in
   this tree !!
2. (DONE) Ability to start a web service in the batch interpreter that
   display to program source, and highlight the instructions
   containing selected pause. It must automatically update when the
   machine react.
3. (DONE) Allow a pretty-print of the program in the interpreter
   (with symbol that tell the statements with an selected pause), with
   a command like `!pretty-print`.
4. (DONE) To avoid particular case / pattern-matching to know which
   nodes we need to display embeded instruction (for pretty-print),
   applies the following rule : if the node contains childs, display
   child only if the location of the child is different of the
   position of the parent. Disable pretty-print if -g is not present.
5. (2015-12-23) In pretty-printer, hightlight an emitted signal, and
   display it's value
6. (2015-12-21) Full isolation between reactive-kernel and
   batch-interpreter modules : the reactive machine must not have code
   about interpreter (display input/output when react in debug mode).



Automatic tests
---------------

1. (DONE) Start test with interpreter if .in and .js file are present,
   otherwise, start test without interpreter (and directly diff the
   output to .out file). Never start test if .out file is missing.



Documentation
-------------

1. (2015-12-18) Update and fix documentation. Use same explanation and
   structure than in v5 primer.
2. (2015-12-18) Explain how to use the interpreter, the object inspector.




Core language / compiler
------------------------

1. (2015-12-18) Don't broke AST on last compilation phase
   (BuildCircuitVisitor). The AST could be reuse, and it allow
   getElementById the be non-oneshot method.
2. (2015-12-18) Save and restore machine state when use
   appendChild/insertBefore/insertAfter methods
3. (2015-12-18) Add `exec` instruction. It must take child nodes, and
   create a local signal (only readable by child nodes), that is set
   (with possible value) when the exec instruction terminate. Exec
   must be implemented with Hop.js worker.
4. (DONE) Make a true type check, and the debug display type name
5. (DONE) Remove `eval` call in reactive-kernel
6. (DONE) Remove predefined combinaison function
8. (2015-12-23) Attribute "debug" of reactive machine became a field
   which contains a callback called at the begening of a reaction on
   debug mode. The debug mode is enabled on a reaction if react() is
   called with one argument: `true`.
7. (2015-12-23) Implements prototype of signals :
	  * debug: callback called instantaneously when a signal is
        emitted and the reaction is on debug mode (event for local signals)
	  * onemit: default event listener
	  * combineWith
	  * check: callback to check type
	  * init: initial value
8. (2015-12-23) Add stopPropagation() on event object given to signal emission
   callback
9. (DONE) Make all static tests in XML compiler, instead of trying to
   factorize all in ExpressionVisitor (for instance, because there is
   to much specific cases in the syntax), never mind if the code size
   grown a little bit.
10. (2016-01-06) Remove MultipleCircuit of reactive-kernel, it's more
    simple to only keep statement and circuit entities.
