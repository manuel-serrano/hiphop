<!-- ${ var doc = require( "hopdoc" ) } -->

Errors
======

There are three reasons for which a syntactically correct HipHop.js program
can be wrong.

  1. It uses incorrectly JavaScript expressions.
  2. It uses _instantaneous loops_.
  3. It contains causality errors.
  
It is the responsibility of the programmer to ensure a correct use of
JavaScript. Instantaneous loops and causality errors are detected by
HipHop.


Incorrect JavaScript Expressions
--------------------------------

JavaScript expressions are used in many HipHop forms. Obviously, they are
used in `pragma` forms, but also, in delays (`if`, `await`, `every`, ...), 
and signal emissions. It is illegal for a HipHop program to depend on
observable JavaScript side effects during a reaction. If such a side
effect can be observed, the HipHop program behavior becomes unpredictable.

For instance, the following program is correct:

```javascript
let cnt = 0;
fork {
  emit S1(cnt++);
} par {
  emit S2();
}
```

It is correct, because the increment of the variable `cnt` is not observable
during a reaction. In contrast, the following program is incorrect because
it observes the side effect, as `S1` and `S2` are emitted with two values
that unveil the side effect.

```javascript
let cnt = 0;
fork {
  emit S1(cnt++);
} par {
  emit S2(cnt++);
}
```

These errors cannot be detected by the HipHop compiler nor by the HipHop
runtime system. Hence, it is the responsibility of the programmer to
avoid these situations.

Instantaneous Loops
-------------------

No HipHop thread can loop _instantaneously_, that is looping without
a `yield` statement in the body of the loop.

For instance, the following program is incorrect:

```javascript
loop {
   pragma { console.log("I'm in the loop"); }
   emit tick();
}
```

Instantaneous loops are detected and reported by the HipHop compiler. To
fix these errors, it is generally enough to force a pause in the loop 
body. For instance, the program above can be fixed as follows:

```javascript
loop {
   pragma { console.log("I'm in the loop"); }
   emit tick();
   yield;
}
```

Causality Errors
----------------

Correct HipHop programs must be _causal_. This means that during a reaction
no execution all the decisions (evaluation of `delay` forms) should not
be contradicted not depends on future executions. For instance, the following
program is incorrect

```javascript
if (!S.now) { emit S() }
```

because the emission of the signal `S` would contradict the evaluation
of the `delay` that is true if and only if `S` is not emitted during the
reaction. 

The following second program

```javascript
if (S.now) { emit S() }
```

is also incorrect because the evaluation of `S.now` depends on the emission
of `S` that is control by the test. That is, to evaluate the expression `S.now`
HipHop has to prove that not possible emission of `S` occurs but such a
emission will occur is the test evaluates to true. This creates a dependency
cycle that is incorrect.

All causality errors are of one of these two sorts, although the contradiction
of inconsistency can involved larger cycle. For instance, these program
exhibits the same causality error as the first example, although two signals
are involved:

```javascript
fork {
  if (!S1.now) { 
	emit S2();
  }
} par {
  if (S2.now) {
    emit S1();
  }
}
```

When HipHop detects a causality error, it tries to report the shortest
erroneous cycle and the minimal set of signals involved in that cycle.

- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
[[main page]](../../README.md) | [[documentation]](../README.md) | [[language]](./README.md) | [[license]](../license.md)

