/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/lib/uncycle.js                */
/*    -------------------------------------------------------------    */
/*    Author      :  manuel serrano                                    */
/*    Creation    :  Wed Apr  8 15:59:55 2026                          */
/*    Last change :  Wed Apr  8 16:34:30 2026 (serrano)                */
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
function disconnect(src, tgt) {
   src.fanoutList = src.fanoutList.filter(fan => fan.net !== tgt);
   tgt.faninList = tgt.faninList.filter(fan => fan.net !== src);
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
	 const dup = this.dup();
	 net.duplicate = dup;
	 
	 net.fanoutList(fan => {
	    const target = duplicateNet(fan.net);
	    if (target !== fan.net) {
	       dup.connectTo(target, connType(fan));
	    }
	 });
	 
	 return dup;
      }
   }

   const dup = duplicateNet(net);
   // machine.nets.forEach(duplicateNet);
   machine.nets.forEach(n => net.duplicate = undefined);

   return dup;
}

/*---------------------------------------------------------------------*/
/*    uncycle ...                                                      */
/*---------------------------------------------------------------------*/
function uncycle(machine) {
   const uncyclestart = Date.now();

   const nets = process.env.HIPHOP_UNCYCLE?.split(",").map(s => s.trim()) ?? [];

   if (nets.length > 0) {
      const [src, tgt] = nets.map(id => machine.nets.find(n => n.id === id));

      const dup = duplicateCircuitFrom(machine, tgt);
      const fan = src.fanoutList.find(fan => fan.net === dup);
      
      disconnect(src, tgt)
      src.conneccTo(dup, connType(fan));
   }
   
   machine.status.uncycle.time = Date.now() - uncyclestart;
   return machine;
}
