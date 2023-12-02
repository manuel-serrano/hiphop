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

```node --enable-source-maps --no-warnings --experimental-loader ../lib/hiphop-hook.mjs ./all-test.js
```

3. Running an individual test
-----------------------------

Go into the `test` directory and execute

```node --enable-source-maps --no-warnings --experimental-loader ../lib/hiphop-hook.mjs ./all.test.js -- ./<A-TEST.hh.js>
```

Where you should replace `<A-TEST.hh.js>` with your test. For example:


```node --enable-source-maps --no-warnings --experimental-loader ../lib/hiphop-hook.mjs ./all.test.js -- ./incr-type.hh.js`
```
