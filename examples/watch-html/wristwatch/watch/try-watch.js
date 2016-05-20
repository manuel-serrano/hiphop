"use hopstrict"

var hh = require("hiphop");

var WatchJs = require("./watch.js");

var WatchMachine =
    new hh.ReactiveMachine(WatchJs.WatchModule, "BUTTON");

hh.batch(WatchMachine);
