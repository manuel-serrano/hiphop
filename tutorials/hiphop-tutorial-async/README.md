HipHop Tutorial #2: async forms
===============================

Duration: 120 minutes
HipHop website: http://www-sop.inria.fr/members/Manuel.Serrano/hiphop/
Github: https://github.com/manuel-serrano/hiphop

The `async` [form](http://hop.inria.fr/home/hiphop/async.html) maps
the asynchronous JavaScript evaluations into the synchronous world
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

**Source code**: [hiphop-tutorial-async/step1.hh.js](./step1.hh.js)


To execute:

```
nodejs --eval "import '@hop/hiphop-tutorial-async/step1.hh.js'" --input-type="module" --loader ./node_modules/@hop/hiphop/lib/hiphop-loader.mjs 
```

For this example, we are using the Nodejs `http`, `https`, and `url`
facilities to request documents on the web. Fetching such a document
is inherently asynchronous. The low level Nodejs API provides a
callback-based mechanism for opening HTTP request and reading the
result. To use this from within HipHop we merely have to wrap these
calls into an `async` form. When the request complete, it should
tell the HipHop program to resume by invoking the `this.notify`
method that will trigger a new reaction of the current machine with
the signal used in the `async` form, here the `response` signal, 
and with value, the argument passed to `notify`.

The benefits HipHop brings are the following:

  * an `async` form can be interrupted, suspended, and resumed as
  any HipHop computation;
  * an `async` form can execute in parallel with other HipHop computations;
  * an `async` form can be synchronized with other forms, let them be other
  `async` forms or arbitrary HipHop statements.


Step 2: Reading the response content
------------------------------------

**Source code**: [hiphop-tutorial/async/step2.hh.js](./step2.hh.js)

To execute:

```
nodejs --eval "import '@hop/hiphop-tutorial-async/step2.hh.js'" --input-type="module" --loader ./node_modules/@hop/hiphop/lib/hiphop-loader.mjs 
```

In this step we improve the JavaScript implement of the `async` form
so that when a response is received, the content of the response is
read and the user client is notified with the response and its
content. 


Step 3: Orchestrating the request
---------------------------------

**Source code**: [hiphop-tutorial/async/step3.hh.js](./step3.hh.js)

To execute: 

```
nodejs --eval "import '@hop/hiphop-tutorial-async/step3.hh.js'" --input-type="module" --loader ./node_modules/@hop/hiphop/lib/hiphop-loader.mjs 
```

An `async` form supports *hooks* that are executed with the HipHop
form is preempted, suspended, or resumed. Using these hooks gives
the program the opportunity to reclaim or freeze system resources when an
async form is interrupted. For this example, we modify the implementation
of the `httpGet` module to use the three `async` hooks: `suspend`, 
`resume`, and `kill`. In this case, when an `httpGetOrchestration`
module is suspended, it simply marks that its state is `"suspend"` because
the native HTTP connection cannot be interrupted. If this request
completes while the `async` is still suspended, it will store the result
of the request and emit it when the `async` resumes.


Step 4: Dealing with redirections
---------------------------------

**Source code**: [hiphop-tutorial/async/step4.hh.js](./step4.hh.js)

To execute: 

```
nodejs --eval "import '@hop/hiphop-tutorial-async/step4.hh.js'" --input-type="module" --loader ./node_modules/@hop/hiphop/lib/hiphop-loader.mjs 
```

We want to enhance our HTTP fetcher by supporting redirection. When 
a document is moved to another location a server can return a
status code 301 to indicate the reduction to the client.

To support automatic redirection we will create a new HipHop module
called `httpGetRedirection` that will run in a loop the previously
created `httpGetOrchestration` module that will check the result of
the request. We cap the loop to only allow the program to follow 10 
redirection per request.


Step 5: Including timeout
-------------------------

**Source code**: [hiphop-tutorial/async/step5.hh.js](./step5.hh.js)

To execute: 

```
nodejs --eval "import '@hop/hiphop-tutorial-async/step5.hh.js'" --input-type="module" --loader ./node_modules/@hop/hiphop/lib/hiphop-loader.mjs 
```

For this last evolution we are to add a timeout to our HTTP requests.
After a user-defined amount of time, if the request did not complete, 
an error is notified. Of course, a timeout is another form of 
asynchronous computation and it can be programmed in JavaScript
using the `setInterval` and `setTimeout` facilities, so the only
thing we need is to use another `async` form that uses these functions.
Instead of programming them manually, we will reuse a HipHop builtin
module that does this for us that can be imported with:

```
import { timeout, Timeout } from "@hop/hiphop/modules/timeout.hh.js";
```

The variable `timeout` hold the module executing the `async` form 
and the `Timeout` is the interface of that module. Its documentation
can be found [here](http://hop.inria.fr/home/hiphop/modules/timeout.html).

Once imported, we can build a new HipHop program by running in parallel
the program we wrote during step 4 and an instance of the `timeout`
module. To force the parallel to complete when the first of the two
branches complete, we use the label `exit` and two `break` statements.


Final Notes
-----------

In this tutorial with have seen how to use the HipHop `async` form to
orchestrate asynchronous JavaScript evaluation within HipHop. We have
implemented an HipHop program that download documents from the web
using the HTTP protocol. The purpose of this tutorial is educational and
HipHop programmers are not expected to use this tutorial as an example
for their real applications. Instead, the HipHop standard distribution
provides the builtin module `http` that implements the module used
in this tutorial. It can be imported in user applications with:

```
import { httpRequest, HttpRequest } from "@hop/hiphop/modules/http.hh.js";
```

Its documentation is available [here](http://hop.inria.fr/home/hiphop/modules/http.html).
