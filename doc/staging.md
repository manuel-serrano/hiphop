HipHop Staging
==============

This chapter is obsolete and must be revised.

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

Dynamic programs
----------------

HipHop `fork` and `sequence` statements can be modified in between two
reactions using the function `appendChild`.

### mach.getElementById(id) ###

Returns the HipHop `fork` or `sequence` labeld with `id`.

### mach.appendChild(node, hhstmt) ###
[:@glyphicon glyphicon-tag function]

Append a child to a statement. If `node` is a `fork` construct, the
child is added as a new parallel branch. If node is a sequence, the
child is added after the node children.

### mach.removeChild(node, child) ###
[:@glyphicon glyphicon-tag function]

Remove a child.

Example:

${ <span class="label label-info">appendseqchild.js</span> }

```hopscript
${ doc.include("../tests/appendseqchild.hh.js") }
```


- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
[[main page]](../README.md) | [[documentation]](./README.md) | [[license]](./license.md)



