"use strict"

var hh = require("hiphop");

var ButtonJs = require("./button.js");

var ButtonMachine = new hh.ReactiveMachine(ButtonJs.ButtonModule, "BUTTON");

hh.batch(ButtonMachine);

