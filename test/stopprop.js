"use hopscript"

import * as hh from "@hop/hiphop"

const prg =
    <hh.module O>
      <hh.loop>
	<hh.emit O/>
	<hh.pause/>
      </hh.loop>
    </hh.module>;

const m = new hh.ReactiveMachine(prg, "foo");

m.addEventListener("O", function(evt) {
   console.log("first", evt.type);
});

m.addEventListener("O", function(evt) {
   evt.stopPropagation();
   console.log("second", evt.type);
});

m.addEventListener("O", function(evt) {
   console.log("third", evt.type);
});

exports.prg = m;
