"use strict"

import * as hh from "@hop/hiphop";

const prg = <hh.module T>
  <hh.sequence>
    <hh.pause/>
    <hh.local S>
      <hh.sequence>
	<hh.emit S/>
	<hh.if S>
	  <hh.emit T/>
	</hh.if>
      </hh.sequence>
    </hh.local>
  </hh.sequence>
</hh.module>

exports.prg = new hh.ReactiveMachine(prg, "example1");
