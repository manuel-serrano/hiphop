/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/testrandom/config.mjs         */
/*    -------------------------------------------------------------    */
/*    Author      :  Manuel Serrano                                    */
/*    Creation    :  Tue Nov 18 07:21:33 2025                          */
/*    Last change :  Thu Nov 27 07:15:08 2025 (serrano)                */
/*    Copyright   :  2025 Manuel Serrano                               */
/*    -------------------------------------------------------------    */
/*    testrandom configuration                                         */
/*=====================================================================*/

export const COUNT = parseInt(process.env.HIPHOP_RT_COUNT) || 5000;
export const LOOPSAFE = process.env?.HIPHOP_RT_LOOPSAFE !== "false";
export const DELAYONLY = process.env?.HIPHOP_RT_DELAYONLY !== "false";
export const REASON = process.env?.HIPHOP_RT_REASON === "true";
export const VERBOSE = parseInt(process.env.HIPHOP_RT_VERBOSE) || 0;
export const MACHINES = process.env.HIPHOP_RT_MACHINES?.split(" ") ?? ["default", "native" ];
export const MINSIZE = parseInt(process.env?.HIPHOP_RT_MINSIZE ?? "5");
export const MAXSIZE = parseInt(process.env?.HIPHOP_RT_MAXSIZE ?? "20");
