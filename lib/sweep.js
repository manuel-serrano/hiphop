/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/lib/sweep.js                  */
/*    -------------------------------------------------------------    */
/*    Author      :  Manuel Serrano                                    */
/*    Creation    :  Sun Sep 30 02:30:11 2018                          */
/*    Last change :  Mon May 27 14:53:04 2019 (serrano)                */
/*    Copyright   :  2018-19 Manuel Serrano                            */
/*    -------------------------------------------------------------    */
/*    HipHop Sweep optimization                                        */
/*=====================================================================*/
"use strict"
"use hopscript"

/*---------------------------------------------------------------------*/
/*    import                                                           */
/*---------------------------------------------------------------------*/
const ast = require("./ast.js");
const error = require("./error.js");
const net = require("./net.js");
const signal = require("./signal.js");
const lang = require("./lang.js");

/*---------------------------------------------------------------------*/
/*    sweep ...                                                        */
/*---------------------------------------------------------------------*/

function preSweep( machine ){
	let SweepFlag=true;
	machine.nets.forEach(element => {   
   		if(element.signal!==undefined ){
			element.signal.SweepFlag=false;
		}
    });
	let tempList =[];
   	tempList=machine.nets[0].ast_node.sigDeclList;
		tempList.forEach(v=>{
			if(v.signal.SweepFlag!== false){
				v.signal.pre_reg.noSweep = false;
				v.signal.pre_gate.noSweep = false;
			}
	});

	tempList.forEach(v=>{
		delete v.signal.SweepFlag;
	});
	
}

function sweep( machine ) {

   preSweep(machine);
   let netList = machine.nets.filter(net => net.noSweep ? false : true);

   function deleteFan(net, fan) {
      function _in(net, fan) {
	 let i = net.fanin_list.indexOf(fan);
	 if (i > -1) {
	    net.fanin_list.splice(i, 1);
	    _out(fan.net, fan.antagonist);
	 }
      }
      function _out(net, fan) {
	 let i = net.fanout_list.indexOf(fan);
	 if (i > -1) {
	    net.fanout_list.splice(i, 1);
	    _in(fan.net, fan.antagonist);
	 }
      }

      if (net.fanin_list.indexOf(fan) > -1) {
	 _in(net, fan);
      } else {
	 _out(net, fan);
      }
   }

   function deleteNet(net) {
      if (!net.fanout_list.length) {
      	 let astNetList = net.ast_node.net_list;
	 let idast = astNetList.indexOf(net);
	 if (idast > -1) {
      	    astNetList.splice(idast, 1);
	 }

      	 let machineNetList = machine.nets;
	 let idmach = machineNetList.indexOf(net);
	 if (idmach > -1) {
      	    machineNetList.splice(idmach, 1);
	 }

      }
   }

   function constantFolding(net) {
      net.fanout_list.slice().forEach(fan => {
	 if (fan.dependency) {
	    return;
	 }

	 let value = fan.polarity ? net.neutral : !net.neutral;
	 if (fan.net.neutral == value) {
	    deleteFan(net, fan);
	    if (!fan.net.fanin_list.length && !fan.net.noSweep) {
	       netList.push(fan.net);
	    }
	 } else if (!fan.net.noSweep) {
	    fan.net.neutral = value;
	    fan.net.fanin_list.slice().forEach(fanin => {
	       if (!fanin.dependency) {
	 	  deleteFan(fan.net, fanin);
	       }
	    });
	    if (!fan.net.fanin_list.length) {
	       netList.push(fan.net);
	    }
	 }
      });

      if (!net.fanout_list.length) {
	 deleteNet(net);
      }
   }

   function removeBuffer(buffer) {
      let fanin = buffer.fanin_list[0];

      buffer.fanout_list.slice().forEach(fanout => {
	 if (fanout.dependency) {
	    deleteFan(buffer, fanout);
	    fanin.net.connectTo(fanout.net, net.FAN.DEP);
	 } else if (!fanin.dependency) {
	    deleteFan(buffer, fanout);
	    fanin.net.connectTo(fanout.net, (fanin.polarity === fanout.polarity
					     ? net.FAN.STD
					     : net.FAN.NEG));
	 }
      });

      if (!buffer.fanout_list.length) {
	 deleteFan(buffer, fanin);
	 deleteNet(buffer);
      }
   }

   while (netList.length) {
      let net = netList.shift();
      let len = net.fanin_list.length;

      if (!len) {
   	 constantFolding(net);
      } else if (len == 1) {
		  
   	 removeBuffer(net);
      }
   }
}

/*---------------------------------------------------------------------*/
/*    exports                                                          */
/*---------------------------------------------------------------------*/
exports.sweep = sweep;
