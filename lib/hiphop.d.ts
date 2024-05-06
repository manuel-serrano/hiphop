/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/lib/hiphop.d.ts               */
/*    -------------------------------------------------------------    */
/*    Author      :  Manuel Serrano                                    */
/*    Creation    :  Sat Feb 19 05:58:45 2022                          */
/*    Last change :  Mon May  6 11:57:22 2024 (serrano)                */
/*    Copyright   :  2022-24 Manuel Serrano                            */
/*    -------------------------------------------------------------    */
/*    HipHop types                                                     */
/*=====================================================================*/

/*---------------------------------------------------------------------*/
/*    HipHopFragment                                                   */
/*---------------------------------------------------------------------*/
export declare class HipHopFragment {
   appendChild(node:HipHopFragment): any;
}

/*---------------------------------------------------------------------*/
/*    MachineListener ...                                              */
/*---------------------------------------------------------------------*/
export type MachineListener = ({signame: string, nowval, preval}) => void;

/*---------------------------------------------------------------------*/
/*    MachineOptions                                                   */
/*---------------------------------------------------------------------*/
export type MachineOptions = {
   name?: string;
   sweep?: boolean;
   verbose?: number;
   dumpNets?: boolean;
   traceReactDuration?: boolean;
   traceCompileDuration?: boolean;
   causalityErrorTrace?: "shallow" | "deep";
} 
	    
/*---------------------------------------------------------------------*/
/*    ReactiveMachine                                                  */
/*---------------------------------------------------------------------*/
export declare class ReactiveMachine<S> {
   constructor(ast: HipHopFragment, opts?: MachineOptions);

   promise(ressig?: string, rejsig?: string): Promise<any>;
   init(opt?: any): void;
   react(signals?: S): void;
   addEventListener(name: string, callback: MachineListener);
   getElementById(id: string): HipHopFragment | undefined;
   name(): any;
   age(): number;
}

/*---------------------------------------------------------------------*/
/*    lang                                                             */
/*---------------------------------------------------------------------*/
export function MODULE(attrs?: {}, ...nodes: any[]): HipHopFragment;
export function INTERFACE(attrs?: {}, ...nodes: any[]): HipHopFragment;
export function INTF(attrs?: {}, ...nodes: any[]): HipHopFragment;
export function FRAME(attrs?: {}, ...nodes: any[]): HipHopFragment;
export function LOCAL(attrs?: {}, ...nodes: any[]): HipHopFragment;
export function SIGNAL(attrs?: {}, ...nodes: any[]): HipHopFragment;
export function EMIT(attrs?: {}, ...nodes: any[]): HipHopFragment;
export function SUSTAIN(attrs?: {}, ...nodes: any[]): HipHopFragment;
export function IF(attrs?: {}, ...nodes: any[]): HipHopFragment;
export function NOTHING(attrs?: {}, ...nodes: any[]): HipHopFragment;
export function PAUSE(attrs?: {}, ...nodes: any[]): HipHopFragment;
export function HALT(attrs?: {}, ...nodes: any[]): HipHopFragment;
export function AWAIT(attrs?: {}, ...nodes: any[]): HipHopFragment;
export function SIGACCESS(attrs?: {}, ...nodes: any[]): HipHopFragment;
export function FORK(attrs?: {}, ...nodes: any[]): HipHopFragment;
export function ABORT(attrs?: {}, ...nodes: any[]): HipHopFragment;
export function WEAKABORT(attrs?: {}, ...nodes: any[]): HipHopFragment;
export function SUSPEND(attrs?: {}, ...nodes: any[]): HipHopFragment;
export function LOOP(attrs?: {}, ...nodes: any[]): HipHopFragment;
export function LOOPEACH(attrs?: {}, ...nodes: any[]): HipHopFragment;
export function EVERY(attrs?: {}, ...nodes: any[]): HipHopFragment;
export function SEQUENCE(attrs?: {}, ...nodes: any[]): HipHopFragment;
export function ATOM(attrs?: {}, ...nodes: any[]): HipHopFragment;
export function TRAP(attrs?: {}, ...nodes: any[]): HipHopFragment;
export function EXIT(attrs?: {}, ...nodes: any[]): HipHopFragment;
export function RUN(attrs?: {}, ...nodes: any[]): HipHopFragment;
export function EXEC(attrs?: {}, ...nodes: any[]): HipHopFragment;
export { FORK as PARALLEL };
