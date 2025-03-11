/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/lib/sweep.js                  */
/*    -------------------------------------------------------------    */
/*    Author      :  Manuel Serrano                                    */
/*    Creation    :  Sun Sep 30 02:30:11 2018                          */
/*    Last change :  Wed Mar  5 10:52:45 2025 (serrano)                */
/*    Copyright   :  2018-25 Manuel Serrano                            */
/*    -------------------------------------------------------------    */
/*    HipHop Sweep optimization                                        */
/*=====================================================================*/
"use strict"
"use hopscript"

/*---------------------------------------------------------------------*/
/*    es6 module                                                       */
/*---------------------------------------------------------------------*/
import { Process as process } from "./config.js"
import * as ast from "./ast.js";
import * as error from "./error.js";
import { LogicalNet, SignalNet, ActionNet, RegisterNet, SignalExpressionNet,
	 TestExpressionNet, WireNet, FAN, makeOr, makeAnd } from "./net.js";
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
/*    Debug                                                            */
/*---------------------------------------------------------------------*/
const DEBUG = process.env.KAP;
const KAP = DEBUG ? parseInt(DEBUG) : Number.MAX_SAFE_INTEGER;
let K = 0;

/*---------------------------------------------------------------------*/
/*    consoleLog ...                                                   */
/*---------------------------------------------------------------------*/
function consoleLog(...args) {
   if (DEBUG) {
      console.error(...args);
   }
}

/*---------------------------------------------------------------------*/
/*    debugNet ...                                                     */
/*---------------------------------------------------------------------*/
function debugNet(u, msg) {
   if (DEBUG) {
      consoleLog(K++ + ":", msg, "[" + u.id + "]",
		 "in:", u.faninList.map(f => f.net.id).join(", "),
		 "out:", u.fanoutList.map(f => f.net.id).join(", "));
   }
}

/*---------------------------------------------------------------------*/
/*    deleteNet ...                                                    */
/*    -------------------------------------------------------------    */
/*    Delete a net from the machine net array.                         */
/*---------------------------------------------------------------------*/
function deleteNet(machine, net, reason) {
   net.sweeped = true;
   consoleLog(K++ + ":", "deleteNet", "[" + net.id + "]", reason);
}

/*---------------------------------------------------------------------*/
/*    disconnectNetFanins ...                                          */
/*---------------------------------------------------------------------*/
function disconnectNetFanins(s) {
   s.faninList.forEach(fsu => {
      const u = fsu.net;
      const fus = fsu.antagonist;
      u.fanoutList = u.fanoutList.filter(f => f !== fus);
   });
   s.faninList = [];
}

/*---------------------------------------------------------------------*/
/*    disconnectNetFanouts ...                                         */
/*---------------------------------------------------------------------*/
function disconnectNetFanouts(s) {
   s.fanoutList.forEach(fsu => {
      const u = fsu.net;
      const fus = fsu.antagonist;
      u.faninList = u.faninList.filter(f => f !== fus);
   });
   s.fanoutList = [];
}

/*---------------------------------------------------------------------*/
/*    disconnectNetFanin ...                                           */
/*---------------------------------------------------------------------*/
function disconnectNetFanin(s, fus) {
   const fsu = fus.antagonist;
   const u = fsu.net;
   
   s.faninList = s.faninList.filter(f => {
      if (f === fsu) {
	 u.fanoutList = u.fanoutList.filter(f => f !== fus);
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
   return (net instanceof LogicalNet) && net.neutral === true
}

/*---------------------------------------------------------------------*/
/*    isLogicalOr ...                                                  */
/*---------------------------------------------------------------------*/
function isLogicalOr(net) {
   return (net instanceof LogicalNet) && net.neutral === false;
}

/*---------------------------------------------------------------------*/
/*    isConst0 ...                                                     */
/*---------------------------------------------------------------------*/
function isConst0(net) {
   return isLogicalOr(net) && net.faninList.length === 0;
}

/*---------------------------------------------------------------------*/
/*    isConst1 ...                                                     */
/*---------------------------------------------------------------------*/
function isConst1(net) {
   return isLogicalAnd(net) && net.faninList.length === 0;
}

/*---------------------------------------------------------------------*/
/*    isLogicalSig ...                                                 */
/*---------------------------------------------------------------------*/
function isLogicalSig(net) {
   return (net instanceof SignalNet) || (net instanceof SignalExpressionNet);
}

/*---------------------------------------------------------------------*/
/*    isOrToOr ...                                                     */
/*    -------------------------------------------------------------    */
/*    True iff NET is an or-gate connected to other or-gates.          */
/*---------------------------------------------------------------------*/
function isOrToOr(net) {
   return isLogicalOr(net)
      && Object.getPrototypeOf(net) === LogicalNet.prototype
      && net.faninList.every(fus => !fus.antagonist.dependency)
      && net.fanoutList.every(fus => fus.polarity && !fus.dependency && isLogicalOr(fus.net));
}

/*---------------------------------------------------------------------*/
/*    isAndToAnd ...                                                   */
/*    -------------------------------------------------------------    */
/*    True iff NET is an and-gate connected to other and-gates.        */
/*---------------------------------------------------------------------*/
function isAndToAnd(net) {
   return isLogicalAnd(net)
      && Object.getPrototypeOf(net) === LogicalNet.prototype
      && net.faninList.every(fus => !fus.antagonist.dependency)
      && net.fanoutList.every(fus => fus.polarity && !fus.dependency && isLogicalAnd(fus.net));
}

/*---------------------------------------------------------------------*/
/*    isTautology ...                                                  */
/*    -------------------------------------------------------------    */
/*    True iff a same net is connected twice to NET with two           */
/*    different polarities.                                            */
/*---------------------------------------------------------------------*/
function isTautology(net) {
   const faninList = net.faninList;
   for (let i = 0; i < faninList.length - 1; i++) {
      const f = faninList[i];
      const n = f.net;

      for (let j = i + 1; j < faninList.length; j++) {
	 if (faninList[j].net === n) {
	    if (faninList[j].polarity !== f.polarity) {
	       return true;
	    }
	 }
      }
   }
   return false;
}

/*---------------------------------------------------------------------*/
/*    isConnected ...                                                  */
/*---------------------------------------------------------------------*/
function isConnected(from, to, polarity) {
   return from.fanoutList.find(fus => fus.net === to && fus.polarity === polarity);
}

/*---------------------------------------------------------------------*/
/*    isDependent ...                                                  */
/*---------------------------------------------------------------------*/
function isDependent(from, to) {
   return from.fanoutList.find(fus => fus.net === to && fus.dependency);
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
	    let m = new LogicalNet(n.astNode, "testexpr_as_and", n.lvl, n.neutral);

	    m.sweepable = true;
	    m.fanoutList = n.fanoutList;
	    m.faninList = n.faninList;
	    m.id = n.id;
	    
	    m.fanoutList.forEach(f => f.antagonist.net = m);
	    m.faninList.forEach(f => {
	       f.antagonist.net = m
	       f.dependency = false;
	       f.antagonist.dependency = false;
	    });

	    n.astNode.net_list.filter(x => x !== n).push(m);
	    
	    return m;
	 }
      }
      return n;
   }
   
   machine.nets = machine.nets.map(simplyPureExpressionNet);
}

/*---------------------------------------------------------------------*/
/*    exor ...                                                         */
/*    -------------------------------------------------------------    */
/*    electronic xor:                                                  */
/*      0 exor 0 => 0                                                  */
/*      1 exor 0 => 1                                                  */
/*      0 exor 1 => 1                                                  */
/*      1 exor 1 => 0                                                  */
/*---------------------------------------------------------------------*/
function exor(p, q) {
   return !(p === q);
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
/*              !(Fup.polarity exor Fsu.polarity)                      */
/*---------------------------------------------------------------------*/
function sweepNets(machine, fullSweep) {
   
   function noFanoutNet(u) {
      if (isLogicalSig(u) && (u.accessibility & ast.OUT) !== 0) {
	 // global OUT signal, don't remove
	 return;
      }

      if (u.faninList.length === 0) {
	 // orphan net
	 deleteNet(machine, u, "noFanout");
	 res = true;
	 return;
      }
      if (!(u instanceof ActionNet)) {
	 disconnectNetFanins(u);
	 deleteNet(machine, u, "noFanout");
	 res = true;
	 return ;
      }
   }

   function noFaninNet(u) {
      if (isLogicalSig(u) && (u.accessibility & ast.IN) !== 0) {
	 // global IN signal, don't do anything
	 return;
      }

      debugNet(u, "noFanin");
	 
      u.fanoutList.forEach(fus => {
	 const s = fus.net;

	 if (fus.dependency) {
	    return;
	 } else if (isLogicalAnd(s)) {
	    checkFan(u, s, fus);

	    if ((!u.neutral && fus.polarity) || (u.neutral && !fus.polarity)) {
	       // transform the target and-gate into an or-gate with no fanin
	       // i.e., the constant false
	       disconnectNetFanins(s);
	       s.neutral = false;
	       res = true;
	    } else if ((!u.neutral && !fus.polarity) || (u.neutral && fus.polarity)) {
	       // simply disconnect the two nets
	       disconnectNetFanin(s, fus);
	       res = true;
	    }
	 } else if (isLogicalOr(s)) {
	    const fsu = fus.antagonist;
	    checkFan(u, s, fus);

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
      if (((u instanceof ActionNet) || (u instanceof SignalNet))
	 && (!isConst0(u.faninList[0].net) || u.faninList[0].antagonist.dependency)) {
	 return;
      } else if (u.faninList[0].dependency || u.fanoutList.find(f => f.dependency)) {
	 return;
      } else {
	 const fanoutList = u.fanoutList;
	 const fup = u.faninList[0];
	 const fpu = fup.antagonist;
	 const p = fup.net;

	 checkFan(u, p, fup);

	 // remove the fan from p to u
	 disconnectNetFanins(u);
	 disconnectNetFanouts(u);

	 // connect p directly to s
	 fanoutList.forEach(fus => {
	    const s = fus.net;
	    const polarity = !exor(fpu.polarity, fus.polarity);

	    if (!isConnected(p, s, polarity)) {
	       p.connectTo(s, polarity ? FAN.STD : FAN.NEG);
	    }
	 });

	 // remove u from the machine and mark that the net list has changed
	 deleteNet(machine, u, "oneFanin");
	 res = true;
      }
   }

   function gateToGate(u) {
      const fpuList = u.faninList;
      const fusList = u.fanoutList;

      disconnectNetFanins(u);
      disconnectNetFanouts(u);

      fpuList.forEach(fpu => {
	 const p = fpu.net;
	 fusList.forEach(fus => {
	    const s = fus.net;
	    const polarity = !exor(fpu.polarity, fus.polarity);
	       
	    if (!isConnected(p, s, polarity)) {
	       p.connectTo(s, polarity ? FAN.STD : FAN.NEG);
	    }
	 });
      });

      deleteNet(machine, u, `gateToGate ${u.id}+[${fusList.map(f => f.net.id).join(", ")}]`)

      res = true;
   }

   function tautology(u) {
      const fusList = u.fanoutList;

      disconnectNetFanins(u);

      consoleLog(K++ + ":", "tautology", "[" + u.id + "]");
      u.neutral = isLogicalOr(u);
      res = true;
   }
   
   let res = false;

   machine.nets.forEach(u => {
      if (K < KAP) {
	 if (!u.sweepable) return;
	 if (!u.sweeped && u.faninList.length === 1 && !u.faninList[0].dependency) oneFaninNet(u);
	 if (!u.sweeped && u.fanoutList.length === 0) noFanoutNet(u);
	 if (!u.sweeped && u.faninList.length === 0) noFaninNet(u);
	 
	 if (!fullSweep) return;
	 if (!u.sweeped && isOrToOr(u)) gateToGate(u);
	 if (!u.sweeped && isAndToAnd(u)) gateToGate(u);
	 if (!u.sweeped && isTautology(u)) tautology(u);
      }
   });

   // remove all the deleted nets from the list
   if (res) {
      machine.nets = machine.nets.filter(u => !u.sweeped);
   }

   return res;
}

/*---------------------------------------------------------------------*/
/*    unwire ...                                                       */
/*    -------------------------------------------------------------    */
/*    Remove all the wire nets by directly reconnecting the fanins     */
/*    to the fanouts.                                                  */
/*    -------------------------------------------------------------    */
/*    The wire nets are a temporary construct used by the compiler     */
/*    to make its code more readable.                                  */
/*---------------------------------------------------------------------*/
function unwire(machine) {
   machine.nets.forEach(u => {
      if (u instanceof WireNet && u.sweepable && (K < KAP || KAP < 0)) {
	 const faninList = u.faninList;
	 const fanoutList = u.fanoutList;
	 
	 disconnectNetFanins(u);
	 disconnectNetFanouts(u);

	 fanoutList.forEach(fus => {
	    const s = fus.net;

	    if (faninList.length === 0) {
	       const const0 = makeOr(u.astNode, u.debugName);
	       const0.connectTo(s, fus.polarity ? FAN.STD : FAN.NEG);
	    } else {
	       faninList.forEach(fpu => {
		  const p = fpu.net;
		  const polarity = !exor(fpu.polarity, fus.polarity);

		  if (!isConnected(p, s, polarity)) {
		     p.connectTo(s, polarity ? FAN.STD : FAN.NEG);
		  }
	       });
	    }
	 });
	 
	 deleteNet(machine, u, "unwire");
      }
   });

   machine.nets = machine.nets.filter(n => !n.sweeped);
   
   return machine;
}

/*---------------------------------------------------------------------*/
/*    sweep ...                                                        */
/*---------------------------------------------------------------------*/
function sweep(machine) {
   const l = machine.nets.length;
   const sweepstart = Date.now();
   K = 0;
   
   if (machine.dumpNets) {
      machine.dumpNets(machine, false, ".nets-.json");
   }

   machine.status.sweep.nets = l;

   unwire(machine);
   
   machine.status.sweep.wire = l - machine.nets.length;
      
   if (machine.sweep) {
      simplifyPureExpressionNets(machine);
      // run a first shallow sweep to remove constants
      sweepNets(machine, false);

      // run deep sweep to optimize to the max
      while (sweepNets(machine, true)) {
	 ;
      }

      machine.status.sweep.sweeped = machine.nets.length;
      
      if (machine.verbose && machine.verbose > 0) {
	 const nl = machine.nets.length;
	 machine.status.sweep.reduction = `${Math.round(100 * (1 - (nl /l)))}%`;
      }

      // debug
      if (KAP < 0) {
	 const w = [];
	 machine.nets.forEach(u => {
	    if (u instanceof WireNet && u.sweepable) {
	       w.push(u.id + ":" + u.debugName);
	    }
	    u.fanoutList.forEach(f => {
	       if (f.net instanceof WireNet && f.net.sweepable) {
		  w.push("->" + f.net.id + ":" + f.net.debugName);
	       }
	    });
	 });

	 if (w.length > 0) {
	    throw new Error(`sweep left wires [${w.join(", ")}]`);
	 }
      }
   }
   
   if (machine.dumpNets) {
      machine.dumpNets(machine, false, ".nets+.json");
   }


   machine.status.sweep.time = Date.now() - sweepstart;
   return machine;
}
