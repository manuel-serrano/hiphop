/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/lib/sweep.js                  */
/*    -------------------------------------------------------------    */
/*    Author      :  Manuel Serrano                                    */
/*    Creation    :  Sun Sep 30 02:30:11 2018                          */
/*    Last change :  Fri Dec 20 12:33:30 2024 (serrano)                */
/*    Copyright   :  2018-25 Manuel Serrano                            */
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
/*    sweepLogicalNets ...                                             */
/*    -------------------------------------------------------------    */
/*    Apply two transformations:                                       */
/*    1) Remove logical nets with no fanin                             */
/*       For that, propagate the neutral value to all the fanouts      */
/*    2) Remove logical nets with single fanin                         */
/*       p --> u  +--> s                                               */
/*                +--> s'                                              */
/*                +--> s''                                             */
/*       Let's name "fxy" a (directed) fan that connects x to y.       */
/*       To remove nets u that have a single fanin by applying the     */
/*       rules:                                                        */
/*         - Let u a net with a single fanin fup, from a net p;        */
/*         - Let s a net in u's fanout; let fsu the s's fanin          */
/*           that connects it to u.                                    */
/*         => Redirect P to S with the polarity:                       */
/*              !(Fup.polarity xor Fsu.polarity)                       */
/*---------------------------------------------------------------------*/
function sweepLogicalNets(machine) {
   
   function xor(p, q) {
      return (p || q) && !(p && q);
   }
   
   function sweep(u, p, fpu, fus) {
      // sweep a net by re-connecting fanin to fanout.
      const s = fus.net;
      const fsu = s.fanin_list.find(fan => fan.net === u);
      const fps = Object.assign({},fpu);

      fsu.net = p;
      
      fps.net = s;
      fps.polarity = !xor(fpu.polarity, fus.polarity);
      p.fanout_list.push(fps);
   }

   let res = false;

   machine.nets.forEach(net => {
      if (net instanceof LogicalNet && net.fanin_list.length === 0) {
/* 	 const u = net;                                                */
/* 	 u.fanout_list.forEach(fus => {                                */
/* 	    const p = fus.net;                                         */
/* 	    const v = fus.polarity ? u.neutral : !u.neutral;           */
/* 	    fus.net.fanin_list = fus.net.fanin_list.filter(n => n !== u); */
/* 	 });                                                           */
/* 	 deleteNet(machine,u);                                         */
      } else if (net.sweepable) {
	 // action nets have sweepable set to false
	 if (net instanceof LogicalNet && net.fanin_list.length === 1) {
	    const u = net;
	    const fup = net.fanin_list[0];
	    const p = fup.net;
	    const fpuIndex = p.fanout_list.findIndex(fan => fan.net === u);
	    const fpu = p.fanout_list[fpuIndex];

	    // remove the fan from p to u
	    p.fanout_list.splice(fpuIndex, 1);

	    // connect p directly to s
	    u.fanout_list.forEach(fus => sweep(u, p, fpu, fus));

	    // remove u from the machine and mark that the net list has changed
	    deleteNet(machine, u);
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
   
   machine.nets.forEach(net => {
      // action nets have noSwee to true
      if (net.sweepable)
	 if (net instanceof LogicalNet) {
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
   while (sweepLogicalNets(machine) || sweepDeadendNets(machine)) {
      ;
   }
   return machine;
}
