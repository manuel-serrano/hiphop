"use strict";
"use hopscript";

import * as hh from "@hop/hiphop";

let prg = <hh.module>
            <hh.local V_S_W>
                <hh.suspend V_S_W><hh.nothing/></hh.suspend>
            </hh.local>
           </hh.module>;

exports.prg = new hh.ReactiveMachine( prg, "EMPTY-SUSPEND" );
