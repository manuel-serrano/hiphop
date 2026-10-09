/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/lib/uncycle.js                */
/*    -------------------------------------------------------------    */
/*    Author      :  manuel serrano                                    */
/*    Creation    :  Wed Apr  8 15:59:55 2026                          */
/*    Last change :  Fri Oct  9 15:52:04 2026 (serrano)                */
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
import { FAN, makeBottom, RegisterNet, LogicalNet, SignalNet, WireNet, ActionNet, TestExpressionNet } from "./net.js";

export { uncycle };

/*---------------------------------------------------------------------*/
/*    Debug                                                            */
/*---------------------------------------------------------------------*/
const DEBUG =
   config.Process.env.HIPHOP_TRACE?.split(",")?.find?.(n => n === "uncycle"); 
const STATS =
   config.Process.env.HIPHOP_TRACE?.split(",")?.find?.(n => n === "uncycle-stats"); 

/*---------------------------------------------------------------------*/
/*    Minimum Feedback Edge Set algorithm                              */
/*---------------------------------------------------------------------*/
const MFES =
   config.Process.env.HIPHOP_MFES ?? "GreedyFAS";

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
      const net = makeBottom(machine.ast, "bottom", 0);
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
/*    debugCuts ...                                                    */
/*---------------------------------------------------------------------*/
function debugCuts(cuts) {
   if (DEBUG) {
      console.error(
         "cuts: ",
         cuts.map(c => `${c.src.id}->${c.dst.id}`).join(", "));
   }
   
   return cuts;
}


/*---------------------------------------------------------------------*/
/*    findCutsInLinearArrangement ...                                  */
/*---------------------------------------------------------------------*/
function findCutsInLinearArrangement(la) {
   const cuts = [];
   
   if (DEBUG) {
      console.error("findCutsinlineararrangement LA=", la.map(n => n.id).join(", "));
   }
   
   for (let i = la.length - 1; i > 0; i--) {
      // remove all the backward edges in la
      const fan = la[i].fanoutList.find(({net}) => {
         for (let j = i - 1; j >= 0; j--) {
            if (la[j] === net) {
               return true;
            }
         }
      });
      
      if (fan) {
         cuts.push({ src: la[i], dst: fan.net, fan });
      }
   }
   
   return debugCuts(cuts);
}

/*---------------------------------------------------------------------*/
/*    oneByOne ...                                                     */
/*---------------------------------------------------------------------*/
function oneByOne(cycle, optimize) {
   // remove edges one by one until there are no more cycle
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
   
   return cuts;
}

/*---------------------------------------------------------------------*/
/*    greedyFas ...                                                    */
/*---------------------------------------------------------------------*/
function greedyFas(cycle) {
   let G = [...cycle];
   let s1 = [];
   let s2 = [];
   
   G.forEach(v => {
      v.fanoutListGreedyFas =
         v.fanoutList.filter(f => G.indexOf(f.net) >= 0);
      v.faninListGreedyFas =
         v.faninList.filter(f => G.indexOf(f.net) >= 0);
      
      v.deltaGreedyFas =
         v.fanoutListGreedyFas.length - v.faninListGreedyFas.length;
   })
   
   while (G.length > 0) {
      let u;
      
      while (u = G.find(v => v.fanoutListGreedyFas.length === 0)) {
         // u is a sink
         s2 = [u].concat(s2);
         G = G.filter(n => n !== u);
         
         u.fanoutListGreedyFas.forEach(({net}) => net.deltaGreedyFas--);
         
         G.forEach(v => {
            v.fanoutListGreedyFas =
               v.fanoutListGreedyFas.filter(f => f.net !== u);
         });
      }
      
      while (u = G.find(v => v.faninListGreedyFas.length === 0)) {
         // u is a source
         s1.push(u);
         G = G.filter(n => n !== u);
         
         u.fanoutListGreedyFas.forEach(({net}) => net.deltaGreedyFas++);
      }
      
      if (G.length > 0) {
         // compute u such as delta(u) is maximum
         for (let i = 0, m = -G.length - 1; i< G.length; i++) {
            if (G[i].deltaGreedyFas > m) { 
               u = G[i];
            }
         }
         s1.push(u);
         G = G.filter(n => n !== u);
         G.forEach(v => {
            v.fanoutListGreedyFas =
               v.fanoutListGreedyFas.filter(f => f.net !== u);
            v.faninListGreedyFas =
               v.faninListGreedyFas.filter(f => f.net !== u);
            v.deltaGreedyFas =
               v.fanoutListGreedyFas.length - v.faninListGreedyFas.length;
         });
      }
   }
   
   cycle.forEach(v => {
      delete v.fanoutListGreedyFas;
      delete v.faninListGreedyFas;
      delete v.deltaFGreedyFas;
   });
   
   return findCutsInLinearArrangement(s1.concat(s2));
}

/*---------------------------------------------------------------------*/
/*    kwikSort ...                                                     */
/*---------------------------------------------------------------------*/
function kwikSort(cycle) {
   
   function arc(A, i, p) {
      const n = A[i];
      const m = A[p];
      
      return n.fanoutList.find(({net}) => net === m);
   }
   
   function swap(A, i, j) {
      const n = A[i];
      A[i] = A[j];
      A[j] = n;
   }
   
   function kwik(A, lo, hi) {
      if (lo < hi) {
         let lt = lo;
         let gt = hi;
         let i = lo;
         let p = Math.floor((hi-lo)/2) + lo;
         let swapMade = false;
         
         while (i <= gt) {
            if (arc(A, i, p)) {
               swap(A, lt, i);
               swapMade = true;
               lt++;
               i++;
            } else if (arc(A, p, i)) {
               swap(A, i, gt);
               swapMade = true;
               gt--;
            } else {
               i++;
            }
         }
         
         if (kwik(A, lo, lt-1)) {
            kwik(A, lt, gt);
         }
         kwik(A, gt+1, hi);
         
         return swapMade;
      } else {
         return false;
      }
   }
   
   kwik(cycle, 0, cycle.length - 1);
   
   return findCutsInLinearArrangement(cycle);
}

/*---------------------------------------------------------------------*/
/*    kwikSortAilon ...                                                */
/*    -------------------------------------------------------------    */
/*    This algorithm seems wrong as it may "forget" nodes of the       */
/*    orignal cycle.                                                   */
/*---------------------------------------------------------------------*/
function kwikSortAilon(cycle) {
   
   function kwik(cycle) {
      if (cycle.length === 0) {
         return cycle;
      } else {
         let vl = [];
         let vr = [];
         let i = cycle[Math.floor(cycle.length / 2)];
         
         console.log("i=", i.id);
         
         cycle.forEach(j => {
            console.log("  j=", j.id, j.fanoutList.map(({net}) => net.id));
            if (j !== i) {
               if (j.fanoutList.find(({net}) => net === i)) {
                  vl = [j].concat(vl);
               } else if (i.fanoutList.find(({net}) => net === j)) {
                  vr = vr.concat([j]);
               }
            }
         });
         
         return kwik(vl).concat([i],kwik(vr));
      }
   }
   
   return findCutsInLinearArrangement(kwik(cycle));
}

/*---------------------------------------------------------------------*/
/*    minimumFeedbackEdgeSet ...                                       */
/*    -------------------------------------------------------------    */
/*    Returns a set of edges that break the cycle.                     */
/*---------------------------------------------------------------------*/
function minimumFeedbackEdgeSet(cycle, algorithm = false) {
   
   if (DEBUG) {
      console.error(algorithm, "scc=", cycle.map(n => n.id).join(", "));
   }
   
   switch (algorithm) {
      case "GreedyFAS": return greedyFas(cycle);
      case "KwikSort": return kwikSort(cycle);
      case "KwikSortAilon": return kwikSortAilon(cycle);
      case "OneByOne": return oneByOne(cycle, true);
      case "OneByOneNoOpt": return oneByOne(cycle, false);
      default: throw Error("unknown uncycle algorithm \"" + algorithm + "\"");
   }
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
               if (DEBUG) {
                  console.error(`    ${fan.net.id} -> ${dup.id} (${connType(fan)})`);
               }

               if (!fan.dependency) {
                  // fan dependencies are automatically handled in the net duplication
                  fan.net.connectTo(dup, connType(fan));
               }
            }
         });
         
         if (DEBUG) {
            console.error("    in:", dup.faninList.map(f=> f.net.id),
                          "out:", dup.fanoutList.map(f=> f.net.id));
         }

         return dup;
      }
   }
   
   // mark all the nets in the cycle to avoid copying the nets
   // that are not in any cycle
   cycle.forEach(n => incycle[n.id] = true);
   cycle.forEach(n => n.duplicate = undefined);

   if (DEBUG) {
      console.error("== copying cycle:", cycle.map(n => n.id));
   }
   
   return cycle.map(duplicateNet);
}

/*---------------------------------------------------------------------*/
/*    cutEdgesAndCopy ...                                              */
/*---------------------------------------------------------------------*/
function cutEdgesAndCopy(cycle, edges) {
   // remove all the edges from the graph to produce an acyclic graph
   edges.forEach(e => disconnect(e.src, e.dst));
   
   // generate N copies of the acylic graph
   return edges.map((_, i) => duplicateAcyclicCircuit(cycle, i === (edges.length - 1)));
}

/*---------------------------------------------------------------------*/
/*    unaction ...                                                     */
/*    -------------------------------------------------------------    */
/*    Replace action/signals nets with logical nets (in the replicas). */
/*---------------------------------------------------------------------*/
function unaction(nets) {
   return nets.forEach(n => {
      if ((n instanceof TestExpressionNet)) {
         // test expressions must be evaluated once for once
         // but contrary to plain action there evaluation cannot
         // be delayed to the last copy. 
         const func = n.func;
         let funcv = undefined;
         n.func = function() {
            if (funcv !== undefined) {
               return funcv;
            } else {
               funcv = func.call(this);
               return funcv;
            }
         };
      } else if ((n instanceof ActionNet)
         || (n instanceof SignalNet && n.accessibility === ast.LOCAL)) {
         const m = new LogicalNet(n.astNode, n.debugName + "!", n.lvl, n.neutral);
         const fin = n.faninList;
         const fout = n.fanoutList;
         
         n.neutral = false;
         m.maybeBottom = true;
         
         if (DEBUG) {
            console.error("unaction", n.id, n.constructor.name, n.signal?.name, "=>", m.id);
         }
         
         fin.forEach(fan => {
            disconnect(fan.net, n);
            fan.net.connectTo(m, fan.dependency ? FAN.STD : connType(fan));
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
      if (DEBUG) {
         console.error("RECONN.beg", n.id, n.faninList.map(f => f.net.id));
      }
      
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
   
   // connect the last copies to the output signal of the machines
   copies[copies.length - 1].forEach(n => {
      const o = n.origin;
      
      if ((o instanceof SignalNet) && o.signal.netSigList) {
         o.signal.netSigList[0] = n;
         if (DEBUG) {
            console.error("RECONN.out n=" + n.id, n.constructor.name,
                          "o=" + o.id, o.constructor.name,
                          "sig=" + o.signal.name);
         }
      }
   });
   
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
   
   sccs.forEach(scc => {
      const cuts = minimumFeedbackEdgeSet(scc, MFES);
      const copies = cutEdgesAndCopy(scc, cuts);
      
      if (DEBUG) {
         console.error("scc=", scc.map(n => n.id));
         if (findCycle(copies[copies.length - 1], [])) {
            throw new TypeError("Find cycle in last copy...");
         }
      }
      
      reconnect(machine, cuts, scc, copies);
      
      unaction(scc);
      for (let i = 0; i < copies.length - 1; i++) {
         unaction(copies[i]);
      }
   });
}

/*---------------------------------------------------------------------*/
/*    uncycleUser ...                                                  */
/*---------------------------------------------------------------------*/
function uncycleUser(machine, cycle) {
   const cuts = cycle.map(scc => minimumFeedbackEdgeSet(scc, MFES)).flat();
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

/*---------------------------------------------------------------------*/
/*    uncycle ...                                                      */
/*---------------------------------------------------------------------*/
function uncycle(machine) {
   const uncyclestart = Date.now();
   const length = machine.nets.length;
   
   const unets = config.Process.env.HIPHOP_UNCYCLE_NETS?.split(",")
      .map(s => parseInt(s.trim()));
   
   if (unets) {
      uncycleUser(machine, unets);
   } else {
      uncycleAuto(machine);
   }
   
   machine.nets = machine.nets.filter(n => {
      if (n.neutral !== false || n.faninList.length > 0 || n.fanoutList.length > 0) {
         return true;
      } else {
         if (DEBUG) console.error("FILTER out:", n.id,
                                  n.constructor.name, n.signal?.name);
         return false;
      }
   });
   
   if (machine.dumpNets) {
      machine.dumpNets(machine, true, ".nets~.json");
   }
   
   machine.status.uncycle = {
      status: "success",
      growthFactor: machine.nets.length / length,
      sizeBefore: length,
      sizeAfter: machine.nets.length,
      time: Date.now() - uncyclestart
   }
   
   if (STATS) {
      if (machine.nets.length > length) {
         const fname = machine.ast.loc.filename;
         const i = fname.lastIndexOf("/");
         
         console.error(fname.substring(i+1),
                       ": uncycle size before=",
                       length, "size after=", machine.nets.length);
      }
   }
   
   return machine;
}
