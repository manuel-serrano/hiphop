/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/lib/hiphop.d.ts               */
/*    -------------------------------------------------------------    */
/*    Author      :  Manuel Serrano                                    */
/*    Creation    :  Sat Feb 19 05:58:45 2022                          */
/*    Last change :  Thu Apr 21 11:12:43 2022 (serrano)                */
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
export type MachineListener = ({type: string, nowval: any, now: bool}) => void;

/*---------------------------------------------------------------------*/
/*    ReactiveMachine                                                  */
/*---------------------------------------------------------------------*/
export declare class ReactiveMachine<S> {
   constructor(ast: ASTNode, opts?: any);

   react(signals:S): void;
   addEventListener(name: string, callback: MachineListener);
}
