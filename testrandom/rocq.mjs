/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/testrandom/rocq.mjs           */
/*    -------------------------------------------------------------    */
/*    Author      :  manuel serrano                                    */
/*    Creation    :  Wed Apr  8 10:55:22 2026                          */
/*    Last change :  Thu Apr  9 07:40:30 2026 (serrano)                */
/*    Copyright   :  2026 manuel serrano                               */
/*    -------------------------------------------------------------    */
/*    Testing HipHop programs with rocq/esterel                        */
/*=====================================================================*/

/*---------------------------------------------------------------------*/
/*    The module                                                       */
/*---------------------------------------------------------------------*/
export { ReactiveMachine };
import { writeFileSync, existsSync, renameSync, unlinkSync } from "node:fs";
import { parseExpr } from "./expr.mjs";
import { spawnSync } from "child_process";

/*---------------------------------------------------------------------*/
/*    require                                                          */
/*---------------------------------------------------------------------*/
import { createRequire } from "module";
const require = createRequire(import.meta.url);

/*---------------------------------------------------------------------*/
/*    makeProg ...                                                     */
/*---------------------------------------------------------------------*/
function makeProg(prog, events) {
   return JSON.stringify({ events, prog });
}

/*---------------------------------------------------------------------*/
/*    ReactiveMachine ...                                              */
/*---------------------------------------------------------------------*/
class ReactiveMachine {
   #rocqfile = "/tmp/rocq.hh.json";
   
   events = [];
   opts = {};
   file;
   prog;
   
   constructor (prog, opts) {
      this.file = opts?.file || this.#rocqfile;
      this.opts = opts;
      this.prog = prog.tojson();
      this.events = [];
   }

   name() {
      return "rocq/esterel";
   }
   
   react(e) {
      this.events.push(e);
   }

   reactDebug(e) {
      return this.react(e);
   }

   end() {
      writeFileSync(this.file, makeProg(this.prog, this.events));

      return this.run(this.file);
   }

   run(file) {
      const semantics = this.opts?.semantics ?? "";
      const child = spawnSync("sh", ["-c", `${require.resolve('./rocq.sh')} ${this.file} ${semantics}`]);
      const out = child.stdout.toString();
      console.error("OUT=[" + out + "]");
      return JSON.parse(out);
   }

   outConf(dir, suffix, { prog, events }) {
      const target = `${dir}/${this.name()}${suffix}.hh.json`;
      writeFileSync(target, makeProg(prog, events));
      return target;
   }
}
