/*=====================================================================*/
/*    serrano/prgm/project/hiphop/1.3.x/lib/sweep.js                   */
/*    -------------------------------------------------------------    */
/*    Author      :  Manuel Serrano                                    */
/*    Creation    :  Sun Sep 30 02:30:11 2018                          */
/*    Last change :  Mon Dec  4 11:58:29 2023 (serrano)                */
/*    Copyright   :  2018-23 Manuel Serrano                            */
/*    -------------------------------------------------------------    */
/*    HipHop Sweep optimization                                        */
/*=====================================================================*/
"use strict"
"use hopscript"

/*---------------------------------------------------------------------*/
/*    es6 module                                                       */
/*---------------------------------------------------------------------*/
import * as ast from "./ast.js";
import * as error from "./error.js";
import { LogicalNet } from "./net.js";
import * as signal from "./signal.js";

export { sweep };
       
/*---------------------------------------------------------------------*/
/*    deleteNet ...                                                    */
/*    -------------------------------------------------------------    */
/*    Delete a net from the machine net array.                         */
/*---------------------------------------------------------------------*/
function deleteNet(machine, net) {
   const i = machine.nets.findIndex(n => n === net);
   machine.nets.splice(i, 1);
}
   
/*---------------------------------------------------------------------*/
/*    sweepNet ...                                                     */
/*    -------------------------------------------------------------    */
/*    Sweep a net by re-connecting its fanin to its fanout.            */
/*---------------------------------------------------------------------*/
function sweepNet(machine, net, innet, outnet) {
   const fanout = innet.fanout_list.find(fan => fan.net === net);
   const fanin = outnet.fanin_list.find(fan => fan.net === net);

   if (fanout) {
      fanout.net = outnet;
   } else {
      // the node we are suppressing as a single fanin and several fanouts,
      // add a new fanout to innet
      const oldfan = net.fanout_list.find(fan => fan.net === outnet);
      const newfan = {}.assign(oldfan);
      innet.fanout_list.push(newfan);
   }
   fanin.net = innet;
}

/*---------------------------------------------------------------------*/
/*    sweepOrNets ...                                                  */
/*    -------------------------------------------------------------    */
/*    Remove logical nets (AND/OR) that have a single fanin and        */
/*    and several fanouts but all with positive polarities.            */
/*---------------------------------------------------------------------*/
function sweepOrNets(machine) {
   let res = false;

   machine.nets.filter(net => {
      if (!net.noSweep && net instanceof LogicalNet) {
	 if (net.fanin_list.length === 1
	    && net.fanout_list.length === 1
	    && net.fanin_list[0].polarity
	    && net.fanout_list.every(f => f.polarity)) {
	    const innet = net.fanin_list[0].net;

	    // reconnect the fanin and the fanouts
	    net.fanout_list.forEach(fanout => {
	       sweepNet(machine, net, innet, fanout.net);
	    });
	    
	    deleteNet(machine, net);
	    // mark that net list has been changed
	    res = true;
	 }
      }
   });
   
   return res;
}

/*---------------------------------------------------------------------*/
/*    sweepDeadendNets ...                                             */
/*    -------------------------------------------------------------    */
/*    Remove the nets that have no fanout.                             */
/*---------------------------------------------------------------------*/
function sweepDeadendNets(machine) {
   let res = false;
   
   machine.nets.filter(net => {
      if (!net.noSweep && net instanceof LogicalNet) {
	 if (net.fanout_list.length === 0) {
	    net.fanin_list.forEach(fan => {
	       const innet = fan.net
	       const i = innet.fanout_list.findIndex(fan => fan.net === net);

	       innet.fanout_list.splice(i, 1);
	    });

	    deleteNet(machine, net);
	    //mark that the net has been updated
	    res = true;
	 }
      }
   });
	 
   return res;
}

/*---------------------------------------------------------------------*/
/*    sweep ...                                                        */
/*---------------------------------------------------------------------*/
function sweep(machine) {
   while (sweepOrNets(machine) || sweepDeadendNets(machine) ) {
      ;
   }
   return machine;
}
