/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/doc/draw/example.mjs          */
/*    -------------------------------------------------------------    */
/*    Author      :  manuel serrano                                    */
/*    Creation    :  Fri Jan  9 09:49:26 2026                          */
/*    Last change :  Mon Jan 12 13:04:40 2026 (serrano)                */
/*    Copyright   :  2026 manuel serrano                               */
/*    -------------------------------------------------------------    */
/*    An example of circuit                                            */
/*=====================================================================*/

/*---------------------------------------------------------------------*/
/*    The module                                                       */
/*---------------------------------------------------------------------*/
import { writeFileSync, existsSync, renameSync, unlinkSync } from "node:fs";
import { svg, xml } from "./svg.mjs";
import { seq } from "./circuit.mjs";

const s = seq({box: true}, "P", "Q");
writeFileSync("seq.svg", xml(svg({width: s.width + s.x, height: s.height + s.y}, s.svg)));
