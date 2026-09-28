/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/lib/uncycle.js                */
/*    -------------------------------------------------------------    */
/*    Author      :  manuel serrano                                    */
/*    Creation    :  Wed Apr  8 15:59:55 2026                          */
/*    Last change :  Mon Sep 28 08:09:26 2026 (serrano)                */
/*    Copyright   :  2026 manuel serrano                               */
/*    -------------------------------------------------------------    */
/*    Remove cycles from net lists for duplication.                    */
/*    -------------------------------------------------------------    */
/*    The general algorithm is as follows:                             */
/*                                                                     */
/*      - find all the SCC of length > 1 (using Tarjan)                */
/*      - for each SCC, find the set of cuts that removes the          */
/*        all the SCC cycles, call this set CUTS                       */
/*      - collect all the nodes invovled in the cuts, call this        */
/*        set CYCLES.                                                  */
/*      - Removes all the CUTS edges and duplicates |CUTS| times       */
/*        the part of the original graph in CYCLES (don't duplicate    */
/*        nodes not involved in any cycle).                            */
/*      - Reconnect all the copies with: out(n) -> in(n+1)             */
/*      - Disconnect all actions and out signals of the CYCLES         */
/*        and from the |edges|-1 copies.                               */
/*=====================================================================*/
"use strict"
"use hopscript"

/*---------------------------------------------------------------------*/
/*    es6 module                                                       */
/*---------------------------------------------------------------------*/
import * as config from "./config.js";
import * as ast from "./ast.js";
import * as error from "./error.js";
import { FAN, makeOr, RegisterNet, LogicalNet, SignalNet, WireNet, ActionNet } from "./net.js";

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

      if (DEBUG) {
	 console.error("getBottomNet:", net.id);
      }
   }
   
   return machine.bottomNet;
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
	 // ignore dependency links
	 if (!fan.dependency) {
	    const w = fan.net;

	    if (!(w instanceof RegisterNet)) {
	       if (indices[w.id] === undefined) {
		  strongconnect(w);
		  lowLink[v.id] = Math.min(lowLink[v.id], lowLink[w.id]);
	       } else if (onStack.has(w)) {
		  lowLink[v.id] = Math.min(lowLink[v.id], indices[w.id]);
	       }
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


   if (nets.length > 4096) {
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
   let sccs = tarjan(nets).filter(c => c.length > 1);

   if (sccs.length > 0) {
      sccs = sccs.sort((s1, s2) => s1.length > s2.length);

      const scc = sccs.find(s => s.length > 1);

      if (DEBUG) {
	 console.error("# scc: ", sccs.length);
	 console.error("scc=", scc.map(n => n.id).join(","));
      }
      
      return scc;
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
/*    findCycle ...                                                    */
/*---------------------------------------------------------------------*/
function findCycle(nets, ignoredEdges) {
   const state = [];
   const parent = [];
   const ignored = [];

   function dfs(n) {
      state[n.id] = 1;

      for (const f of n.fanoutList) {
	 if (!f.dependency && ignored[n.id].indexOf(f.net) < 0) {
	    const d = f.net;

	    if (state[d.id] === 0) {
	       parent[d.id] = n;

	       const cycle = dfs(d);

	       if (cycle) {
		  return cycle;
	       }
	    } else if (state[d.id] === 1) {
	       let cycle = [d];

	       while (n !== d) {
		  cycle.push(n);
		  n = parent[n.id];
	       }

	       return cycle.reverse();
	    }
	 }
      }

      state[n.id] = 2;
   }

   nets.forEach(n => {
      if (!(n instanceof RegisterNet)) {
	 state[n.id] = 0;
	 parent[n.id] = undefined;
	 ignored[n.id] = [];
      }
   });

   // mark the ignored edges
   ignoredEdges.forEach(({src, dst}) => {
      if (ignored[src.id]) {
	 ignored[src.id].push(dst);
      }
   });
	 
   for (const n of nets) {
      if (state[n.id] === 0) {
	 const cycle = dfs(n);

	 if (cycle) {
	    return cycle;
	 }
      }
   }

   return null;
}
	    
/*---------------------------------------------------------------------*/
/*    findCuts ...                                                     */
/*    -------------------------------------------------------------    */
/*    Returns a set of edges that break the cycle.                     */
/*---------------------------------------------------------------------*/
function findCuts(cycle, optimize) {
   let cuts = [];

   ret: for (const src of cycle) {
      for (const fan of src.fanoutList) {
	 const dst = fan.net;

	 if (cycle.indexOf(dst) >= 0) {
	    cuts.push({ src, dst, fan });
	    
	    if (optimize && !findCycle(cycle, cuts)) {
	       break ret;
	    }
	 }
      }
   }
   
   if (DEBUG) {
      console.error("cuts:", cuts.map(c => `${c.src.id}->${c.dst.id}`).join(", "));
   }
	    
   return cuts;
}

/*---------------------------------------------------------------------*/
/*    duplicateAcyclicCircuit ...                                      */
/*---------------------------------------------------------------------*/
function duplicateAcyclicCircuit(cycle, connectOutputs) {

   const incycle = [];
   
   function duplicateNet(net) {
      if (!(incycle[net.id])) {
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
	    console.error(`  dup ${net.id} => ${dup.id} (${net.constructor.name} ${net.faninList.length})`);
	 }
	 
	 net.fanoutList.forEach(fan => {
	    if (incycle[fan.net.id] || connectOutputs) {
	       const dtgt = duplicateNet(fan.net);

	       if ((dtgt.faninList.length > 0)
		  && ((dtgt instanceof WireNet) || (dtgt instanceof RegisterNet))) {
		  const lg = dtgt.promoteAsLogicalGate();
		  dup.connectTo(lg, connType(fan));
	       } else {
		  dup.connectTo(dtgt, connType(fan));
	       }
	    }
	 });
	 net.faninList.forEach(fan => {
	    if (!(incycle[fan.net.id])) {
	       fan.net.connectTo(dup, connType(fan));
	    }
	 });
	 
	 return dup;
      }
   }

   // mark all the net in the cycle to avoid copying those nets
   // that are not in any cycle
   cycle.forEach(n => incycle[n.id] = true);
   cycle.forEach(n => n.duplicate = undefined);
   
   return cycle.map(duplicateNet);
}

/*---------------------------------------------------------------------*/
/*    cutEdgesAndCopy ...                                              */
/*---------------------------------------------------------------------*/
function cutEdgesAndCopy(cycle, edges) {
   if (DEBUG) {
      cycle.forEach(n => {
	 console.error("CUT", n.id, " fanin=", n.faninList.map(f => f.net.id));
      });
   }
   
   // remove all the edges from the graph to produce an acyclic graph
   edges.forEach(e => disconnect(e.src, e.dst));

   // generate N copies the acylic graph
   return edges.map((_, i) => duplicateAcyclicCircuit(cycle, i === (edges.length - 1)));
}

/*---------------------------------------------------------------------*/
/*    unaction ...                                                     */
/*    -------------------------------------------------------------    */
/*    Replace action/signals nets with logical nets (in the duplicas). */
/*---------------------------------------------------------------------*/
function unaction(nets) {
   return nets.forEach(n => {
      if ((n instanceof ActionNet)
	 || (n instanceof SignalNet && n.accessibility === ast.LOCAL)) {
	 const m = new LogicalNet(n.astNode, n.debugName + "!", n.lvl, n.neutral);
	 const fin = n.faninList;
	 const fout = n.fanoutList;

	 n.neutral = false;
	 m.maybeBottom = true;

	 if (DEBUG) {
	    console.error("unaction", n.id, n.constructor.name, "=>", m.id);
	 }
	 
	 fin.forEach(fan => {
	    disconnect(fan.net, n);
	    fan.net.connectTo(m, connType(fan));
	 });

	 fout.forEach(fan => {
	    disconnect(n, fan.net);
	    m.connectTo(fan.net, connType(fan));
	 });
      }
   });
}

/*---------------------------------------------------------------------*/
/*    reconnect ...                                                    */
/*---------------------------------------------------------------------*/
function reconnect(mach, edges, cycle, copies) {
   const incycle = [];
   cycle.forEach(n => incycle[n.id] = true);

   // remove the out edges of the nodes of the cycle
   // to the others part of the original graph
   cycle.forEach(n => {
      if (DEBUG) console.error("RECONN", n.id, n.faninList.map(f => f.net.id));
      n.fanoutList = n.fanoutList.filter(fan => {
	 if (incycle[fan.net.id]) {
	    return true;
	 } else {
	    disconnect(n, fan.net);
	    return false;
	 }
      });
   });
   
   edges.forEach(({src, dst, fan}) => {
      const ddst = copies[0].find(n => n.origin === dst);

      if (!ddst) {
	 throw new TypeError(`Cannot find copy of ${dst.id}`);
      }

      src.connectTo(ddst, connType(fan));
      getBottomNet(mach).connectTo(dst, FAN.STD);
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

   if (DEBUG) {
      cycle.forEach(n => {
	 console.error("RECONN.end", n.id, n.faninList.map(f => f.net.id));
      });
   }
}

/*---------------------------------------------------------------------*/
/*    uncycleAuto ...                                                  */
/*---------------------------------------------------------------------*/
function uncycleAuto(machine) {
   let sccs = tarjan(machine.nets).filter(c => c.length > 1);

   if (DEBUG) {
      console.error("#nets:", machine.nets.length, "#scc:", sccs.length);
   }
   
   if (sccs.length > 0) {
      const cuts = sccs.map(scc => findCuts(scc, true)).flat();
      const cycles = [... new Set(cuts.map(({src, dst}) => [src, dst]).flat())];
      const copies = cutEdgesAndCopy(cycles, cuts);

      if (DEBUG) {
	 console.error("cycles=", cycles.map(n => n.id));
      }
      
      reconnect(machine, cuts, cycles, copies);

      unaction(cycles);
      for (let i = 0; i < copies.length - 1; i++) {
	 unaction(copies[i]);
      }
   }
}

/*---------------------------------------------------------------------*/
/*    uncycle ...                                                      */
/*---------------------------------------------------------------------*/
function uncycle(machine) {
   const uncyclestart = Date.now();
   const length = machine.nets.length;

   const userNets = config.Process.env.HIPHOP_UNCYCLE_NETS?.split(",")
      .map(s => parseInt(s.trim()));

   if (userNets) {
      const cycle = findCycle(userNets, []);

      if (!cycle) {
	 throw "User nets ${config.Process.env.HIPHOP_UNCYCLE_NETS} are no cycle!";
      } else {
	 const ecycle = extractSIGio(cycle);
	 cutEdges(ecycle, findMinimalEdges(ecycle));
      }
   } else {
      uncycleAuto(machine);
      machine.nets = machine.nets.filter(n => {
	 if (n.neutral !== false || n.faninList.length > 0 || n.fanoutList.length > 0) {
	    return true;
	 } else {
	    if (DEBUG) console.error("FILTER out:", n.id);
	    return false;
	 }
      });
   }
   
   if (machine.dumpNets) {
      machine.dumpNets(machine, true, ".nets~.json");
   }
   
   machine.status.uncycle = {
      status: "success",
      growthFactor: machine.nets.length / length,
      time: Date.now() - uncyclestart
   }

   return machine;
}
