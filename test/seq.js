"use strict";

import * as hh from "@hop/hiphop";

const t = <hh.module n=${{accessibility: hh.IN}}>
  <hh.sequence>
    <hh.atom apply=${function() { console.log( "1", this.n.nowval ) }}/>
    <hh.atom apply=${function() { console.log( "2" ) }}/>
  </hh.sequence>
</hh.module>;

new hh.ReactiveMachine( t ).react( {n: 34} );
