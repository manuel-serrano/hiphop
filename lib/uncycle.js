/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/lib/uncycle.js                */
/*    -------------------------------------------------------------    */
/*    Author      :  manuel serrano                                    */
/*    Creation    :  Wed Apr  8 15:59:55 2026                          */
/*    Last change :  Thu Apr  9 08:15:44 2026 (serrano)                */
/*    Copyright   :  2026 manuel serrano                               */
/*    -------------------------------------------------------------    */
/*    Remove cycles in net list.                                       */
/*=====================================================================*/
"use strict"
"use hopscript"

/*---------------------------------------------------------------------*/
/*    es6 module                                                       */
/*---------------------------------------------------------------------*/
import * as config from "./config.js";
import * as ast from "./ast.js";
import * as error from "./error.js";
import { RegisterNet, FAN } from "./net.js";

export { uncycle };

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
      } else if (net instanceof RegisterNet) {
	 net.fanoutList(fan => {
	    const target = duplicateNet(fan.net);

	    if (target !== fan.net) {
	       this.connectTo(target, connType(fan));
	    }
	 });
	 
	 return net;
      } else {
	 const dup = net.dup();
	 net.duplicate = dup;

	 console.error(`dup ${net.id} => ${dup.id}`);
	 
	 net.fanoutList.forEach(fan => {
	    const target = duplicateNet(fan.net);
	    if (target !== fan.net) {
	       dup.connectTo(target, connType(fan));
	    }
	 });
	 
	 return dup;
      }
   }

   return duplicateNet(net);
}

/*---------------------------------------------------------------------*/
/*    resetCircuit ...                                                 */
/*---------------------------------------------------------------------*/
function resetCircuit(machine) {
   machine.nets.forEach(n => n.duplicate = undefined);
}
   
/*---------------------------------------------------------------------*/
/*    uncycleNets ...                                                  */
/*---------------------------------------------------------------------*/
function uncycleNets(machine, cycles) {
   cycles.forEach(c => {
      const fan = c.src.fanoutList.find(fan => fan.net === c.dst);
      
      if (!fan) {
	 console.error(`nets ${c.src} and ${c.dst} are not connected!`);
	 throw "hiphop uncycle error";
      } else {
	 const dupdst = duplicateCircuitFrom(machine, c.dst);
	 const dupsrc = duplicateCircuitFrom(machine, c.src);

	 disconnect(c.src, c.dst)
	 disconnect(dupsrc, dupdst)
	 
	 c.src.connectTo(dupdst, connType(fan));

	 resetCircuit(machine);
      }
   });
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
	 
	 if (indices[neighbor.id] === undefined) {
            dfs(neighbor);
            lowLink[net.id] = Math.min(lowLink[net.id], lowLink[neighbor.id]);
	 } else if (onStack.has(neighbor)) {
            lowLink[net.id] = Math.min(lowLink[net.id], indices[neighbor.id]);
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
      if (indices[n.id] === undefined) dfs(n);
   });

   return components;
}

/*---------------------------------------------------------------------*/
/*    findCycles ...                                                   */
/*---------------------------------------------------------------------*/
function findCycles(nets) {
   const scc = tarjan(nets).filter(c => c.length > 1);

   return scc.flatMap(c => {
      return [ c[1], c[0] ];
   });
}

/*---------------------------------------------------------------------*/
/*    uncycle ...                                                      */
/*---------------------------------------------------------------------*/
function uncycle(machine) {
   const uncyclestart = Date.now();

   const nets = process.env.HIPHOP_UNCYCLE_NETS?.split(",")
      .map(s => parseInt(s.trim()))
      .map(id => machine.nets.find(n => n.id === id))
      ?? findCycles(machine.nets);

   console.log("cycles: ", nets.map(n => n.id));
   
   if (nets.length > 0) {
      if (nets.length % 2 !== 0) {
	 console.error(`cycle should contain an even number of nets ${nets}`);
	 throw "hiphop uncycle error";
      }

      const cycles = Array.from({ length: nets.length / 2 }, (_, i) => {
	 return {src: nets[2 * i], dst: nets[2 * i + 1]};
      });

      uncycleNets(machine, cycles);
   }
   
   if (machine.dumpNets) {
      machine.dumpNets(machine, true, ".nets~.json");
   }

   
   machine.status.uncycle = {
      status: "success",
      time: Date.now() - uncyclestart
   }
   
   return machine;
}
