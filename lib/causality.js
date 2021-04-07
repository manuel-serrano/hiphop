/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/lib/causality.js              */
/*    -------------------------------------------------------------    */
/*    Author      :  Manuel Serrano & Jayanth Krishnamurthy            */
/*    Creation    :  Tue Jul  9 11:59:33 2019                          */
/*    Last change :  Tue Jul  9 14:11:39 2019 (serrano)                */
/*    Copyright   :  2019 Inria                                        */
/*    -------------------------------------------------------------    */
/*    HipHop causality error messages                                  */
/*=====================================================================*/
"use strict"
"use hopscript"

/*---------------------------------------------------------------------*/
/*    imports                                                          */
/*---------------------------------------------------------------------*/
const error = require( "./error.js" );
const fs = require("fs");

const hh = require("./hiphop.js");

/*---------------------------------------------------------------------*/
/*    findCausalityError ...                                           */
/*---------------------------------------------------------------------*/
function findCausalityError( machine ) {

    function min( a, b ) {
	return a < b ? a : b;
    }
    
    function tarjan( net ) {
	// https://fr.wikipedia.org/wiki/Algorithme_de_Tarjan
	let num = 0;
	let P = [];
	let partition = [];
	
	function walk( v ) {
            if(v.LogicalNetType !== "REG"){
		v.num = num;
		v.numReachable = num;
		num++;
		P.push( v );
		v.inP = true;
		
		v.fanout_list.forEach( f => {
		    const w = f.net;
		    if( w.num === undefined ) {
			walk( w );
			v.numReachable = min( v.numReachable, w.numReachable );
		    } else if( w.inP ) {
			v.numReachable = min( v.numReachable, w.num );
		    }
		});
		
		if( v.numReachable === v.num ) {
		    let C = [];
		    let w;
		    
		    do{
			w = P.pop();
			w.inP = false;
			C.push( w );
		    } while( w !== v );
		    partition.push( C );
		}
            }
	}
	
	net.forEach( v => { if( !v.num ) walk( v ); } );
	
	net.forEach( n => {
	    delete n.inP;
	    delete n.num;
	});
	return partition;
    }
    
    function isCyclic( src ) {
	let stack = [];
	function loop( net ) {
	    if( net === src ) {
		return true;
	    } else if( stack.indexOf( net ) >= 0 ) {
		return false;
	    } else {
		stack.push( net );
		return net.fanin_list.find( f => loop( f.net ) );
	    }
	}
	return src.fanin_list.find( f => loop( f.net ) );
    }
    
    function findCycleSignals( src ) {
	let stack = [];
	let res = [];
	
	function loop( net ) {
	    if( stack.indexOf( net ) < 0 ) {
		if( net.accessor_list ) {
		    net.accessor_list.forEach( a => {
			if( res.indexOf( a.signame ) < 0 ) {
		     	    res.push( a.signame );
			}
	       	    });
		}
		stack.push( net );
		net.fanin_list.forEach( f => loop( f.net ) );
	    }
	}
	
	loop( src );
	return res;
    }
    
    function cycleSize( src ) {
	let stack = [];
	let res = 0;
	
	function loop( net ) {
	    if( stack.indexOf( net ) < 0 ) {
		res++;
		stack.push( net );
		net.fanin_list.forEach( f => loop( f.net ) );
	    }
	}
	
	loop( src );
	return res;
    }
    
    function shortestCycle( ex_dict, ex_info ) {
	let resultCycle = [];
	for( let key in ex_dict ) {
            // let shortestCycleLength = findCycle( ex_dict , parseInt( key ) );
            if( resultCycle.indexOf( ex_info[ key ]) < 0 ) {
		resultCycle.push( ex_info[ key ] );
            }
	}
	// sort based on buffer position
	resultCycle.sort( (a, b) => { return a.pos - b.pos ; } );
	if( resultCycle.length > 1 ) {
	    console.error( `CausalityError: cycle of length ${resultCycle.length} detected` );
      	    for( let i = 0; i < resultCycle.length; i++ ){
      		console.error(`   ${resultCycle[i].filename}:${resultCycle[i].pos}`);
            }
	    console.error( "" );
      	    return resultCycle;
	} else {
	    return false;
	}
    }
    let nets = machine.nets.filter( n => !n.isInKnownList );
    let components = tarjan( nets );
    let rloc = false;
    let rsize = -1;
    let tarjanComponent={};
    // error messages
    for( let j = 0; j < components.length; j++ ) {
	if( components[ j ].length > 1 ) {
	    let component = components[ j ];
            let sigList = [];
            /*  */
	    let tcc_loc = component.map( n => n.ast_node.loc );
    	    let tcc_fanoutlist = component.map( n => n.fanout_list );
	    let tcc_faninlist = component.map( n => n.fanin_list );
    	    let fanout_id = [];
            let fanin_id = [];
    	    let tccFinFout = {};
    	    let tccLocInfo = {};
            let tccFinFoutName={};//for printing participating fanins and fanouts in tarjan component
    	    for( let i = 0; i < component.length; i++ ) {
		fanout_id = tcc_fanoutlist[ i ].map( n => n.net.debug_id );
		fanin_id = tcc_faninlist[ i ].map( n => n.net.debug_id );
		tccFinFout[ component[ i ].debug_id ] = [fanin_id, fanout_id];
		tccLocInfo[ component[ i ].debug_id ] = tcc_loc[ i ];
		tccFinFoutName[ component[ i ].debug_name ] = [fanin_id, fanout_id];
    	    }
    	    let cycle = shortestCycle( tccFinFout , tccLocInfo );
            let tempFileList = [];
            for (let i in tccLocInfo){
		if ( tempFileList.indexOf( tccLocInfo[i].filename ) < 0 ){
                    tempFileList.push( tccLocInfo[ i ].filename );
		}
            }
	    
            let errorPosArray = [];
            for(let j = 0 ; j < tempFileList.length ; j++){
                let errorPos = [];
                for(let i in  tccLocInfo){
                    if( tccLocInfo[ i ].filename === tempFileList[ j ] ){
                        if ( errorPos.indexOf( tccLocInfo[ i ].pos ) < 0 ){
                            errorPos.push( tccLocInfo[ i ].pos );
                        }
                    }
		}
		errorPosArray.push( errorPos );
            }
            for(let i = 0; i < errorPosArray.length; i++){
                errorPosArray[ i ].sort( (a, b) => { return a - b ; } );
            }
	    
            let positionEntryFlag = false; //flag for not saving those components having only one position ?
            let tccCyclearray = []; // array of file names and positions

            for(let i = 0 ; i < tempFileList.length ; i++){
                let tccCycle = {}; //filenames and corresponding positions
		if( errorPosArray[ i ].length > 1 ){
                    positionEntryFlag = true; //more than one position, hence flag set and info collected
                    tccCycle.filename = tempFileList[ i ];
                    tccCycle.locations = errorPosArray[ i ];
                    tccCyclearray.push( tccCycle );
		}
            }

            if( positionEntryFlag ){
                tarjanComponent[ j ] = tccCyclearray;
            }
            console.log("Connected Component")
            for(let i in tccFinFoutName){
                //console.log(`${i}:
                    //  fanin : [${tccFinFoutName[i][0]}],
                    //  fanout: [${tccFinFoutName[i][1]}]`);
	    } 
	    
	    
            let tempSignal = findCycleSignals( component[0] );
            // console.log(`Participating Signals :  ${tempSignal}`);
	    
            //  for(let i = 0; i < component.length; i++){
	    
            //        let tempSignal = findCycleSignals( component[0] );
	    
            /*  for(let j = 0; j < tempSignal.length; j++ ){
		
                if ( sigList.indexOf( tempSignal[j] ) < 0 ){
		
                sigList.push(tempSignal[j]);
		
                }
		
                }*/
            //
	    
            //    }
	    
	    //   console.log(`Participating Signals :  ${sigList}`);

	    
	    if( cycle ) {
		let  myresult = Object.keys( tarjanComponent ).map( function( key ) {
                    return tarjanComponent[ key ];
		});
		
		let myJSON = JSON.stringify(myresult);
		
		console.log();
		if(#:bigloo-debug() > 0 ){
		    fs.writeFileSync(hh.CAUSALITY_JSON, myJSON);
		}
		
		return {
		    loc: cycle[ 0 ],
		    size: cycle.length,
		    signals: []
		}
	    }	    
	}	
    }
    
    return {
	loc: false,
	size: -1,
	signals: []
    }
    /*    let head = nets.find( n => isCyclic( n ) );                      */
    /*                                                                     */
    /*    if( head ) {                                                     */
    /*       return {                                                      */
    /* 	 loc: head.ast_node.loc,                                       */
    /* 	 size: cycleSize( head ),                                      */
    /* 	 signals: findCycleSignals( head ) }                           */
    /*    } else {                                                         */
}

/*---------------------------------------------------------------------*/
/*    exports                                                          */
/*---------------------------------------------------------------------*/
exports.findCausalityError = findCausalityError;
