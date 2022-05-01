/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/lib/hiphop.d.ts               */
/*    -------------------------------------------------------------    */
/*    Author      :  Manuel Serrano                                    */
/*    Creation    :  Sat Feb 19 05:58:45 2022                          */
/*    Last change :  Tue Apr 26 15:17:08 2022 (serrano)                */
/*    Copyright   :  2022 Manuel Serrano                               */
/*    -------------------------------------------------------------    */
/*    HipHop types                                                     */
/*=====================================================================*/

/*---------------------------------------------------------------------*/
/*    ASTNode                                                          */
/*---------------------------------------------------------------------*/
export declare class ASTNode {
}

/*---------------------------------------------------------------------*/
/*    MachineListener ...                                              */
/*---------------------------------------------------------------------*/
export type MachineListener = ({type: string, nowval: any, now: boolean}) => void;

/*---------------------------------------------------------------------*/
/*    MachineOptions                                                   */
/*---------------------------------------------------------------------*/
export type MachineOptions = {       
   sweep?: boolean;
} 
	    
/*---------------------------------------------------------------------*/
/*    ReactiveMachine                                                  */
/*---------------------------------------------------------------------*/
export declare class ReactiveMachine<S> {
   constructor(ast: ASTNode, opts?: MachineOptions);

   promise(ressig?: string, rejsig?: string): Promise<any>;
   react(signals:S): void;
   addEventListener(name: string, callback: MachineListener);
}
