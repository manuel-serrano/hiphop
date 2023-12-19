HipHop Staging
==============

### Generated Modules ###

This example uses a module generator (the function `Timer`). HipHop modules are
lexically scopped with regard to Hop environment so all the expressions they
contain can refer to Hop variables bound in the environment. In this example,
the function parameter `timeout` is used in the `async` form to set the
timeout duration.

The new modules are directly created when run, using the dollar-form
in the main HipHop program. 

&#x2605; [run3.hh.js](../test/run3.hh.js)


### Example of Dynamically Generated Interfaces ###

When interfaces are to be generated dynamically, the XML interface
must be used.

&#x2605; [imirrodyn.hh.js](../test/imirrodyn.hh.js)


- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
[[main page]](./README.md) | [[language]](../lang.md) | [[license]](../license.md)


