var Watch = require("./watch.js");

exports.machine = new hh.ReactiveMachine(Watch.WatchModule, "Watch");
