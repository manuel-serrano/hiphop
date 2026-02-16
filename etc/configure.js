/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/etc/configure.js              */
/*    -------------------------------------------------------------    */
/*    Author      :  Manuel Serrano                                    */
/*    Creation    :  Thu Dec  7 10:09:27 2023                          */
/*    Last change :  Mon Feb 16 07:33:52 2026 (serrano)                */
/*    Copyright   :  2023-26 Manuel Serrano                            */
/*    -------------------------------------------------------------    */
/*    Simple configuration in JavaScript                               */
/*=====================================================================*/

/*---------------------------------------------------------------------*/
/*    import                                                           */
/*---------------------------------------------------------------------*/
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { exec } from "node:child_process";

/*---------------------------------------------------------------------*/
/*    command line:                                                    */
/*      nodejs /etc/configure.js package.json lib/config.js.in         */
/*---------------------------------------------------------------------*/
const json = JSON.parse(readFileSync(process.argv[2]));
const config = readFileSync(process.argv[3]);
const target = process.argv[4];

/*---------------------------------------------------------------------*/
/*    configure                                                        */
/*---------------------------------------------------------------------*/
if (!existsSync(target)) {
   exec("git rev-parse --short HEAD",
	function(error, stdout, stderr){
	   writeFileSync(target, 
			 config.toString()
			    .replace(/@VERSION@/g, json.version)
			    .replace(/@MINOR@/g, json.minor ?? "")
			    .replace(/@HOMEPAGE@/g, json.homepage)
			    .replace(/@HIPHOPBUILDID@/g, stdout.trim())
			    .replace(/@PRAGMAEXPRESSION@/g, "true"));

	});
}


