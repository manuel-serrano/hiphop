# Random, property-based testing

A quickcheck-inspired library to test that various different options
of HipHop evaluate programs to the same results.

- test.mjs: runs the random testing

- gen.mjs: generates random HipHop modules

- prop.mjs: defines the property that three different modes of HipHop compute the same results

- shrink.mjs: shrinks counterexamples

Here is an example of how to create a HipHop program using the HipHop
program api:

```
const prg = hh.MODULE(
   {},
   hh.LOCAL(
      {},
      hh.SIGNAL(
	 { 'name': 'V_S_C' }),
      hh.SIGNAL(
	 { 'name': 'V_S_i' }),
      hh.IF(
	 {
	    'apply': function() {
	       return ((() => {
		  const V_S_C = this.V_S_C;
		  return V_S_C.now;
	       })());
	    }
	 }, hh.SIGACCESS(
	    {
	       'signame': 'V_S_C',
	       'pre': false,
	       'val': false,
	       'cnt': false
	    }),
	 hh.NOTHING(
	    {})),
      hh.IF(
	 {
	    'apply': function() {
	       return ((() => {
		  const V_S_i = this.V_S_i;
		  return V_S_i.now;
	       })());
	    }
	 }, hh.SIGACCESS(
	    {
	       'signame': 'V_S_i',
	       'pre': false,
	       'val': false,
	       'cnt': false
	    }), hh.EMIT(
	       { 'signame': 'V_S_C' })),
      hh.ATOM({
	 'apply': function() {
	    console.log('ok');
	 }
      })));
```
