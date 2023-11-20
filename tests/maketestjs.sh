#!/bin/sh
#*=====================================================================*/
#*    serrano/prgm/project/hiphop/1.3.x/tests/maketestjs.sh            */
#*    -------------------------------------------------------------    */
#*    Author      :  Manuel Serrano                                    */
#*    Creation    :  Fri Nov 17 12:47:55 2023                          */
#*    Last change :  Mon Nov 20 17:40:33 2023 (serrano)                */
#*    Copyright   :  2023 Manuel Serrano                               */
#*    -------------------------------------------------------------    */
#*    A simple tool to build the macho tests                           */
#*=====================================================================*/

base=`basename $1 .hh.js`
  
echo "'use strict';" > $base.test.js
echo "'use hopscript';" >> $base.test.js
echo "" >> $base.test.js
echo "import * as assert from 'assert';" >> $base.test.js
echo "import { batch } from '../lib/batch.js';" >> $base.test.js
echo "import { mach } from './$1';" >> $base.test.js
echo "import { fileURLToPath } from 'node:url'" >> $base.test.js;
echo "import { basename } from 'path';" >> $base.test.js;
echo "" >> $base.test.js
echo "describe(basename(fileURLToPath(import.meta.url)), () => {" >> $base.test.js;
echo "   it('react', () => {" >> $base.test.js;
echo "      assert.equal(batch(mach, fileURLToPath(import.meta.url)), false);" >> $base.test.js;
echo "   })" >> $base.test.js;
echo "});" >> $base.test.js;



