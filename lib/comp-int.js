/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/lib/comp-int.js               */
/*    -------------------------------------------------------------    */
/*    Author      :  Colin Vidal, Manuel Serrano                       */
/*    Creation    :  Mon Jul 16 18:06:28 2018                          */
/*    Last change :  Fri Mar 13 20:49:40 2026 (serrano)                */
/*    Copyright   :  2018-26 Inria                                     */
/*    -------------------------------------------------------------    */
/*    HipHop compiler                                                  */
/*    -------------------------------------------------------------    */
/*    The compilation of HipHop programs implements the translations   */
/*    of Chapter 11 & 12 of Berry's book:                              */
/*      The Constructive Semantics of Pure Esterel, Draft Version 3    */
/*      Dec 2022                                                       */
/*=====================================================================*/
"use strict";
"use hopscript";

/*---------------------------------------------------------------------*/
/*    es6 module                                                       */
/*---------------------------------------------------------------------*/
import { Process as process } from "./config.js";
import * as ast from "./ast.js";
import * as error from "./error.js";
import * as net from "./net.js";
import * as signal from "./signal.js";
import * as ccutils from "./comp-utils.js";
import * as sweep from "./sweep.js";
import * as causality from "./causality.js";
import { loopSafe } from "./loopsafe.js";
import { basename } from "node:path";
import * as config from "../lib/config.js";
import { assert, assertCircuitInterfaceConnections,assertCircuitInterface,
	 debugTrace, debugTraceCircuit, debugSynchronizer } from "./comp-common.js";
import { Circuit,
	 makeCircuitInterface, connectTo, connectToList, connMode, unOptAxs,
	 bindSigAccessorList,
	 getSignalObject, signalGate,
	 makeExpressionNet, makeCounterNet } from "./comp-common.js";

/*---------------------------------------------------------------------*/
/*    makeSynchronizer ...                                             */
/*    -------------------------------------------------------------    */
/*    Fig 11.1, page 122                                               */
/*---------------------------------------------------------------------*/
function makeSynchronizer(astNode, cLength, rLevel) {
   const kLength = astNode.trapDepth + 2;
   
   // create a sync dummy node for debugging purposes
   const syncNode = new ast.Sync("Sync", rLevel, astNode);
   
   // "union" is a matrix (2d array) which is indexed by return code
   // and then by incarnation level
   const unions = Array.from({length: kLength}, (_, k) =>
      Array.from({length: rLevel + 1}, (_, i) =>
	 net.makeOr(syncNode, `UNION[${k}]`, i)));

   // "mins" is a cube (3D array) which is indexed by children,
   // by return code, and then by incarnation level
   const mins = Array.from({length: cLength}, (_, n) =>
      Array.from({length: kLength}, (_, k) =>
	 Array.from({length: rLevel + 1}, (_, i) =>
	    net.makeOr(syncNode, `${['L', 'R'][n] || n}MIN[${k}]`, i))));

   // build K output doors and connect unions to them
   const kMatrix = Array.from({length: kLength}, (_, k) =>
      Array.from({length: rLevel + 1}, (_, i) => 
	 net.makeAnd(syncNode, `K[${k}]`, i)));

   for (let k = 0; k < kLength; k++) {
      connectToList(unions[k], kMatrix[k], connMode.K);
      for (let n = 0; n < cLength; n++) {
	 connectToList(mins[n][k], kMatrix[k], connMode.K);
      }
      if (k < kLength - 1) {
	 connectToList(kMatrix[k+1], kMatrix[k], connMode.CONNECT, net.FAN.NEG);
      }
   }

   return { mins, unions, kMatrix };
}

/*---------------------------------------------------------------------*/
/*    makeForkCircuit ...                                              */
/*    -------------------------------------------------------------    */
/*    Fig 11.10, page 122, rules page 152                              */
/*---------------------------------------------------------------------*/
function makeForkCircuit(env, astNode, childCircuits) {
   // circuits common interface
   const { l, goList, res, susp, killList, kMatrix, sel } =
      makeCircuitInterface(astNode);
   const kLength = astNode.trapDepth + 2;
   const rLevel = childCircuits[0].astNode.depth;
   // assert
   for (let i = 0; i < childCircuits.length; i++) {
      if (childCircuits[i].astNode.depth !== rLevel) {
	 throw new Error("Bad children reincarnation levels.");
      }
   }
   
   // c.GO <- GO
   childCircuits.forEach(c => connectToList(goList, c.goList, connMode.GO));
  
   // c.RES <- RES
   childCircuits.forEach(c => c.res && connectTo(res, c.res));

   // c.SUSP <- SUSP
   childCircuits.forEach(c => c.susp && connectTo(susp, c.susp));

   // c.KILL <- KILL
   const orKillList = Array.from({length: l + 1}, (_, i) =>
      net.makeOr(astNode, "Vkill", i));
   connectToList(killList, orKillList, connMode.GO);
   
   childCircuits.forEach(c => {
      connectToList(orKillList, c.killList, connMode.GO);
   });
   
   // SEL <- V c.SEL
   const or_sel = net.makeOr(astNode, "lsel v rsel");
   childCircuits.forEach(c => connectTo(c.sel, or_sel));
   connectTo(or_sel, sel);

   // build and connect the synchronizer
   const sync = makeSynchronizer(astNode, childCircuits.length, rLevel);

   // Union K of children
   childCircuits.forEach(c => {
      for (let k = 0; k < kLength; k++) {
	 connectToList(c.kMatrix[k], sync.unions[k], connMode.K);
      }
   });

   // Min of children
   childCircuits.forEach((c, n, _) => {
      const cmin = sync.mins[n];

      // connect OR-NOT door with GO of parallel and SEL of child
      const xem = net.makeOr(astNode, "xem[" + n + "]", l, 0);

      // xMIN[0,l'] <= !(SEL v GO[l])
      connectTo(goList[l], xem);
      connectTo(c.sel, xem);
      connectTo(xem, cmin[0][l], net.FAN.NEG);

      // connect all incarnations of K0 of child
      connectToList(c.kMatrix[0], cmin[0], connMode.K);

      // connect all incarnations of child min Kn-1 to child min Kn
      for (let k = 0; k < kLength - 1; k++) {
	 for (let i = 0; i <= l; i++) {
	    connectTo(cmin[k][i], cmin[k + 1][i]);
	    if ((c.kMatrix.length > k + 1) && c.kMatrix[k + 1].length > i) {
	       connectTo(c.kMatrix[k + 1][i], cmin[k + 1][i]);
	    }
	 }
      }
   });

   // Connect K to KILL
   for (let k = 2; k < sync.unions.length; k++) {
      const l = orKillList.length;
      for (let i = 0; i < sync.unions[k].length; i++) {
	 connectTo(sync.unions[k][i], orKillList[i < l ? i : l - 1]);
      }
   }

   // connect the synchronizer to the cicruit kMatrix
   sync.kMatrix.forEach((m, k, _) =>
      connectToList(m, kMatrix[k], connMode.K));

   return new Circuit(astNode,
		      // --
		      goList,   // GO
		      res,      // RES
		      susp,     // SUSP
    		      killList, // KILL
		      // --
		      sel,      // SEL
		      kMatrix); // K
}

/*---------------------------------------------------------------------*/
/*    makeTrapCircuit ...                                              */
/*    -------------------------------------------------------------    */
/*    Fig 11.12, page 124, rules page 153                              */
/*---------------------------------------------------------------------*/
function makeTrapCircuit(env, astNode, childCircuit) {
   // circuits common interface
   const { l, goList, res, susp, killList, kMatrix, sel } =
      makeCircuitInterface(astNode);

   if (childCircuit.kMatrix.length <= 2) {
      return childCircuit;
   } else {
      // c.GO <- GO
      connectToList(goList, childCircuit.goList, connMode.GO);

      // c.RES <- RES
      connectTo(res, childCircuit.res);

      // c.SUSP <- SUSP
      connectTo(susp, childCircuit.susp);

      // c.KILL <- KILL
      connectToList(killList, childCircuit.killList, connMode.GO);

      // SEL <- c.SEL
      connectTo(childCircuit.sel, sel);

      // K0 <- c.K0 V c.K2
      const k0_or_k2 = Array.from({length: l + 1}, (_, i) =>
	 net.makeOr(astNode, "k0 v k2", i));

      connectToList(childCircuit.kMatrix[0], k0_or_k2, connMode.KK);
      connectToList(childCircuit.kMatrix[2], k0_or_k2, connMode.KK);
      connectToList(k0_or_k2, kMatrix[0], connMode.KK);
      
      // K1 < c.K1
      connectToList(childCircuit.kMatrix[1], kMatrix[1], connMode.K);
      
      // Ki < c.Ki-1
      for (let k = 2; k < astNode.trapDepth + 2; k++) {
	 connectToList(childCircuit.kMatrix[k + 1], kMatrix[k], connMode.K);
      }

      return assertCircuitInterfaceConnections(
	 new Circuit(astNode,
		     // --
		     goList,     // GO
		     res,        // RES
		     susp,       // SUSP
		     killList,   // KILL
		     // --
		     sel,        // SEL
		     kMatrix));  // K
   }
}
/*---------------------------------------------------------------------*/
/*    makeExitCircuit ...                                              */
/*    -------------------------------------------------------------    */
/*    Fig 11.2, page 115                                               */
/*---------------------------------------------------------------------*/
function makeExitCircuit(env, astNode) {
   // circuits common interface
   const retcode = astNode.returnCode;
   const { l, goList, res, susp, killList, kMatrix, sel } =
      makeCircuitInterface(astNode);
   const const0 = net.makeOr(astNode, "const0", 0);

   for (let k = 0; k < kMatrix.length; k++) {
      if (k === retcode) {
	 connectToList(goList, kMatrix[retcode], connMode.GO);
      } else {
	 for (let i = 0; i <= l; i++) {
	    connectTo(const0, kMatrix[k][i]);
	 }
      }
   }
   connectTo(net.makeOr(astNode, "const.0", 0), sel);
   
   return new Circuit(astNode,
		      // --
		      goList,    // GO
		      res,       // RES
		      susp,      // SUSP
		      killList,  // KILL
		      // --
		      sel,       // SEL
		      kMatrix);  // K
}

/*---------------------------------------------------------------------*/
/*    makeSequenceCircuit ...                                          */
/*    -------------------------------------------------------------    */
/*    Fig. 11.8, page 120 and rules page 150                           */
/*---------------------------------------------------------------------*/
function makeSequenceCircuit(env, astNode, childCircuits) {
   // circuits common interface
   const { l, goList, res, susp, killList, kMatrix, sel } =
      makeCircuitInterface(astNode);
   const len = childCircuits.length;

   // c[0].GO <- GO
   connectToList(goList, childCircuits[0].goList, connMode.GO);
   
   // direct children connections
   childCircuits.forEach(c => {
      // c.RES <- RES
      connectTo(res, c.res);
      // c.SUSP <- SUSP
      connectTo(susp, c.susp);
      // c.KILL <- KILL
      connectToList(killList, c.killList, connMode.GO);
   });

   // SEL <- V c.sel
   const orSel = net.makeOr(astNode, "ORsel", l);
   connectTo(orSel, sel);
   childCircuits.forEach(c => connectTo(c.sel, orSel));
   
   // connect each KO incarnation of child[N] to each GO
   // incarnation of child[N + 1]
   for (let i = 0; i < len - 1; i++) {
      const cur = childCircuits[i];
      const next = childCircuits[i + 1];
      connectToList(cur.kMatrix[0], next.goList, connMode.KGO);
   }
   
   // get K0 of last child
   if (childCircuits[len - 1].kMatrix[0]) {
      connectToList(childCircuits[len - 1].kMatrix[0], kMatrix[0], connMode.KGO);
   }

   // kn, n > 0 connections
   for (let k = 1; k < kMatrix.length; k++) {
      const kk_list = Array.from({length: l + 1}, (_, i) =>
	 net.makeOr(astNode, `or_k${k}/${i}`, i));

      childCircuits.forEach(c => {
	 if (c.kMatrix.length > k && c.kMatrix[k] && c.kMatrix[k].length > 0) {
	    connectToList(c.kMatrix[k], kk_list, connMode.K);
	 }
      });

      connectToList(kk_list, kMatrix[k], connMode.K);
   }

   return new Circuit(astNode,
		      // --
		      goList,   // GO
		      res,      // RES 
		      susp,     // SUSP
		      killList, // KILL
		      // --
		      sel,      // SEL
		      kMatrix); // K
}

/*---------------------------------------------------------------------*/
/*    makePauseCircuit ...                                             */
/*    -------------------------------------------------------------    */
/*    Fig 11.3, page 115 and Rules page 149                            */
/*---------------------------------------------------------------------*/
function makePauseCircuit(env, astNode) {
   // circuits common interface
   const { l, goList, res, susp, killList, kMatrix, sel } =
      makeCircuitInterface(astNode);

   const or = net.makeOr(astNode, "REG", l)
   const reglhs = net.makeAnd(astNode, "REG.lhs", l);
   const regrhs = net.makeOr(astNode, "REG.rhs", l);
   const reg = new net.RegisterNet(astNode, "reg", l);

   // debug
   if (debugTrace || debugTraceCircuit.indexOf(astNode.ctor) >= 0) {
      reg.setDebugTrace();
   }
   
   // reglhs = (SUS ^ REG ^ !KILL[l])
   connectTo(susp, reglhs);
   connectTo(reg, reglhs);
   connectTo(killList[l], reglhs, net.FAN.NEG);

   // regrhs = V (GO[i] ^ !KILL[i])
   for (let i = 0; i <= l; i++) {
      // GO[i] ^ !KILL[i]
      const and = net.makeAnd(astNode, `REG.rsh[${i}]`, i);
      connectTo(goList[i], and);
      connectTo(killList[i], and, net.FAN.NEG);
      connectTo(and, regrhs);
   }

   // REG := reglhs v regrhs
   connectTo(reglhs, or);
   connectTo(regrhs, or);
   connectTo(or, reg);

   // SEL <= REG
   connectTo(reg, sel);

   // K[1, i] <= GO[i]
   connectToList(goList, kMatrix[1], connMode.CONNECT);

   // K[0,l] <= REG ^ RES
   const res_and_reg = net.makeAnd(astNode, `K[0]`, l);
   connectTo(reg, res_and_reg);
   connectTo(res, res_and_reg);
   connectTo(res_and_reg, kMatrix[0][l]);

   return new Circuit(astNode,
		      // --
		      goList,    // GO
		      res,       // RES
		      susp,      // SUSP
		      killList,  // KILL
		      // --
		      sel,       // SEL
		      kMatrix);  // K
}

/*---------------------------------------------------------------------*/
/*    makeAwaitCircuit ...                                             */
/*---------------------------------------------------------------------*/
function makeAwaitCircuit(env, astNode) {
   const chalt = makeHaltCircuit(env, astNode);
   return makeAbortCircuit(env, astNode, chalt, false);
}

/*---------------------------------------------------------------------*/
/*    makeLoopeachCircuit ...                                          */
/*---------------------------------------------------------------------*/
function makeLoopeachCircuit(env, astNode, childCircuit) {
   const halt = makeHaltCircuit(env, astNode);
   const seq = makeSequenceCircuit(env, astNode, [childCircuit, halt])
   const abort = makeAbortCircuit(env, astNode, seq, true);

   return makeLoopCircuit(env, astNode, abort);
}

/*---------------------------------------------------------------------*/
/*    makeLoopCircuit ...                                              */
/*    -------------------------------------------------------------    */
/*    Fig 11.9, page 121 and rules page 151                            */
/*---------------------------------------------------------------------*/
function makeLoopCircuit(env, astNode, childCircuit) {
   // circuits common interface
   const { l, goList, res, susp, killList, kMatrix, sel } =
      makeCircuitInterface(astNode);
   const l2 = childCircuit.astNode.depth;

   // Error on instantaneous loop, and connect K0[depth2] on K0[depth1]
   for (let l = 0; l < l2; l++) {
      if (childCircuit.kMatrix[0].length > l) {
	 connectTo(
	    childCircuit.kMatrix[0][l],
	    new net.ActionNet(astNode, "error", l,
			      function() {
				 throw error.TypeError("Instantaneous loop.", astNode.loc) },
			      []));
      }
   }

   // c.GO[n] < GO[n], for n < l
   for (let i = 0; i < l; i++) {
      connectTo(goList[i], childCircuit.goList[i]);
   }
   
   // c.GO[l] <- GO v c.k0[l]
   const go_or_k0 = net.makeOr(astNode, "INLOOP", l2); 
   connectTo(goList[l], go_or_k0);
   connectTo(childCircuit.kMatrix[0][l2], go_or_k0);
   connectTo(go_or_k0, childCircuit.goList[l]);
   
   // c.RES <- RES
   connectTo(res, childCircuit.res);
   
   // c.SUSP <- c.SUSP
   connectTo(susp, childCircuit.susp);
   
   // c.KILL <- KILL
   connectToList(killList, childCircuit.killList, connMode.GO);
   
   // SEL <- c.SEL
   connectTo(childCircuit.sel, sel);
   
   // K0 <- 0
   const const0 = net.makeOr(astNode, "const.0");
   for (let i = 0; i <= l; i++) {
      connectTo(const0, kMatrix[0][i]);
   }
   
   // Kn <- c.Kn
   for (let k = 1; k < childCircuit.kMatrix.length; k++) {
      connectToList(childCircuit.kMatrix[k], kMatrix[k], connMode.K);
   }
   
   return assertCircuitInterfaceConnections(
      new Circuit(astNode,
		  // --
		  goList,     // GO
		  res,        // RES
		  susp,       // SUSP
		  killList,   // KILL
		  // --
		  sel,        // SEL
		  kMatrix));  // K
}

/*---------------------------------------------------------------------*/
/*    makeNothingCircuit ...                                           */
/*---------------------------------------------------------------------*/
function makeNothingCircuit(env, astNode) {
   const { l, goList, res, susp, killList, kMatrix, sel } =
      makeCircuitInterface(astNode);
   const const0 = net.makeOr(astNode, "const0", 0);

   connectToList(goList, kMatrix[0], connMode.GO);
   connectTo(const0, sel);
   
   for (let i = 0; i <= l; i++) {
      for (let k = 1; k < kMatrix.length; k++) {
	 connectTo(const0, kMatrix[k][i]);
      }
   }

   return new Circuit(astNode,
		      // --
		      goList,    // GO
		      res,       // RES
		      susp,      // SUSP
		      killList,  // KILL
		      // --
		      sel,       // SEL
		      kMatrix);  // K
}

/*---------------------------------------------------------------------*/
/*    makeAtomCircuit ...                                              */
/*---------------------------------------------------------------------*/
function makeAtomCircuit(env, astNode) {
   const { l, goList, res, susp, killList, kMatrix, sel } =
      makeCircuitInterface(astNode);
   const atomFunc = astNode.func;
   const frame = astNode.frame;
   const func = frame ? function() { atomFunc(frame) } : atomFunc;
   const const0 = net.makeOr(astNode, "const.0", 0);
   
   for (let i = 0; i <= l; i++) {
      bindSigAccessorList(env, astNode.accessor_list, astNode, false);

      const actionNet =
	 new net.ActionNet(astNode, "action", i, func, astNode.accessor_list);

      connectTo(goList[i], actionNet);
      connectTo(actionNet, kMatrix[0][i]);
      for (let k = 1; k < kMatrix.length; k++) {
	 connectTo(const0, kMatrix[k][i]);
      }
   }

   connectTo(const0, sel);
   
   return new Circuit(astNode,
		      // --
		      goList,    // GO
		      res,       // RES
		      susp,      // SUSP
		      killList,  // KILL
		      // --
		      sel,       // SEL
		      kMatrix);  // K
}

/*---------------------------------------------------------------------*/
/*    makeSuspendCircuit ...                                           */
/*    -------------------------------------------------------------    */
/*    Fig 11.6, page 119, rules page 150                               */
/*---------------------------------------------------------------------*/
function makeSuspendCircuit(env, astNode, childCircuit) {
   // circuits common interface
   const { l, goList, res, susp, killList, kMatrix, sel } =
      makeCircuitInterface(astNode);

   const s = makeExpressionNet(env, astNode, l);
   const res_and_sel = net.makeAnd(astNode, "res_and_sel");
   const res_and_sel_and_s = net.makeAnd(astNode, "res_and_sel_and_s");
   const res_and_sel_and_not_s = net.makeAnd(astNode, "res_and_sel_and_not_s");

   // res_and_sel
   connectTo(res, res_and_sel);
   connectTo(childCircuit.sel, res_and_sel);

   // res_and_sel_and_s
   connectTo(res_and_sel, res_and_sel_and_s);
   connectTo(s, res_and_sel_and_s);

   if (!(astNode.func instanceof ast.$Delay)) {
      // see makeIfCircuit
      connectTo(res_and_sel, s);
   }

   // res_and_sel_and_not_s
   connectTo(res_and_sel, res_and_sel_and_not_s);
   connectTo(s, res_and_sel_and_not_s, net.FAN.NEG);
   
   // c.GO <- GO
   connectToList(goList, childCircuit.goList, connMode.GO);

   // c.RES <- !s ^ RES ^ c.SEL
   connectTo(res_and_sel_and_not_s, childCircuit.res);
   
   // c,SUSP <- SUSP v (s ^ RES ^ c.SEL)
   const c_susp = net.makeOr(astNode, "susp");
   connectTo(susp, c_susp);
   connectTo(res_and_sel_and_s, c_susp);
   connectTo(c_susp, childCircuit.susp);
   
   // c,KILL <- KILL
   connectToList(killList, childCircuit.killList, connMode.GO);

   // SEL <- c.SEL
   connectTo(childCircuit.sel, sel);
   
   // K0 <- c.K0
   connectToList(childCircuit.kMatrix[0], kMatrix[0], connMode.K);

   // k1 <- c.K1 v s ^ RES ^ c.SEL
   const k1l = net.makeOr(astNode, `k1/${l}`);
   for (let i = 0; i < l; i++) {
      connectTo(childCircuit.kMatrix[1][i], kMatrix[1][i]);
   }
   connectTo(res_and_sel_and_s, k1l);
   connectTo(childCircuit.kMatrix[1][l], k1l);
   connectTo(k1l, kMatrix[1][l]);

   // Kn <- c.Kn, n >= 2
   for (let k = 2; k < childCircuit.kMatrix.length; k++) {
      connectToList(childCircuit.kMatrix[k], kMatrix[k], connMode.K);
   }
   
   return assertCircuitInterfaceConnections(
	 new Circuit(astNode,
		     // --
		     goList,     // GO
		     res,        // RES
		     susp,       // SUSP
		     killList,   // KILL
		     // --
		     sel,        // SEL
		     kMatrix));  // K
}

/*---------------------------------------------------------------------*/
/*    makeAbortNonImmediateCircuit ...                                 */
/*    -------------------------------------------------------------    */
/*    Fig 11.7, page 120 and Rules page 150                            */
/*---------------------------------------------------------------------*/
function makeAbortNonImmediateCircuit(env, astNode, childCircuit) {
   // circuits common interface
   const { l, goList, res, susp, killList, kMatrix, sel } =
      makeCircuitInterface(astNode);
   const res_and_sel = net.makeAnd(astNode, "res^sel");
   let s;

   // there will be several connections to k0/l so make it an or gate
   // instead of a single fanin wire
   kMatrix[0][l] = net.makeOr(astNode, `k0/${l}`, l);

   // debug assertion
   if (assert) assertCircuitInterface(childCircuit);
   
   if (astNode instanceof ast.Exec) {
      s = astNode.exec_status.callback_wire;
   } else if (astNode.func_count) {
      // counter test expression
      // when a counter must be created, AND and AND-not gates must be
      // connected only on the counter output (and not on expr test)
      const e = makeExpressionNet(env, astNode, l);
      if (!(astNode.func instanceof ast.$Delay)) {
	 // see makeIfCircuit
	 connectTo(res_and_sel, e);
      }
      
      const { cnt, reset } = makeCounterNet(env, astNode);
      goList.forEach(n => connectTo(n, reset));
      connectTo(e, cnt);
      connectTo(res_and_sel, cnt);
      s = cnt;
   } else {
      // regular test expression
      s = makeExpressionNet(env, astNode, l);
      if (!(astNode.func instanceof ast.$Delay)) {
	 // see makeIfCircuit
	 connectTo(res_and_sel, s);
      }
   }
   
   connectTo(res, res_and_sel);

   connectTo(childCircuit.sel, res_and_sel);
   connectTo(childCircuit.sel, sel);
   
   // NRES = RES ^ !S[l(s)]
   const res_and_sel_and_not_s = net.makeAnd(astNode, "res^sel^!s");
   connectTo(res_and_sel, res_and_sel_and_not_s);
   connectTo(s, res_and_sel_and_not_s, net.FAN.NEG);

   connectTo(res_and_sel_and_not_s, childCircuit.res);
   
   // K[0,l] <= RES ^ S[l(s)]
   const res_and_sel_and_s = net.makeAnd(astNode, "res^sel^s");
   const res_and_sel_and_s_or_k0 = net.makeOr(astNode, "res^sel^svk0");
   connectTo(res_and_sel, res_and_sel_and_s);
   connectTo(s, res_and_sel_and_s);

   connectTo(res_and_sel_and_s, res_and_sel_and_s_or_k0);
   connectTo(childCircuit.kMatrix[0][l], res_and_sel_and_s_or_k0);
   connectTo(res_and_sel_and_s_or_k0, kMatrix[0][l]);
   
   // direct connections from the parent to the child circuit
   connectToList(goList, childCircuit.goList, connMode.GO);
   connectToList(killList, childCircuit.killList, connMode.GO);
   connectTo(susp, childCircuit.susp);

   // K0 <- c.K0, for i < l
   if (childCircuit.kMatrix[0].length > 0) {
      connectToList(childCircuit.kMatrix[0], kMatrix[0], connMode.K);
   }

   // kn <- c.Kn
   for (let k = 1; k < childCircuit.kMatrix.length; k++) {
      connectToList(childCircuit.kMatrix[k], kMatrix[k], connMode.K);
   }
   
   return assertCircuitInterfaceConnections(
      new Circuit(astNode,
		  // --
		  goList,    // GO
		  res,       // RES
		  susp,      // SUSP
		  killList,  // KILL
		  // --
		  sel,       // SEL
		  kMatrix)); // K
}

/*---------------------------------------------------------------------*/
/*    makeAbortCircuit ...                                             */
/*---------------------------------------------------------------------*/
function makeAbortCircuit(env, astNode, childCircuit, force_non_immediate) {
   if (!force_non_immediate && astNode.immediate) {
      const abortc = makeAbortNonImmediateCircuit(env, astNode, childCircuit);
      const ifc = [ makeNothingCircuit(env, astNode), abortc ];
      
      return makeIfCircuit(env, astNode, ifc);
   } else {
      return makeAbortNonImmediateCircuit(env, astNode, childCircuit);
   }
}

/*---------------------------------------------------------------------*/
/*    makeEmit ...                                                     */
/*    -------------------------------------------------------------    */
/*    Fig 11.4, page 116                                               */
/*---------------------------------------------------------------------*/
function makeEmitCircuit(env, astNode, signame) {
   // circuits common interface
   const { l, goList, res, susp, killList, kMatrix, sel } =
      makeCircuitInterface(astNode);

   for (let i = 0; i <= l; i++) {
      const sig = getSignalObject(env, signame, astNode);
      const sig_gate = signalGate(sig, i);

      connectTo(goList[i], sig_gate);

      // exec nodes
      if (astNode instanceof ast.Exec) {
	 astNode.signal = sig;
	 // MS 20jan2025: fix, exec signals are sent during the
	 // machine.update operation (see machine.js)
	 // This fixes causal-artist-player.hh.js, depnowval.hh.js,
	 // and depnowval-local.hh.js bugs
	 // sig.set_value(astNode.exec_status.value, i, astNode.loc);
	 const exec_emission_func = function() {
	    astNode.exec_status.value = undefined;
	 }

	 const anet = new net.ActionNet(
	    astNode, "_exec_return_sig",
	    i, exec_emission_func, []);

	 connectTo(goList[i], anet);
	 connectTo(anet, kMatrix[0][i]);
      } else {
	 // regular nodes
	 // Warning: the key must be signame and *not* sig.name, in
	 // case of bouded signals.
	 astNode.signal_map[signame] = sig;

	 if (astNode.func || astNode.accessor_list.length > 0) {
	    bindSigAccessorList(env, astNode.accessor_list, astNode, false);
	    const expr = new net.SignalExpressionNet(
	       astNode, sig, signame + "_sig_expr", i,
	       astNode.func, astNode.accessor_list);
	    connectTo(goList[i], expr);
	    connectTo(expr, kMatrix[0][i]);
	 } else {
	    connectTo(goList[i], kMatrix[0][i]);
	 }
      }
   }

   return new Circuit(astNode,
		      // --
		      goList,    // GO
		      res,       // RES
		      susp,      // SUSP
		      killList,  // KILL
		      // --
		      sel,       // SEL
		      kMatrix);  // K
}

/*---------------------------------------------------------------------*/
/*    makeEmitIfCircuit ...                                            */
/*---------------------------------------------------------------------*/
function makeEmitIfCircuit(env, astNode) {
   let emit_node;

   if (astNode.signame_list.length === 1) {
      emit_node = makeEmitCircuit(env, astNode, astNode.signame_list[0]);
   } else {
      emit_node = makeSequenceCircuit(
	 env, astNode, astNode.signame_list.map(
	    (el, i, arr)  => makeEmitCircuit(env, astNode, el)));
   }

   // Basically, we build a dummy If AST node, giving it if_func and
   // if_accessor_list of the Emit node, to be able to build an if
   // circuit, with the emit in then branch.
   if (astNode.if_func) {
      let if_circuit;
      let nothing_circuit;
      const if_ast = new ast.If("IF", undefined, astNode.loc,
				true, [], false,
				astNode.if_func, astNode.if_accessor_list);

      if_ast.machine = astNode.machine;
      if_ast.depth = astNode.depth;
      nothing_circuit = makeNothingCircuit(if_ast, astNode);
      if_circuit = makeIfCircuit(env, if_ast, [emit_node, nothing_circuit]);

      return if_circuit;
   }

   return emit_node;
}

/*---------------------------------------------------------------------*/
/*    makeIfCircuit ...                                                */
/*    -------------------------------------------------------------    */
/*    Figure 11.5, page 117, rules page 150                            */
/*---------------------------------------------------------------------*/
function makeIfCircuit(env, astNode, childCircuits) {
   const kmaxlen =
      Math.max.apply(undefined, childCircuits.map(c => c.kMatrix.length));
   // circuits common interface
   const { l, goList, res, susp, killList, kMatrix, sel } =
      makeCircuitInterface(astNode);

   // ct,GO <- GO ^ s
   // cf,GO <- GO ^ !s
   for (let i = 0; i <= l; i++) {
      const s = makeExpressionNet(env, astNode, i);
      const go_and_s = net.makeAnd(astNode, "go^s", i);
      const go_and_not_s = net.makeAnd(astNode, "go^!s", i);

      if (!(astNode.func instanceof ast.$Delay)) {
	 // MS 1 Dec 2025
	 // connect the GO to the test only for true expression
	 connectTo(goList[i], s);
      }
      
      connectTo(goList[i], go_and_s);
      connectTo(goList[i], go_and_not_s);

      connectTo(s, go_and_s, astNode.not ? net.FAN.NEG : net.FAN.STD);
      connectTo(s, go_and_not_s, astNode.not ? net.FAN.STD : net.FAN.NEG);

      connectTo(go_and_s, childCircuits[0].goList[i]);
      connectTo(go_and_not_s, childCircuits[1].goList[i]);
   }

   // c.RES <- RES
   childCircuits.forEach(c => connectTo(res, c.res));

   // c.SUSP <- SUSP
   childCircuits.forEach(c => connectTo(susp, c.susp));

   // c.KILL <- KILL
   childCircuits.forEach(c => connectToList(killList, c.killList, connMode.GO));

   // SEL <- c.SEL
   const or_sel = net.makeOr(astNode, "Vsel");

   childCircuits.forEach(c => connectTo(c.sel, or_sel));
   connectTo(or_sel, sel);
   
   // Kn <- ct.Kn v cf.Kn
   for (let k = 0; k < kmaxlen; k++) {
      if (!childCircuits[0].kMatrix[k]) {
	 // then child has no kn
	 connectToList(childCircuits[1].kMatrix[k], kMatrix[k], connMode.K);
      } else if (!childCircuits[1].kMatrix[k]) {
	 // else child has no kn
	 connectToList(childCircuits[0].kMatrix[k], kMatrix[k], connMode.K);
      } else {
	 const orKiList = Array.from({length: l + 1}, (_, i) => {
	    return net.makeOr(astNode, `Vk[${k}]`, i);
	 });
	 childCircuits.forEach(c => connectToList(c.kMatrix[k], orKiList, connMode.K));
	 connectToList(orKiList, kMatrix[k], connMode.K);
      }
   }

   return assertCircuitInterfaceConnections(
      new Circuit(astNode,
		  // --
		  goList,    // GO
		  res,       // RES
		  susp,      // SUSP
		  killList,  // KILL
		  // --
		  sel,       // SEL
		  kMatrix)); // K
}

/*---------------------------------------------------------------------*/
/*    makeHaltCircuit ...                                              */
/*---------------------------------------------------------------------*/
function makeHaltCircuit(env, astNode) {
   return makeLoopCircuit(env, astNode, makePauseCircuit(env, astNode));
}

/*---------------------------------------------------------------------*/
/*    makeLocalCircuit ...                                             */
/*    -------------------------------------------------------------    */
/*    Fig 11.14, page 125, rules page 153                              */
/*---------------------------------------------------------------------*/
function makeLocalCircuit(comp, env, astNode, sigtable) {
   const { l, goList, res, susp, killList, kMatrix, sel } =
      makeCircuitInterface(astNode);
   const child = astNode.children[0];
   const lc = child.depth;
   const mach = astNode.machine;

   // console.error("local L=", l, " LC=", lc);
   if (astNode.children.length > 1) {
      throw new Error("makeLocalCircuit: too many children for local");
   }

   // As child circuit can use signal declared in astNode local, they must
   // be built first.
   const initList = [];

   // Generation of signal in the local scope. For now, only
   // unbound signals are created, and `accessibility` is ignored.
   astNode.sigDeclList.forEach(sigprop => {

      if (!sigprop.alias) {
	 const axs = mach.sigPre ? sigtable.get(sigprop.name) : unOptAxs;
	 const sig = new signal.Signal(
	    astNode, sigprop, axs?.get_pre, kMatrix[1], killList, susp, lc);

	 sigprop.signal = sig;
	 astNode.machine.local_signal_list.push(sig);

	 // Reinstantiation of local signal. Involves the call to
	 // reset function and the call of init function (which has
	 // dependencies). Same of reinit happens on RES, or GO if no
	 // init provided).
	 for (let i = 0; i <= lc; i++) {
	    if (sig.init_func) {
	       bindSigAccessorList(env, sig.init_accessor_list, astNode, false);
	       const action_init = new net.ActionNet(
		  astNode, "init", i, function() {
		     signal.create_scope.call(this, sig, i);
		  }, sig.init_accessor_list);
	       if (i > l) {
		  if (astNode.machine.compiler === "new") {
		     connectTo(goList[i - 1], action_init);
		  } else {
		     throw new TypeError(`HipHop:makeLocalCircuit: goList and children incompatible length (${l}/${lc})`);
		  }
	       } else {
		  connectTo(goList[i], action_init);
	       }
	       // MS9mar2025 to fix bug-dep-73dc062.hh.js
	       // see runtimeSignalAccessor
	       sig.init_gates[i] = action_init;
	       initList.push(action_init);
	    }

	    if (sig.reinit_func) {
	       bindSigAccessorList(env, sig.reinit_accessor_list, astNode, false);
	       const action_reinit = new net.ActionNet(
		  astNode, "reinit", i, function() {
		     signal.resume_scope.call(this, sig, i);
		  }, sig.reinit_accessor_list);
	       connectTo(res, action_reinit);
	    }
	 }
	 if( mach.compiler === "new" && sig.toPre) {
	    goList[l].connectTo(sig.toPre, net.FAN.NEG);
	 }
      } else {
	 // The signal is aliased. Hence, we have to reference the
	 // signal attribute of the signal property to the signal
	 // object. This attribute is empty when the signal property
	 // comes from module used in a run statement.
	 if (!sigprop.signal) {
	    sigprop.signal = getSignalObject(env, sigprop.alias, astNode);
	 }
      }

      
   });

   // Child circuit iteration and connexion
   const c = child.makeCircuit(comp, env.concat(astNode.sigDeclList), sigtable);

   // debug
   if (assert) {
      if (kMatrix.length !== c.kMatrix.length) {
	 throw new Error(`makeLocalCircuit: wrong kMatrix length ${kMatrix.length}/${c.kMatrix.length}`);
      }
   }

   // if child as a kMatrix.length > 1, connect the const0 to
   // the LOCAL kmatrix[1]
   if (c.kMatrix.length < 2) {
      for (let i = 0; i <= l; i++) {
	 const const0 = net.makeOr(astNode, "const.0", i);
	 connectTo(const0, kMatrix[1][i]);
      }
   }

   // c.RES <= RES
   connectTo(res, c.res);

   // c.SUSP <= SUSP
   connectTo(susp, c.susp);

   // SEL <- c.SEL
   connectTo(c.sel, sel);
   
   // c.KILL <- KILL
   connectToList(killList, c.killList, connMode.RNCAKILL);

   // K <- c.K
   for (let k = 0; k < c.kMatrix.length; k++) {
      connectToList(c.kMatrix[k], kMatrix[k], connMode.K);
   }

   // connect go to child
   //
   // Signal initialization net (if exists) is connected to
   // child, this ensures that local signal is initialized before
   // starting the body.
   //
   // Another possibilitie would be to add the initialization net to
   // the dependency list of the signal, but it may lead to cycle
   // error (making an embed emission to depends of the go, but also
   // the local k0 depends of the emission...)
   for (let i = 0; i <= l; i++) {
      const go = initList[i] ? initList[i] : goList[i];
      connectTo(go, c.goList[i]);
   }

   return assertCircuitInterfaceConnections(
      new Circuit(astNode,
		  // --
		  goList,     // GO
		  res,        // RES
		  susp,       // SUSP
		  killList,   // KILL
		  // --
		  sel,        // SEL
		  kMatrix));  // K
}

/*---------------------------------------------------------------------*/
/*    nodeDepth ...                                                    */
/*---------------------------------------------------------------------*/
function nodeDepth(astNode, depth, inloop) {
   
   function rec(astNode, depth, in_loop) {
      
      if (astNode instanceof ast.Loop || astNode instanceof ast.LoopEach) {
	 in_loop = true;
      } else if (astNode instanceof ast.Fork || astNode instanceof ast.Local) {
	 if (in_loop) {
	    depth++;
	    in_loop = false;
	 }
      }

      if (astNode instanceof ast.Module) {
	 astNode.depth = 0;
      } else {
	 astNode.depth = depth;
      }
      
      astNode.children.forEach((c, i, a) => { 
	 rec(c, depth, in_loop) ;
      });
   }

   return rec(astNode, 1, false);
}

/*---------------------------------------------------------------------*/
/*    Export                                                           */
/*---------------------------------------------------------------------*/
const comp = {
   makeForkCircuit, makeTrapCircuit, makeExitCircuit,
   makeSequenceCircuit, makePauseCircuit, makeAwaitCircuit,
   makeLoopeachCircuit, makeLoopCircuit, makeNothingCircuit,
   makeAtomCircuit, makeSuspendCircuit, makeAbortNonImmediateCircuit,
   makeAbortCircuit, makeEmitCircuit, makeEmitIfCircuit, makeIfCircuit,
   makeHaltCircuit, makeLocalCircuit };

export { comp, nodeDepth };

