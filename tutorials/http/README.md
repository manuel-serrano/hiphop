HipHop Tutorial #2: async forms
===============================

The `async` [form](http://hop.inria.fr/home/hiphop/async.html) maps
the asynchronous evaluation of JavaScript into the synchronous world
of HipHop. By doing so, it enables to use all HipHop constructs
(preemption, join point, suspension, etc) to orchestrate asynchronous
computations. In this tutorial, we illustrate `async` with web
requests.

This tutorial is available as an NPM package. It can be installed with:

```
npm install https://www-sop.inria.fr/members/Manuel.Serrano/software/npmx/hiphop-tutorial-async.tgz
```

When HipHop is officially released in 2024, the installation procedure is:

```
npm install @hop/hiphop-tutorial-async
```

The steps of this tutorial can be then executed with:

  1. `npm run step1`
  2. `npm run step2`
  


Step 1: Using Basic async
-------------------------


The source code [step1.hh.js](./step1.hh.js)
