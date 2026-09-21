/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/lib/uncycle.js                */
/*    -------------------------------------------------------------    */
/*    Author      :  manuel serrano                                    */
/*    Creation    :  Wed Apr  8 15:59:55 2026                          */
/*    Last change :  Thu Sep 17 10:40:17 2026 (serrano)                */
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
import { RegisterNet, FAN, makeOr } from "./net.js";

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
   let index = 0;
   const stack = [];
   const indices = [];
   const lowLink = [];
   const onStack = new Set();
   const components = [];

   function dfs(net) {
      indices[net.id] = index;
      lowLink[net.id] = index;
      index++;
      stack.push(net);
      onStack.add(net);

      // register are _never_ part of a cycle because
      // they do not propagate in the same reaction
      if (!(net instanceof RegisterNet)) {
	 net.fanoutList.forEach(fan => {
	    const neighbor = fan.net;

	    if (indices[neighbor.id] === undefined) {
	       dfs(neighbor);
	       lowLink[net.id] = Math.min(lowLink[net.id], lowLink[neighbor.id]);
	    } else if (onStack.has(neighbor)) {
               lowLink[net.id] = Math.min(lowLink[net.id], indices[neighbor.id]);
	    }
	 });
      }

      if (lowLink[net.id] === indices[net.id]) {
	 const component = [];
	 let w;
	 do {
            w = stack.pop();
            onStack.delete(w);
            component.push(w);
	 } while (w !== net);
	 components.push(component);
      }
   }

   nets.forEach(n => {
      if (indices[n.id] === undefined) {
	 dfs(n);
      }
   });

   return components;
}

/*---------------------------------------------------------------------*/
/*    findSmallestScc ...                                              */
/*---------------------------------------------------------------------*/
function findSmallestScc(nets) {
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
   machine.nets.forEach(n => n.duplicate = undefined);
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

      net.state = 2;
      return null;
   }
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
	 const dup = net.dup();

	 net.duplicate = dup;
	 dup.origin = net;

	 if (DEBUG) {
	    console.error(`dup ${net.id} => ${dup.id} (${net.constructor.name})`);
	 }
	 
	 net.fanoutList.forEach(fan => {
	    const dtgt = duplicateNet(fan.net);
	    dup.connectTo(dtgt, connType(fan));
	 });
	 
	 return dup;
      }
   }

   // mark all the net in the cycle to avoid copying those nets
   // that are not in any cycle
   cycle.forEach(n => n.inCycle = true);
   
   return cycle.map(duplicateNet);
}

/*---------------------------------------------------------------------*/
/*    cutEdges ...                                                     */
/*---------------------------------------------------------------------*/
function cutEdges(cycle, edges) {

   if (DEBUG) {
      console.error("cycle: ", cycle.map(n => n.id));
      console.error("cutting edges:",
		    edges.map(e => `${e.src.id}->${e.dst.id}`).join(","));
   }

   // remove all the edges from the graph to produce an acyclic graph
   edges.forEach(e => disconnect(e.src, e.dst));

   // generate N copies the acylic graph
   return edges.map(_ => duplicateAcyclicCircuit(cycle));
}

/*---------------------------------------------------------------------*/
/*    reconnect ...                                                    */
/*---------------------------------------------------------------------*/
function reconnect(edges, cycle, copies) {
   edges.forEach(({src, dst, fan}) => {
      const ddst = copies[0].find(n => n.origin === dst);
      console.log("reconnect src=", src.id, "dst=", dst.id, " ddst=", ddst.id);
      src.connectTo(ddst, connType(fan));
   });

   for (let i = 0; i < copies.length - 1; i++) {
      edges.forEach(({src, dst}) => {
	 const fan = src.fanoutList.find(fan => fan.net == dst);
	 const dsrc = copies[i].find(n => n.origin = src);
	 const ddst = copies[i+1].find(n => n.origin = dst);
	 dsrc.connectTo(ddst, connType(fan));
      });
   }
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
	 cutEdges(cycle, findMinimalEdges(cycle));
      }
   } else {
      while (true) {
	 let scc = findSmallestScc(machine.nets);

	 if (scc) {
	    const cycle = findCycle(scc);

	    if (cycle) {
	       const edges = findCut(cycle);
	       const copies = cutEdges(cycle, edges);

	       reconnect(edges, cycle, copies);
	    } else {
	       throw "Cannot find cycle in scc " + scc.map(n => n.id).join(",");
	    }
	 }
	 break;
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
