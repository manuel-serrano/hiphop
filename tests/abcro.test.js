"use strict";
"use hopscript";

import * as assert from "assert";
import { batch } from "../lib/batch.js";
import { mach } from "./abcro.hh.js";
import { fileURLToPath } from 'node:url';
import { basename } from "path";

describe(basename(fileURLToPath(import.meta.url)), () => {
   it('react', () => {
      assert.ok(!batch(mach, fileURLToPath(import.meta.url)));
   })
});

