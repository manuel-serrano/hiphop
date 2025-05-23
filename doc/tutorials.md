<!-- ${ var doc = require( "@hop/hopdoc" ) }
${ var config = require( hop.config ) }
${ var xml = require( config.docDir + "/xml.js" ) }
${ var cfg = require( "./doc.json" ) }
${ var dockerurl = cfg.urlbase + "docker.tgz" }
${ const pkg = require( "../package.json" ) } -->

Tutorials and Examples
======================

Tutorials
---------

#### First Steps

[hiphop-tutorial-first](https://github.com/manuel-serrano/hiphop/tree/master/tutorials/hiphop-tutorial-first)

This tutorial will guide you in your first steps with HipHop. It will
teach you how to write your first programs and how to compile and
execute them. It will teach you how to use the elementary control
flow operators HipHop provides.


#### Asynchrony

[hiphop-tutorial-async](https://github.com/manuel-serrano/hiphop/tree/master/tutorials/hiphop-tutorial-async)

This tutorial focuses on HipHop `async` forms that are used to map the
asynchronous world of JavaScript to the synchronous world of
HipHop. This tutorial will teach you how to spawn, suspend, and resume
asynchronous tasks (that one needs, for instance, to spawn an HTTP
request or to start a multimedia playback) from within HipHop.


#### Staging

[icfp24-artifact](https://github.com/manuel-serrano/icfp2024-sudoku)

In this tutorial you will learn how to use HipHop multi-staging from
within JavaScript. This tutorial will teach you how to write a JavaScript
programs that generates a HipHop program that solves Sudoku puzzle.

Examples
--------

#### Prims

[prims](https://github.com/manuel-serrano/hiphop/tree/master/examples/prims)

This example shows how to use HipHop on web client side and how to
use dynamic program modification to add new threads to a running HipHop
program.


#### Matrix

[matrix](https://github.com/manuel-serrano/hiphop/tree/master/examples/matrix)

This example shows how to use HipHop on web client side, it illustrates how
to use signal dynamic names, and the benefit of native compilation.


#### Translator

[translator](https://github.com/manuel-serrano/hiphop/tree/master/examples/translator)

This example shows how to use `async` forms on the client side to let HipHop
control HTTP requests.


- - - - - - - - - - - - - - - - - - - - - - - - - - - 
[[main page]](../README.md) | [[documentation]](./README.md)  | [[license]](./license.md)


