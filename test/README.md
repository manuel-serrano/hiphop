HipHop test suite
=================

There are several options to run the test suite.

1. Using the NPM test suite
---------------------------

In the HipHop main directory, install the NPM test suite:

```
npm install hiphop --save-dev
```

and run the tests:

```
npm test
```

2. Using the builtin driver
---------------------------

Go into the `test` directory and execute

```
node --enable-source-maps --no-warnings --loader ../lib/hiphop-loader.mjs ./all-test.js
```

3. Running an individual test
-----------------------------

Go into the `test` directory and execute

```
HIPHOP_RESOLVE=".." node --enable-source-maps --no-warnings --loader ../lib/hiphop-loader.mjs ./all.test.js -- ./<A-TEST.hh.js>
```

Where you should replace `<A-TEST.hh.js>` with your test. For example:

```
HIPHOP_RESOLVE=".." node --enable-source-maps --no-warnings --loader ../lib/hiphop-loader.mjs ./all.test.js -- ./incr-type.hh.js
```

4. Manual compilation
---------------------

Go into the `test` directory and execute

```
node ../lib/hhc.js <A-TEST.hh.js>
```

5. Adding a new test
--------------------

Create a new test file `my-new-test.hh.js` and its corresponding output
file `my-nest-test.out` file in the `test` directory. It will be 
scanned and executed by the `npm test` command.
