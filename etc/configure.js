/*=====================================================================*/
/*    serrano/prgm/project/hiphop/1.3.x/etc/configure.js               */
/*    -------------------------------------------------------------    */
/*    Author      :  Manuel Serrano                                    */
/*    Creation    :  Thu Dec  7 10:09:27 2023                          */
/*    Last change :  Thu Dec  7 10:21:33 2023 (serrano)                */
/*    Copyright   :  2023 Manuel Serrano                               */
/*    -------------------------------------------------------------    */
/*    Simple configuration in JavaScript                               */
/*=====================================================================*/

/*---------------------------------------------------------------------*/
/*    import                                                           */
/*---------------------------------------------------------------------*/
import { readFileSync } from "fs";
import { exec } from "child_process";

/*---------------------------------------------------------------------*/
/*    command line:                                                    */
/*      nodejs /etc/configure.js package.json lib/config.js.in         */
/*---------------------------------------------------------------------*/
const json = JSON.parse(readFileSync(process.argv[2]));
const config = readFileSync(process.argv[3]);

/*---------------------------------------------------------------------*/
/*    configure                                                        */
/*---------------------------------------------------------------------*/
exec("git rev-parse --short HEAD",
     function(error, stdout, stderr){
	console.log(
	   config.toString()
	      .replace(/@VERSION@/g, json.version)
	      .replace(/@MINOR@/g, json.minor ?? "")
	      .replace(/@HIPHOPBUILDID@/g, stdout.trim()));
     });


