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


Step 1: Using Basic async
-------------------------

Source code: [hiphop-tutorial-async/step1.hh.js](./step1.hh.js)


To execute this step, first create a simple Nodejs module:

```
nodejs --eval "import '@hop/hiphop-tutorial-async/step1.hh.js'" --input-type="module" --loader ./node_modules/@hop/hiphop/lib/hiphop-loader.mjs 
```


Step 2: Reading the response content
------------------------------------

Source code: [hiphop-tutorial/async/step2.hh.js](./step2.hh.js)

In this step we improve the JavaScript implement of the `async` form
so that when a response is received, the content of the response is
read and the user client is notified with the response and its
content. 

To execute this step, create a Nodejs module:

```
nodejs --eval "import '@hop/hiphop-tutorial-async/step2.hh.js'" --input-type="module" --loader ./node_modules/@hop/hiphop/lib/hiphop-loader.mjs 
```


Step 3: Orchestrating the request
---------------------------------

Source code: [hiphop-tutorial/async/step3.hh.js](./step3.hh.js)

```
nodejs --eval "import '@hop/hiphop-tutorial-async/step3.hh.js'" --input-type="module" --loader ./node_modules/@hop/hiphop/lib/hiphop-loader.mjs 
```


Step 4: Dealing with Redirections
---------------------------------

Source code: [hiphop-tutorial/async/step4.hh.js](./step4.hh.js)

```
nodejs --eval "import '@hop/hiphop-tutorial-async/step4.hh.js'" --input-type="module" --loader ./node_modules/@hop/hiphop/lib/hiphop-loader.mjs 
```

Step 5: Including Timeout
-------------------------

Source code: [hiphop-tutorial/async/step5.hh.js](./step5.hh.js)

```
nodejs --eval "import '@hop/hiphop-tutorial-async/step5.hh.js'" --input-type="module" --loader ./node_modules/@hop/hiphop/lib/hiphop-loader.mjs 
```
