# Random, property-based testing

A quickcheck-inspired library to test that various different options
of HipHop evaluate programs to the same results.

- index.mjs: runs the random testing

- gen.mjs: generates random HipHop modules

- prop.mjs: defines the property that three different modes of HipHop compute the same results

- shrink.mjs: shrinks counterexamples
