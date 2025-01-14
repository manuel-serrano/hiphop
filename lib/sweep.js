/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/lib/sweep.js                  */
/*    -------------------------------------------------------------    */
/*    Author      :  Manuel Serrano                                    */
/*    Creation    :  Sun Sep 30 02:30:11 2018                          */
/*    Last change :  Tue Jan 14 14:52:51 2025 (serrano)                */
/*    Copyright   :  2018-25 Manuel Serrano                            */
/*    -------------------------------------------------------------    */
/*    HipHop Sweep optimization                                        */
/*=====================================================================*/
"use strict"
"use hopscript"

/*---------------------------------------------------------------------*/
/*    es6 module                                                       */
/*---------------------------------------------------------------------*/
import * as ast from "./ast.js";
import * as error from "./error.js";
import { LogicalNet, ActionNet, RegisterNet } from "./net.js";
import * as signal from "./signal.js";

export { sweep };

/*---------------------------------------------------------------------*/
/*    checkFan ...                                                     */
/*---------------------------------------------------------------------*/
function checkFan(u, p, fup, fpu) {
   // debug
   if (fup.net !== p) { console.error("fup.net !== p"); process.exit(1) }
   if (fpu.net !== u) { console.error("fpu.net !== u"); process.exit(1) }
   if (fup.antagonist !== fpu) { console.error("fup.antagonist !== fpu"); process.exit(1) }
   if (fpu.antagonist !== fup) { console.error("fpu.antagonist !== fup"); process.exit(1) }
   if (fpu.polarity !== fup.polarity) { console.error("polarity mismatch"); process.exit(1) }
}

/*---------------------------------------------------------------------*/
/*    consoleLog ...                                                   */
/*---------------------------------------------------------------------*/
function consoleLog(...args) {
   // console.log(...args);
}

/*---------------------------------------------------------------------*/
/*    deleteNet ...                                                    */
/*    -------------------------------------------------------------    */
/*    Delete a net from the machine net array.                         */
/*---------------------------------------------------------------------*/
function deleteNet(machine, net) {
/*    const i = machine.nets.findIndex(n => n === net);                */
/*    machine.nets.splice(i, 1);                                       */
   net.sweeped = true;
}

/*---------------------------------------------------------------------*/
/*    disconnectNetFanins ...                                          */
/*---------------------------------------------------------------------*/
function disconnectNetFanins(s) {
   s.fanin_list.forEach(fsu => {
      const u = fsu.net;
      const fus = fsu.antagonist;
      u.fanout_list = u.fanout_list.filter(f => f !== fus);
   });
   s.fanin_list = [];
}

/*---------------------------------------------------------------------*/
/*    disconnectNetFanin ...                                           */
/*---------------------------------------------------------------------*/
function disconnectNetFanin(s, fus) {
   const fsu = fus.antagonist;
   const u = fsu.net;
   
   s.fanin_list = s.fanin_list.filter(f => {
      if (f === fsu) {
	 u.fanout_list = u.fanout_list.filter(f => f !== fus);
	 return false;
      } else {
	 return true;
      }
   });
}

/*---------------------------------------------------------------------*/
/*    isLogicalAnd ...                                                 */
/*---------------------------------------------------------------------*/
function isLogicalAnd(net) {
   return (net instanceof LogicalNet)
      && net.neutral === true;
}

/*---------------------------------------------------------------------*/
/*    isLogicalOr ...                                                  */
/*---------------------------------------------------------------------*/
function isLogicalOr(net) {
   return (net instanceof LogicalNet)
      && net.neutral === false;
}

/*---------------------------------------------------------------------*/
/*    isSig ...                                                        */
/*---------------------------------------------------------------------*/
function isSig(net) {
   return isLogicalOr(net) && !net.sweepable;
}

/*---------------------------------------------------------------------*/
/*    sweepNets ...                                                    */
/*    -------------------------------------------------------------    */
/*    Apply two transformations:                                       */
/*    1) Remove logical nets with no fanin                             */
/*       For that, propagate the neutral value to all the fanouts      */
/*    2) Remove logical nets with single fanin                         */
/*       p --> u  +--> s                                               */
/*                +--> s'                                              */
/*                +--> s''                                             */
/*       Let's name "fxy" a (directed) fan that connects x to y.       */
/*       To remove nets u that have a single fanin by applying the     */
/*       rules:                                                        */
/*         - Let u a net with a single fanin fup, from a net p;        */
/*         - Let s a net in u's fanout; let fsu the s's fanin          */
/*           that connects it to u.                                    */
/*         => Redirect P to S with the polarity:                       */
/*              !(Fup.polarity xor Fsu.polarity)                       */
/*---------------------------------------------------------------------*/
let KAP = process.env.KAP ? parseInt(process.env.KAP) : 100000;
function sweepNets(machine) {
   
   function xor(p, q) {
      return (p || q) && !(p && q);
   }
   
   function sweep(u, p, fpu, fus) {
      // sweep a net by re-connecting fanin to fanout.
      const s = fus.net;
      const fsu = fus.antagonist;
      const fps = Object.assign({}, fpu);
      const fsp = Object.assign({}, fsu);

      checkFan(u, s, fus, fsu);
      fsp.net = p;
      fps.net = s;
      fps.polarity = !xor(fpu.polarity, fus.polarity);
      fsp.polarity = fps.polarity;
      
      fps.antagonist = fsp;
      fsp.antagonist = fps;
      
      p.fanout_list.push(fps);

      s.fanin_list = s.fanin_list.filter(f => f !== fsu);
      s.fanin_list.push(fsp);

      checkFan(p, s, fps, fsp);
   }

   function sweepSweepableNet(u) {
      if (u.fanin_list.length === 0) {
	 u.fanout_list.forEach(fus => {
	    const s = fus.net;

	    if (!fus.dependency) {
	       if (isLogicalAnd(s) && KAP-- > 0) {
		  const fsu = fus.antagonist;

		  checkFan(u, s, fus, fsu);
		  consoleLog(">>> CNST.AND(" + KAP + ") u=", u.debug_id, "->", s.debug_id, "AND", fus.dependency, u.neutral, fsu.polarity);

		  if ((!u.neutral && fsu.polarity) || (u.neutral && !fsu.polarity)) {
		     // transform the target and gate into an or with no fanin
		     // i.e., the constant false
		     disconnectNetFanins(s);
		     s.neutral = false;
		     res = true;
		  } else if ((!u.neutral && !fsu.polarity) || (u.neutral && fsu.polarity)) {
		     // simply disconnect the two nets
		     disconnectNetFanin(s, fus);
		     res = true;
		  }
	       } else if (isLogicalOr(s) && KAP-- > 0) {
		  const fsu = fus.antagonist;
		  checkFan(u, s, fus, fsu);

		  consoleLog(">>> CNST.OR(" + KAP + ") u=", u.debug_id, "->", s.debug_id, "AND", fus.dependency, u.neutral, fsu.polarity);
		  if ((!u.neutral && !fsu.polarity) || (u.neutral && fsu.polarity)) {
		     // transform the target and gate into an and with no fanin
		     // i.e., the constant true
		     disconnectNetFanins(s);
		     s.neutral = true;
		     res = true;
		  } else if ((!u.neutral && fsu.polarity) || (u.neutral && !fsu.polarity)) {
		     // simply disconnect the two nets
		     disconnectNetFanin(s, fus);
		     res = true;
		  }
	       }
	    }
	 });
	 
	 if (u.fanout_list.length === 0 && KAP-- > 0) {
	    consoleLog("DELETE(" + KAP + ")", u.debug_id);
	    deleteNet(machine, u);
	 }
      } else if (u.fanout_list.length === 0 && KAP-- > 0) {
	 consoleLog("DEADEND(" + KAP + ")", u.debug_id);
	 if (u.fanin_list.length !== 0) {
	    disconnectNetFanins(u);
	 }
	 deleteNet(machine, u);
	 res = true;
      } else if (u.fanin_list.length === 1 && KAP-- > 0) {
	 const fup = u.fanin_list[0];
	 const fpu = fup.antagonist;
	 const p = fup.net;

	 checkFan(u, p, fup, fpu);

	 consoleLog("SWEEP(" + KAP + ")", u.debug_id);
	 // remove the fan from p to u
	 p.fanout_list = p.fanout_list.filter(f => f !== fpu);

	 // connect p directly to s
	 u.fanout_list.forEach(fus => sweep(u, p, fpu, fus));

	 // remove u from the machine and mark that the net list has changed
	 deleteNet(machine, u);
	 res = true;
      }
   }


   function sweepAnyNet(u) {
      if (u.fanout_list.length === 0) {
	 if (u.fanin_list.length === 0) {
	    // orphan
	    if (u instanceof ActionNet) {
	       if (!u.neutral) {
		  deleteNet(machine, u);
		  res = true;
	       }
	    } else {
	    }
	 } else {
	    // deadend
	    if (!(u instanceof ActionNet) && !(u instanceof RegisterNet)) {
	       // dont remove signets
	       if (!isSig(u)) {
		  disconnectNetFanins(u);
		  deleteNet(machine, u);
		  res = true;
	       }
	    }

	    if (u instanceof RegisterNet) {
	       disconnectNetFanins(u);
	       deleteNet(machine, u);
	       res = true;
	    }
	 }
      }
   }
   
   let res = false;


   //console.log("nets.length=", machine.nets.length, Math.round(Date.now() / 1000));
   machine.nets.forEach(u => {
      // sweepable nets
      if (!u.sweeped && u.sweepable) {
	 sweepSweepableNet(u);
      }

      // all nets
      if (!u.sweeped) {
	 sweepAnyNet(u);
      }
   });

   // remove all the deleted nets from the list
   if (res) {
      machine.nets = machine.nets.filter(u => !u.sweeped);
   }
   return res;
}

/*---------------------------------------------------------------------*/
/*    sweep ...                                                        */
/*---------------------------------------------------------------------*/
function sweep(machine) {
   const l = machine.nets.length;
   while (sweepNets(machine)) {
      ;
   }

   if (machine.verbose && machine.verbose > 0) {
      console.log("sweep:", l, "->", machine.nets.length,
		  ((Math.round(machine.nets.length * 100) /l) + "%"));
   }
   return machine;
}
