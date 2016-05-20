"use strict"

var hh = require("hiphop");

var WatchJs = require("./stopwatch.js");

var WatchMachine =
    new hh.ReactiveMachine(WatchJs.WatchModule, "BUTTON");

hh.batch(WatchMachine);
