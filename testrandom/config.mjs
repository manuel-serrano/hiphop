/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/testrandom/config.mjs         */
/*    -------------------------------------------------------------    */
/*    Author      :  Manuel Serrano                                    */
/*    Creation    :  Tue Nov 18 07:21:33 2025                          */
/*    Last change :  Wed Apr  8 11:37:11 2026 (serrano)                */
/*    Copyright   :  2025-26 Manuel Serrano                            */
/*    -------------------------------------------------------------    */
/*    testrandom configuration                                         */
/*=====================================================================*/

export const ITERATIONS = parseInt(process.env.HIPHOP_RT_ITERATIONS) || 10000;
export const LOOPSAFE = process.env?.HIPHOP_RT_LOOPSAFE !== "false";
export const DELAYONLY = process.env?.HIPHOP_RT_DELAYONLY !== "false";
export const VERBOSE = parseInt(process.env.HIPHOP_RT_VERBOSE) || 0;
export const SYSTEMS = process.env.HIPHOP_RT_SYSTEMS?.split(" ") ?? [ "hiphop", "loopunroll", "trapunroll" ];
export const MINSIZE = parseInt(process.env?.HIPHOP_RT_MINSIZE ?? "5");
export const MAXSIZE = parseInt(process.env?.HIPHOP_RT_MAXSIZE ?? "20");
export const MAXLOOP = parseInt(process.env?.HIPHOP_RT_MAXLOOP ?? "10");
export const MAXTRY = parseInt(process.env?.HIPHOP_RT_MAXTRY ?? "10");
