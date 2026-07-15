/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/lib/uncycle.js                */
/*    -------------------------------------------------------------    */
/*    Author      :  manuel serrano                                    */
/*    Creation    :  Wed Apr  8 15:59:55 2026                          */
/*    Last change :  Thu Jun  4 15:37:01 2026 (serrano)                */
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
const DEBUG = process.env.HIPHOP_TRACE?.split(",")?.find?.(n => n === "uncycle"); 

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
function findEdge(nets) {
   const src = nets[0];
   const fan = src.fanoutList.find(fan => fan.net.inCycle);
   const dst = fan.net;

   return {src, fan, dst};
}

/*---------------------------------------------------------------------*/
/*    uncycleNets ...                                                  */
/*    -------------------------------------------------------------    */
/*    Remove the cycles composed from the net list. All the nets       */
/*    arguments are in that cycle.                                     */
/*---------------------------------------------------------------------*/
function uncycleNets(machine, nets) {
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
/*    uncycle ...                                                      */
/*---------------------------------------------------------------------*/
function uncycle(machine) {
   const length = machine.nets.length;
   const uncyclestart = Date.now();

   const userCycle = process.env.HIPHOP_UNCYCLE_NETS?.split(",")
      .map(s => parseInt(s.trim()));

   if (userCycle) {
      uncycleNets(machine, machine.nets.map(id => machine.nets.find(n => n.id === id)));
   } else {
      while (true) {
	 let scc = findSmallestScc(machine.nets);

	 if (scc) {
	    uncycleNets(machine, scc);
	 } else {
	    break;
	 }
	 break;
      }
      
      if (machine.dumpNets) {
	 machine.dumpNets(machine, true, ".nets~.json");
      }
   }
   
   machine.status.uncycle = {
      status: "success",
      growthFactor: machine.nets.length / length,
      time: Date.now() - uncyclestart
   }

   if (DEBUG) {
      console.error("uncycle length:", length, "->", machine.nets.length);
   }
   
   return machine;
}
