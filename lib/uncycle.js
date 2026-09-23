/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/lib/uncycle.js                */
/*    -------------------------------------------------------------    */
/*    Author      :  manuel serrano                                    */
/*    Creation    :  Wed Apr  8 15:59:55 2026                          */
/*    Last change :  Wed Sep 23 09:14:27 2026 (serrano)                */
/*    Copyright   :  2026 manuel serrano                               */
/*    -------------------------------------------------------------    */
/*    Remove cycles from net lists for duplication.                    */
/*=====================================================================*/
"use strict"
"use hopscript"

/*---------------------------------------------------------------------*/
/*    es6 module                                                       */
/*---------------------------------------------------------------------*/
import * as config from "./config.js";
import * as ast from "./ast.js";
import * as error from "./error.js";
import { RegisterNet, FAN, makeOr, LogicalNet, SignalNet, WireNet } from "./net.js";

export { uncycle };

/*---------------------------------------------------------------------*/
/*    Debug                                                            */
/*---------------------------------------------------------------------*/
const DEBUG =
   config.Process.env.HIPHOP_TRACE?.split(",")?.find?.(n => n === "uncycle"); 

/*---------------------------------------------------------------------*/
/*    connType ...                                                     */
/*---------------------------------------------------------------------*/
function connType(fan) {
   if (!fan.polarity) {
      return FAN.NEG;
   } else if (fan.dependency) {
      return FAN.DEP;
   } else {
      return FAN.STD;
   }
}

/*---------------------------------------------------------------------*/
/*    tarjan ...                                                       */
/*---------------------------------------------------------------------*/
function tarjan(nets) {
   // https://en.wikipedia.org/wiki/Tarjan%27s_strongly_connected_components_algorithm
   let index = 0;
   const stack = [];
   const indices = [];
   const lowLink = [];
   const onStack = new Set();
   const components = [];

   function strongconnect(v) {
      indices[v.id] = index;
      lowLink[v.id] = index;
      index++;
      stack.push(v);
      onStack.add(v);

      v.fanoutList.forEach(fan => {
	 const w = fan.net;

	 if (!(w instanceof RegisterNet)) {
	    if (indices[w.id] === undefined) {
	       strongconnect(w);
	       lowLink[v.id] = Math.min(lowLink[v.id], lowLink[w.id]);
	    } else if (onStack.has(w)) {
	       lowLink[v.id] = Math.min(lowLink[v.id], indices[w.id]);
	    }
	 }
      });

      if (lowLink[v.id] === indices[v.id]) {
	 const component = [];
	 let w;
	 do {
            w = stack.pop();
            onStack.delete(w);
            component.push(w);
	 } while (w !== v);
	 components.push(component);
      }
   }


   if (nets.length > 20000) {
      return [];
   }
   
   nets.forEach(v => {
      // registers are _never_ part of a cycle because
      // they do not propagate in the same reaction
      if (!(v instanceof RegisterNet)) {
	 if (indices[v.id] === undefined) {
	    strongconnect(v);
	 }
      }
   });

   return components;
}

/*---------------------------------------------------------------------*/
/*    findScc ...                                                      */
/*---------------------------------------------------------------------*/
function findScc(nets) {
   const scc = tarjan(nets).filter(c => c.length > 1);

   if (scc.length > 0) {
      const sscc = scc.sort((s1, s2) => s1.length > s2.length);

      return sscc.find(s => s.length > 1);
   } else {
      return false;
   }
}

/*---------------------------------------------------------------------*/
/*    disconnect ...                                                   */
/*---------------------------------------------------------------------*/
function disconnect(src, dst) {
   src.fanoutList = src.fanoutList.filter(fan => fan.net !== dst);
   dst.faninList = dst.faninList.filter(fan => fan.net !== src);
}

/*---------------------------------------------------------------------*/
/*    markMaybeBottom ...                                              */
/*    -------------------------------------------------------------    */
/*    Mark that the circuit reachable from net can be bottom           */
/*---------------------------------------------------------------------*/
function markMaybeBottom(machine, net) {

   function markMaybeBottomNet(net) {
      if (!net.maybeBottom) {
	 net.maybeBottom = true;
	 // net.signal = undefined;
	 net.fanoutList.forEach(fan => {
	    markMaybeBottomNet(fan.net);
	 });
      }
   }

   markMaybeBottomNet(net);
}

/*---------------------------------------------------------------------*/
/*    resetCircuit ...                                                 */
/*---------------------------------------------------------------------*/
function resetCircuit(machine) {
   machine.nets.forEach(n => {
      n.duplicate = undefined;
      n.inCycle = undefined;
      n.origin = undefined;
      n.extraction = undefined;
      n.state = -1;
   });
}

/*---------------------------------------------------------------------*/
/*    getBottomNet ...                                                 */
/*    -------------------------------------------------------------    */
/*    The original part of a cycle, starts the propagation with        */
/*    a bottom value. For that, a unique "bottom" net is created       */
/*    per machine and connected to all removed cycles.                 */
/*---------------------------------------------------------------------*/
function getBottomNet(machine) {
   if (!machine.bottomNet) {
      const net = makeOr(machine.ast, "bottom", 0);
      net.connectTo(net, FAN.STD);
      net.maybeBottom = true;
      machine.bottomNet = net;
   }
   
   return machine.bottomNet;
}

/*---------------------------------------------------------------------*/
/*    stackToCycle ...                                                 */
/*---------------------------------------------------------------------*/
function stackToCycle(u, stack) {
   let res = [u];

   while (stack !== null) {
      res.push(stack.net);
      stack = stack.stack;
   }

   return res.reverse();
}
   
/*---------------------------------------------------------------------*/
/*    dfs ...                                                          */
/*---------------------------------------------------------------------*/
function dfs(net, stack) {
   net.state = 1;

   for (const u of net.fanoutList) {
      switch (u.net.state) {
	 case 1:
	    return stackToCycle(net, stack);
	    
	 case 0: {
	    const c = dfs(u.net, { net, stack });

	    if (c) return c;
	 }
      }
   }

   net.state = 2;
   return null;
}

/*---------------------------------------------------------------------*/
/*    findCycle ...                                                    */
/*---------------------------------------------------------------------*/
function findCycle(nets) {
   nets.forEach(n => { if (n.state !== 3) n.state = 0 });

   try {
      for (const n of nets) {
	 if (n.state === 0) {
	    const cycle = dfs(n, null);

	    if (cycle) {
	       return cycle;
	    }
	 }
      }
   } finally {
      nets.forEach(n => { if (n.state !== 3) n.state = 0 });
   }

   return null;
}
		
/*---------------------------------------------------------------------*/
/*    findCut ...                                                      */
/*    -------------------------------------------------------------    */
/*    Returns a set of edges that break the cycle.                     */
/*---------------------------------------------------------------------*/
function findCut(cycle) {

   function oneByOneStrategy(cycle) {
      // remove the edges one by one until nets contains no more cycle
      let res = [];

      for (let i = 0; i < cycle.length - 1; i++) {
	 const net = cycle[i];
	 const fan = net.fanoutList.find(fan => fan.net === cycle[i + 1]);
	 res.push({ src: net, dst: cycle[i + 1], fan });
	 
	 // pretends (for findCycle only) that net is
	 // no longer part of the cycle
	 net.state = 3;

	 if (!findCycle(cycle)) {
	    return res;
	 }
      }

      throw "error, should not have reached";
   }

   return oneByOneStrategy(cycle);
}

/*---------------------------------------------------------------------*/
/*    duplicateAcyclicCircuit ...                                      */
/*---------------------------------------------------------------------*/
function duplicateAcyclicCircuit(cycle) {
   
   function duplicateNet(net) {
      if (!net.inCycle) {
	 return net;
      } else if (net.duplicate) {
	 return net.duplicate;
      } else {
	 if (net instanceof RegisterNet) {
	    throw new TypeError("Illegal RegisterNet: " + net.id +
	       " cycle: " + cycle.map(n=> n.id).join(","));
	 }
	 
	 const dup = net.dup();

	 net.duplicate = dup;
	 dup.origin = net;

	 if (DEBUG) {
	    console.error(`dup ${net.id} => ${dup.id} (${net.constructor.name} ${net.faninList.length})`);
	 }
	 
	 net.fanoutList.forEach(fan => {
	    const dtgt = duplicateNet(fan.net);
	    if ((dtgt.faninList.length > 0)
	       && ((dtgt instanceof WireNet)
		  || (dtgt instanceof RegisterNet))) {
	       const lg = dtgt.promoteAsLogicalGate();
	       dup.connectTo(lg, connType(fan));
	    } else {
	       dup.connectTo(dtgt, connType(fan));
	    }
	 });
	 net.faninList.forEach(fan => {
	    if (!fan.net.inCycle) {
	       fan.net.connectTo(dup, connType(fan));
	    }
	 });
	 
	 return dup;
      }
   }

   // mark all the net in the cycle to avoid copying those nets
   // that are not in any cycle
   cycle.forEach(n => n.inCycle = true);
   cycle.forEach(n => n.duplicate = undefined);
   
   return cycle.map(duplicateNet);
}

/*---------------------------------------------------------------------*/
/*    cutEdges ...                                                     */
/*---------------------------------------------------------------------*/
function cutEdges(cycle, edges) {

   if (DEBUG) {
      console.error("cutting edges:",
		    edges.map(e => `${e.src.id}->${e.dst.id}`).join(", "));
   }

   // remove all the edges from the graph to produce an acyclic graph
   edges.forEach(e => disconnect(e.src, e.dst));

   // generate N copies the acylic graph
   return edges.map(_ => duplicateAcyclicCircuit(cycle));
}

/*---------------------------------------------------------------------*/
/*    reconnect ...                                                    */
/*---------------------------------------------------------------------*/
function reconnect(mach, edges, cycle, copies) {
   edges.forEach(({src, dst, fan}) => {
      const ddst = copies[0].find(n => n.origin === dst);
      src.connectTo(ddst, connType(fan));
      //getBottomNet(mach).connectTo(dst, FAN.STD);
   });

   for (let i = 0; i < copies.length - 1; i++) {
      edges.forEach(({src, dst, fan}) => {
	 if (!fan) {
	    throw new TypeError(`ERROR cannot find edge: ${src.id}->${dst.id} [edges: ${edges.map(e => `${e.src.id}->${e.dst.id}`)}`);
	 }
	 
	 const dsrc = copies[i].find(n => n.origin === src);
	 const ddst = copies[i+1].find(n => n.origin === dst);

	 dsrc.connectTo(ddst, connType(fan));
      });
   }

   // mark that all the nets but those of the last copy
   // can be bottom at the end of the reaction
   cycle.forEach(n => n.maybeBottom = true);
   for (let i = 0; i < copies.length - 1; i++) {
      copies[i].forEach(n => n.maybeBottom = true);
   }
}

/*---------------------------------------------------------------------*/
/*    isSIGio ...                                                      */
/*---------------------------------------------------------------------*/
function isSIGio(n) {
   return (n instanceof SignalNet) && (n.accessibility !== ast.LOCAL);
}

/*---------------------------------------------------------------------*/
/*    reconnectSignalSIGio ...                                         */
/*    -------------------------------------------------------------    */
/*    SIGio that are part of cycles have been removed. Those are       */
/*    are output signals must be explicitly reconnected with the       */
/*    last copy.                                                       */
/*---------------------------------------------------------------------*/
function reconnectSignalSIGio(machine, cycle, copy) {
   cycle.forEach(n => {
      if (isSIGio(n)) {
	 const dnet = copy.find(d => d.origin === n.extraction);

	 for (let i in machine.output_signal_map) {
	    let sig = machine.output_signal_map[i];
	    if (sig.netSigList[0] === n) {
	       sig.netSigList[0] = dnet;
	    }
	 }
      }
   });
}

/*---------------------------------------------------------------------*/
/*    extractSIGio ...                                                 */
/*    -------------------------------------------------------------    */
/*    All the SIGio, i.e., nets interacting with the outside world,    */
/*    have to be extracted from the cycle. For that, the original      */
/*    net is replaced in the cycle with and AND gates whose inputs     */
/*    are that of the original SIGio + the SIGio itself which          */
/*    has no more inputs and all the new AND gates as output.          */
/*---------------------------------------------------------------------*/
function extractSIGio(cycle) {
   const ecycle = [];
   
   cycle.forEach(n => {
      if (isSIGio(n)) {
	 
	 const dup = new LogicalNet(n.astNode, n.debugName + "'", n.lvl, n.neutral);
	 ecycle.push(dup);
	 n.extraction = dup;
	 
	 if (DEBUG)
	    console.error("extracting SIGio(" + n.signame + ")", n.id, n.accessibility, "->", dup.id);
	 
	 n.fanoutList.forEach(fan => {
	    dup.connectTo(fan.net, connType(fan));
	    disconnect(n, fan.net);
	 });
	 n.faninList.forEach(fan => {
	    fan.net.connectTo(dup, connType(fan));
	    disconnect(fan.net, n);
	 });

	 if (n.accessibility !== ast.OUT) {
	    n.connectTo(dup, FAN.STD);
	 }
/* 	 if (n.accessibility !== ast.IN) {                             */
/* 	    dup.connectTo(n, FAN.STD);                                 */
/* 	 }                                                             */
	 
      } else {
	 ecycle.push(n);
      }
   });

   if (DEBUG) console.error("extracted SIGio cycle: ", ecycle.map(n => n.id));
   
   return ecycle;
}

/*---------------------------------------------------------------------*/
/*    uncycle ...                                                      */
/*---------------------------------------------------------------------*/
function uncycle(machine) {
   const length = machine.nets.length;
   const uncyclestart = Date.now();

   const userNets = config.Process.env.HIPHOP_UNCYCLE_NETS?.split(",")
      .map(s => parseInt(s.trim()));

   if (userNets) {
      const cycle = findCycle(userNets);

      if (!cycle) {
	 throw "User nets ${config.Process.env.HIPHOP_UNCYCLE_NETS} are no cycle!";
      } else {
	 const ecycle = extractSIGio(cycle);
	 cutEdges(ecycle, findMinimalEdges(ecycle));
      }
   } else {
      while (true) {
	 let scc = findScc(machine.nets);
	 
	 if (DEBUG) {
	    console.error("scc: ", scc ? scc.map(n => n.id) : undefined);
	 }
	 
	 if (scc) {
	    const cycle = findCycle(scc);
	    if (cycle) {
	       if (DEBUG) console.error("cycle: ", cycle.map(n => n.id));
	       
	       const ecycle = extractSIGio(cycle);
	       const edges = findCut(ecycle);
	       const copies = cutEdges(ecycle, edges);

	       reconnect(machine, edges, ecycle, copies);
	       reconnectSignalSIGio(machine, cycle, copies[copies.length - 1]);
	       resetCircuit(machine);
	    } else {
	       throw "Cannot find cycle in scc " + scc.map(n => n.id).join(",");
	    }
	 } else {
	    break;
	 }
      }
      
   }
   
   if (machine.dumpNets) {
      machine.dumpNets(machine, true, ".nets~.json");
   }
   
   machine.status.uncycle = {
      status: "success",
      growthFactor: machine.nets.length / length,
      time: Date.now() - uncyclestart
   }

   if (DEBUG) {
      console.error("old length:", length);
      console.error("new length:", machine.nets.length);
   }
   
   return machine;
}
