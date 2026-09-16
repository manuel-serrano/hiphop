/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/lib/uncycle.js                */
/*    -------------------------------------------------------------    */
/*    Author      :  manuel serrano                                    */
/*    Creation    :  Wed Apr  8 15:59:55 2026                          */
/*    Last change :  Tue Sep 15 10:22:10 2026 (serrano)                */
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

      net.fanoutList.forEach(fan => {
	 const neighbor = fan.net;

	 if (!(neighbor instanceof RegisterNet)) {
	    if (indices[neighbor.id] === undefined) {
               dfs(neighbor);
               lowLink[net.id] = Math.min(lowLink[net.id], lowLink[neighbor.id]);
	    } else if (onStack.has(neighbor)) {
               lowLink[net.id] = Math.min(lowLink[net.id], indices[neighbor.id]);
	    }
	 }
      });

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
/*    findEdge ...                                                     */
/*    -------------------------------------------------------------    */
/*    Find one edge of a SCC that might remove its cycle.              */
/*---------------------------------------------------------------------*/
function findEdgeTBR(nets) {
   const src = nets[0];
   const fan = src.fanoutList.find(fan => fan.net.inCycle);
   const dst = fan.net;

   return {src, fan, dst};
}

/*---------------------------------------------------------------------*/
/*    uncycleNets ...                                                  */
/*    -------------------------------------------------------------    */
/*    Remove the cycles composed from the net list. All the nets       */
/*    arguments are in a cycle.                                        */
/*---------------------------------------------------------------------*/
function uncycleNetsTBR(machine, nets) {
   console.log("uncycleNets nets=", nets.map(n => n.id));
   // mark all the nets that will need to be duplicated
   nets.forEach(net => net.inCycle = true);

   const { src, fan, dst } = findEdge(nets);

   if (DEBUG) {
      console.error("cycles:", nets.map(n => n.id));
      console.error("  edge:", src.id, "->", dst.id);
   }
   
   // because src and dst are in a cycle, when duplicating from
   // src, dst will be reached and the second call to
   // duplicateCircuitFrom will simply return that copy without
   // duplicating again
   const dupsrc = duplicateCircuitFrom(machine, src);
   const dupdst = duplicateCircuitFrom(machine, dst);

   disconnect(src, dst)
   disconnect(dupsrc, dupdst)

   getBottomNet(machine).connectTo(dst, FAN.STD);
   markMaybeBottom(machine, dst);

   src.connectTo(dupdst, connType(fan));

   if (machine.dumpNets) {
      machine.dumpNets(machine, true, ".nets~.json");
   }
   
   resetCircuit(machine);
   
   // unmark all the nets that needed to be duplicated
   nets.forEach(net => net.inCycle = false);
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
/*    findMinimalEdges ...                                             */
/*    -------------------------------------------------------------    */
/*    Removes edges one by one until the cycle is gone.                */
/*---------------------------------------------------------------------*/
function findMinimalEdges(nets) {
   let res = [];

   for (let i = 0; i < nets.length - 1; i++) {
      res.push({ src: nets[i], dst: nets[i + 1] });
      nets[i].state = 3;

      if (!findCycle(nets)) {
	 return res;
      }
   }

   throw "error, should not have reached";
}

/*---------------------------------------------------------------------*/
/*    duplicateCircuitFrom ...                                         */
/*    -------------------------------------------------------------    */
/*    Duplicate a netList without duplicating registers.               */
/*---------------------------------------------------------------------*/
function duplicateCircuitFrom(machine, net) {

   function duplicateNet(net) {
      if (net.duplicate) {
	 return net.duplicate;
      } else if (!net.inCycle) {
	 return net;
      } else {
	 const dup = net.dup();
	 net.duplicate = dup;

	 if (DEBUG) {
	    console.error(`dup ${net.id} => ${dup.id} (${net.constructor.name})`);
	 }
	 
	 net.fanoutList.forEach(fan => {
	    if (!fan.net.inCycle) {
	       disconnect(net, fan.net);
	    }
	    dup.connectTo(duplicateNet(fan.net), connType(fan));
	 });
	 
	 net.faninList.forEach(fan => {
	    if (!fan.net.inCycle) {
	       fan.net.connectTo(dup, connType(fan));
	    }
	 });
	 
	 return dup;
      }
   }

   function mark(net, val) {
      if (net.marked !== val) {
	 net.marked = val;
	 net.fanoutList.forEach(fan => {
	    mark(fan.net, val);
	 });
      }
   }
   
   // phase 1 mark all the nets in the cycle
   const dup = duplicateNet(net);
   return dup;
}

/*---------------------------------------------------------------------*/
/*    cutEdges ...                                                     */
/*---------------------------------------------------------------------*/
function cutEdges(machine, cycle, edges) {

   cycle.forEach(n => n.inCycle = true);
   
   if (DEBUG) {
      console.error("cycle: ", cycle.map(n => n.id));
      console.error("cutting edges:",
		    edges.map(e => `${e.src.id}->${e.dst.id}`).join(","));
   }
   
   for (const { src, dst } of edges) {
      // because src and dst are in a cycle, when duplicating from
      // src, dst will be reached and the second call to
      // duplicateCircuitFrom will simply return that copy without
      // duplicating again
      const fan = src.fanoutList.find(f => f.net === dst);
      const dupsrc = duplicateCircuitFrom(machine, src);
      const dupdst = duplicateCircuitFrom(machine, dst);

      disconnect(src, dst)
      disconnect(dupsrc, dupdst)

      getBottomNet(machine).connectTo(dst, FAN.STD);
      markMaybeBottom(machine, dst);

      src.connectTo(dupdst, connType(fan));

   }
   
   if (machine.dumpNets) {
      machine.dumpNets(machine, true, ".nets~.json");
   }
   
   cycle.forEach(n => n.inCycle = false);
   resetCircuit(machine);
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
	 cutEdges(machine, cycle, findMinimalEdges(cycle));
      }
   } else {
      while (true) {
	 let scc = findSmallestScc(machine.nets);

	 // console.log("scc=", scc.map(n=> n.id));
	 if (scc) {
	    const cycle = findCycle(scc);

	    if (cycle) {
	       cutEdges(machine, cycle, findMinimalEdges(cycle));
	    }
	 } else {
	    throw "Could not find any cycle in SCC";
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
