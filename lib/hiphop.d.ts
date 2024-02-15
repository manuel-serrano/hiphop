/*=====================================================================*/
/*    serrano/prgm/project/hiphop/1.3.x/lib/hiphop.d.ts                */
/*    -------------------------------------------------------------    */
/*    Author      :  Manuel Serrano                                    */
/*    Creation    :  Sat Feb 19 05:58:45 2022                          */
/*    Last change :  Thu Feb 15 14:52:27 2024 (serrano)                */
/*    Copyright   :  2022-24 Manuel Serrano                            */
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
   name(): any;
   age(): number;
}

/*---------------------------------------------------------------------*/
/*    lang                                                             */
/*---------------------------------------------------------------------*/
export function MODULE(attrs?: {}, ...nodes: any[]): ASTNode;
export function INTERFACE(attrs?: {}, ...nodes: any[]): ASTNode;
export function INTF(attrs?: {}, ...nodes: any[]): ASTNode;
export function FRAME(attrs?: {}, ...nodes: any[]): ASTNode;
export function LOCAL(attrs?: {}, ...nodes: any[]): ASTNode;
export function SIGNAL(attrs?: {}, ...nodes: any[]): ASTNode;
export function EMIT(attrs?: {}, ...nodes: any[]): ASTNode;
export function SUSTAIN(attrs?: {}, ...nodes: any[]): ASTNode;
export function IF(attrs?: {}, ...nodes: any[]): ASTNode;
export function NOTHING(attrs?: {}, ...nodes: any[]): ASTNode;
export function PAUSE(attrs?: {}, ...nodes: any[]): ASTNode;
export function HALT(attrs?: {}, ...nodes: any[]): ASTNode;
export function AWAIT(attrs?: {}, ...nodes: any[]): ASTNode;
export function SIGACCESS(attrs?: {}, ...nodes: any[]): ASTNode;
export function FORK(attrs?: {}, ...nodes: any[]): ASTNode;
export function ABORT(attrs?: {}, ...nodes: any[]): ASTNode;
export function WEAKABORT(attrs?: {}, ...nodes: any[]): ASTNode;
export function SUSPEND(attrs?: {}, ...nodes: any[]): ASTNode;
export function LOOP(attrs?: {}, ...nodes: any[]): ASTNode;
export function LOOPEACH(attrs?: {}, ...nodes: any[]): ASTNode;
export function EVERY(attrs?: {}, ...nodes: any[]): ASTNode;
export function SEQUENCE(attrs?: {}, ...nodes: any[]): ASTNode;
export function ATOM(attrs?: {}, ...nodes: any[]): ASTNode;
export function TRAP(attrs?: {}, ...nodes: any[]): ASTNode;
export function EXIT(attrs?: {}, ...nodes: any[]): ASTNode;
export function RUN(attrs?: {}, ...nodes: any[]): ASTNode;
export function EXEC(attrs?: {}, ...nodes: any[]): ASTNode;
export { FORK as PARALLEL };
