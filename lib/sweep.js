/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/lib/sweep.js                  */
/*    -------------------------------------------------------------    */
/*    Author      :  Manuel Serrano                                    */
/*    Creation    :  Sun Sep 30 02:30:11 2018                          */
/*    Last change :  Tue Jan 28 09:57:33 2025 (serrano)                */
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
import { LogicalNet, SignalNet, ActionNet, RegisterNet, SignalExpressionNet, TestExpressionNet } from "./net.js";
import * as signal from "./signal.js";

export { sweep };

/*---------------------------------------------------------------------*/
/*    checkFan ...                                                     */
/*---------------------------------------------------------------------*/
function checkFan(u, p, fup) {
   const fpu = fup.antagonist;
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
   //console.log(...args);
}

/*---------------------------------------------------------------------*/
/*    deleteNet ...                                                    */
/*    -------------------------------------------------------------    */
/*    Delete a net from the machine net array.                         */
/*---------------------------------------------------------------------*/
function deleteNet(machine, net) {
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
/*    disconnectNetFanouts ...                                         */
/*---------------------------------------------------------------------*/
function disconnectNetFanouts(s) {
   s.fanout_list.forEach(fsu => {
      const u = fsu.net;
      const fus = fsu.antagonist;
      u.fanin_list = u.fanin_list.filter(f => f !== fus);
   });
   s.fanout_list = [];
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
/*    isLogicalSig ...                                                 */
/*---------------------------------------------------------------------*/
function isLogicalSig(net) {
   return (net instanceof SignalNet) || (net instanceof SignalExpressionNet);
}

/*---------------------------------------------------------------------*/
/*    simplifyPureExpressionNets                                       */
/*    -------------------------------------------------------------    */
/*    This removes TestExpressionNet that test pure signal presences.  */
/*---------------------------------------------------------------------*/
function simplifyPureExpressionNets(machine) {

   function signalPureEquation(fun) {
      const s = fun.toString()
	 .replace(/function \(\) {/, "")
	 .replace(/return \(\(\(\) => {/, "")
	 .replace(/}\)\(\)\);/, "")
	 .replace(/}/, "")
	 .trim();
      const e = s.match(/const ([a-zA-Z_$][a-zA-Z0-9_$]*)=this[.]\1;[ ]*return \1[.]now;/);

      if (e) {
	 return e[1];
      } else {
	 return false;
      }
   }

   function simplyPureExpressionNet(n) {
      if (n instanceof TestExpressionNet && n.func && n.accessor_list.length === 1) {
	 const sig = signalPureEquation(n.func);

	 if (sig === n.accessor_list[0].signame) {
	    let m = new LogicalNet(n.ast_node, n.type, "testexpr_to_and", n.lvl, n.neutral);

	    m.sweepable = true;
	    m.fanout_list = n.fanout_list;
	    m.fanin_list = n.fanin_list;
	    m.id = n.id;
	    
	    m.fanout_list.forEach(f => f.antagonist.net = m);
	    m.fanin_list.forEach(f => {
	       f.antagonist.net = m
	       f.dependency = false;
	       f.antagonist.dependency = false;
	    });

	    n.ast_node.net_list.filter(x => x !== n).push(m);
	    
	    return m;
	 }
      }
      return n;
   }
   
   machine.nets = machine.nets.map(simplyPureExpressionNet);
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

      checkFan(u, s, fus);
      fsp.net = p;
      fps.net = s;
      fps.polarity = !xor(fpu.polarity, fus.polarity);
      fsp.polarity = fps.polarity;
      
      fps.antagonist = fsp;
      fsp.antagonist = fps;
      
      p.fanout_list.push(fps);

      s.fanin_list = s.fanin_list.filter(f => f !== fsu);
      s.fanin_list.push(fsp);

      checkFan(p, s, fps);
   }

   function noFanoutNet(u) {
      if (isLogicalSig(u) && (u.accessibility & ast.OUT) !== 0) {
	 // global OUT signal, don't remove
	 return;
      }
      if (u.fanin_list.length === 0) {
	 // orphan net
	 deleteNet(machine, u);
	 res = true;
	 return;
      }
      if (!(u instanceof ActionNet)) {
	 disconnectNetFanins(u);
	 deleteNet(machine, u);
	 res = true;
	 return ;
      }
   }

   function noFaninNet(u) {
      if (isLogicalSig(u) && (u.accessibility & ast.IN) !== 0) {
	 // global IN signal, don't do anything
	 return;
      }
      
      u.fanout_list.forEach(fus => {
	 const s = fus.net;

	 if (fus.dependency) {
	    return;
	 } else if (isLogicalAnd(s) && KAP-- > 0) {
	    checkFan(u, s, fus);
	    consoleLog(">>> CNST.AND(" + KAP + ") u=", u.id, "->", s.id, "AND", fus.dependency, u.neutral, fus.polarity);

	    if ((!u.neutral && fus.polarity) || (u.neutral && !fus.polarity)) {
	       // transform the target and gate into an or with no fanin
	       // i.e., the constant false
	       disconnectNetFanins(s);
	       s.neutral = false;
	       res = true;
	    } else if ((!u.neutral && !fus.polarity) || (u.neutral && fus.polarity)) {
	       // simply disconnect the two nets
	       disconnectNetFanin(s, fus);
	       res = true;
	    }
	 } else if (isLogicalOr(s) && KAP-- > 0) {
	    const fsu = fus.antagonist;
	    checkFan(u, s, fus);

	    consoleLog(">>> CNST.OR(" + KAP + ") u=", u.id, "->", s.id, "AND", fus.dependency, u.neutral, fsu.polarity);
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
      });
   }
   
   function oneFaninNet(u) {
      if ((u instanceof ActionNet) || (u instanceof SignalNet)) {
	 return;
      } else {
	 const fup = u.fanin_list[0];
	 const fpu = fup.antagonist;
	 const p = fup.net;

	 checkFan(u, p, fup);

	 consoleLog("SWEEP(" + KAP + ")", u.id, u.constructor.name);
	 
	 // remove the fan from p to u
	 p.fanout_list = p.fanout_list.filter(f => f !== fpu);

	 // connect p directly to s
	 u.fanout_list.forEach(fus => sweep(u, p, fpu, fus));

	 // remove u from the machine and mark that the net list has changed
	 deleteNet(machine, u);
	 res = true;
      }
   }
   
   let res = false;

   machine.nets.forEach(u => {
      if (!u.sweepable) return;
      if (!u.sweeped && u.fanin_list.length === 1) oneFaninNet(u);
      if (!u.sweeped && u.fanout_list.length === 0) noFanoutNet(u);
      if (!u.sweeped && u.fanin_list.length === 0) noFaninNet(u);
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

   simplifyPureExpressionNets(machine);
   
   while (sweepNets(machine)) {
      ;
   }

   if (machine.verbose && machine.verbose > 0) {
      const nl = machine.nets.length;
      console.error(`sweep ${Math.round(100 * (1 - (nl /l)))}% (${l}->${nl})`);
   }
   return machine;
}
