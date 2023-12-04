/*=====================================================================*/
/*    serrano/prgm/project/hiphop/1.3.x/lib/sweep.js                   */
/*    -------------------------------------------------------------    */
/*    Author      :  Manuel Serrano                                    */
/*    Creation    :  Sun Sep 30 02:30:11 2018                          */
/*    Last change :  Mon Dec  4 10:34:31 2023 (serrano)                */
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
/*    preSweep ...                                                     */
/*---------------------------------------------------------------------*/
function preSweep(machine) {
    let SweepFlag=true;
    let sigList=[];
    machine.nets.forEach(element => {   
	if (element.signal !== undefined) {
	    sigList.push(element.signal)
	}
    });
    let retainList = [];
    let purgeList;
    machine.nets.forEach(element => { 
	if (element.actionArgs !== undefined) {
	    let dict_list = element.accessor_list;
	    dict_list.forEach(dict=>{
		retainList.push(dict.signame); 
	    });
	}
    });
    purgeList = sigList.filter(v => !(retainList.find(element => element === v.name)));
    purgeList.forEach(v => {
	v.pre_reg.noSweep = false;
	v.pre_gate.noSweep = false;
    });
    let tempList =[];
    tempList=machine.nets[0].ast_node.sigDeclList;
    tempList.forEach(v => {
	let indexTemp = sigList.find(element => {
	    if (element === v.name) return true;
	});
	/*
	if (indexTemp === false) {
	    let fout = v.signal.pre_reg.fanout_list;
		
	    if (fout.length === 0){
			v.signal.pre_reg.noSweep = false;
	    	v.signal.pre_gate.noSweep = false;
	    } 
	}
	*/
    });		
}

/*---------------------------------------------------------------------*/
/*    sweepNet ...                                                     */
/*    -------------------------------------------------------------    */
/*    Sweep a net by re-connecting its fanin to its fanout.            */
/*---------------------------------------------------------------------*/
function sweepNet(machine, net, innet, outnet) {
   const fanout = innet.fanout_list.find(fan => fan.net === net);
   const fanin = outnet.fanin_list.find(fan => fan.net === net);
   console.error("innet=", innet.debug_id, "outnet=", outnet.debug_id);
   console.error("faninnet=", typeof fanin, "fanoutnet=", typeof fanout);
  
   fanout.net = outnet;
   fanin.net = innet;
}

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
/*    sweepOrNets ...                                                  */
/*    -------------------------------------------------------------    */
/*    Remove all the OR nets that have exactly one fanin and one       */
/*    fanout with positive polarities.                                 */
/*---------------------------------------------------------------------*/
function sweepOrNets(machine) {
   let res = false;

   machine.nets.filter(net => {
      if (net instanceof LogicalNet) {
	 if (!net.noSweep 
	    && net.fanin_list.length === 1
	    && net.fanin_list[0].polarity
	    && net.fanout_list.every(f => f.polarity)) {
	    const innet = net.fanin_list[0].net;

	    console.error("net=", net.debug_id);
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
/*    sweep ...                                                        */
/*---------------------------------------------------------------------*/
function sweep(machine) {
   while (sweepOrNets(machine)) {
      ;
   }
   return machine;
}
