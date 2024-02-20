/*=====================================================================*/
/*    serrano/prgm/project/hiphop/1.3.x/lib/hiphop.d.ts                */
/*    -------------------------------------------------------------    */
/*    Author      :  Manuel Serrano                                    */
/*    Creation    :  Sat Feb 19 05:58:45 2022                          */
/*    Last change :  Tue Feb 20 11:51:02 2024 (serrano)                */
/*    Copyright   :  2022-24 Manuel Serrano                            */
/*    -------------------------------------------------------------    */
/*    HipHop types                                                     */
/*=====================================================================*/

/*---------------------------------------------------------------------*/
/*    HipHopFragment                                                   */
/*---------------------------------------------------------------------*/
export declare class HipHopFragment {
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
   constructor(ast: HipHopFragment, opts?: MachineOptions);

   promise(ressig?: string, rejsig?: string): Promise<any>;
   react(signals:S): void;
   addEventListener(name: string, callback: MachineListener);
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
