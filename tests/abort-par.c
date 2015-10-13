/* sscc : C CODE OF SORTED EQUATIONS abortpar - SIMULATION MODE */

#include <stdio.h>
#include <string.h>

/* AUXILIARY DECLARATIONS */

#ifndef STRLEN
#define STRLEN 81
#endif
#define _COND(A,B,C) ((A)?(B):(C))
#ifndef NULL
#  if defined(__cplusplus) || defined(__STDC__)
#    define NULL 0
#  else
#    define NULL ((void*)0)
#  endif
#endif

#ifndef __EXEC_STATUS_H_LOADED
#define __EXEC_STATUS_H_LOADED

typedef struct {
unsigned int start:1;
unsigned int kill:1;
unsigned int active:1;
unsigned int suspended:1;
unsigned int prev_active:1;
unsigned int prev_suspended:1;
unsigned int exec_index;
unsigned int task_exec_index;
void (*pStart)();
void (*pRet)();
} __ExecStatus;

#endif
#define __ResetExecStatus(status) {\
   status.prev_active = status.active; \
   status.prev_suspended = status.suspended; \
   status.start = status.kill = status.active = status.suspended = 0; }
#define __DSZ(V) (--(V)<=0)
#if defined(__ESTEREL_SLAVE_SIM)
#  define __OUTPUT
#  define __SENSOR_VAL(t,v,a) _COND(t,v,(t=_true,a,v))
#else
#  define __SENSOR_VAL(t,v,a) v
#endif

int __GetNumberOfModules();
struct __ModuleEntry;
struct __ModuleEntry** __GetModuleTable();
#define BASIC_TYPES_DEFINED
typedef int boolean;
typedef int integer;
typedef char* string;
#define CSIMUL_H_LOADED
typedef struct {char text[STRLEN];} symbolic;
extern void _boolean(boolean*, boolean);
extern boolean _eq_boolean(boolean, boolean);
extern boolean _ne_boolean(boolean, boolean);
#define _cond_boolean(t,a,b) ((t) ? (a) : (b))
extern char* _boolean_to_text(boolean);
extern int _check_boolean(char*);
extern void _text_to_boolean(boolean*, char*);
extern void _integer(integer*, integer);
extern boolean _eq_integer(integer, integer);
extern boolean _ne_integer(integer, integer);
#define _cond_integer(t,a,b) ((t) ? (a) : (b))
extern char* _integer_to_text(integer);
extern int _check_integer(char*);
extern void _text_to_integer(integer*, char*);
extern void _string(string, string);
extern boolean _eq_string(string, string);
extern boolean _ne_string(string, string);
#define _cond_string(t,a,b) ((t) ? (a) : (b))
extern char* _string_to_text(string);
extern int _check_string(char*);
extern void _text_to_string(string, char*);
extern void _float(float*, float);
extern boolean _eq_float(float, float);
extern boolean _ne_float(float, float);
#define _cond_float(t,a,b) ((t) ? (a) : (b))
extern char* _float_to_text(float);
extern int _check_float(char*);
extern void _text_to_float(float*, char*);
extern void _double(double*, double);
extern boolean _eq_double(double, double);
extern boolean _ne_double(double, double);
#define _cond_double(t,a,b) ((t) ? (a) : (b))
extern char* _double_to_text(double);
extern int _check_double(char*);
extern void _text_to_double(double*, char*);
extern void _symbolic(symbolic*, symbolic);
extern boolean _eq_symbolic(symbolic, symbolic);
extern boolean _ne_symbolic(symbolic, symbolic);
#define _cond_symbolic(t,a,b) ((t) ? (a) : (b))
extern char* _symbolic_to_text(symbolic);
extern int _check_symbolic(char*);
extern void _text_to_symbolic(symbolic*, char*);
extern char* __PredefinedTypeToText(int, char*);
#define _true 1
#define _false 0
#define __abortpar_GENERIC_TEST(TEST) return TEST;
typedef void (*__abortpar_APF)();
struct __SourcePoint {
int linkback;
int line;
int column;
int instance_index;
};
struct __InstanceEntry {
char *module_name;
char *original_module_name;
int father_index;
char *dir_name;
char *file_name;
struct __SourcePoint source_point;
struct __SourcePoint end_point;
struct __SourcePoint instance_point;
};
struct __TaskEntry {
char *name;
int   nb_args_ref;
int   nb_args_val;
int  *type_codes_array;
struct __SourcePoint source_point;
};
struct __SignalEntry {
char *name;
int code;
int variable_index;
int present;
struct __SourcePoint source_point;
int number_of_emit_source_points;
struct __SourcePoint* emit_source_point_array;
int number_of_present_source_points;
struct __SourcePoint* present_source_point_array;
int number_of_access_source_points;
struct __SourcePoint* access_source_point_array;
};
struct __InputEntry {
char *name;
int hash;
char *type_name;
int is_a_sensor;
int type_code;
int multiple;
int signal_index;
int (*p_check_input)(char*);
void (*p_input_function)();
int present;
struct __SourcePoint source_point;
};
struct __ReturnEntry {
char *name;
int hash;
char *type_name;
int type_code;
int signal_index;
int exec_index;
int (*p_check_input)(char*);
void (*p_input_function)();
int present;
struct __SourcePoint source_point;
};
struct __ImplicationEntry {
int master;
int slave;
struct __SourcePoint source_point;
};
struct __ExclusionEntry {
int *exclusion_list;
struct __SourcePoint source_point;
};
struct __VariableEntry {
char *full_name;
char *short_name;
char *type_name;
int type_code;
int comment_kind;
int is_initialized;
char *p_variable;
char *source_name;
int written;
unsigned char written_in_transition;
unsigned char read_in_transition;
struct __SourcePoint source_point;
};
struct __ExecEntry {
int task_index;
int *var_indexes_array;
char **p_values_array;
struct __SourcePoint source_point;
};
struct __HaltEntry {
struct __SourcePoint source_point;
};
struct __NetEntry {
int known;
int value;
int number_of_source_points;
struct __SourcePoint* source_point_array;
};
struct __ModuleEntry {
char *version_id;
char *compilation_type;
char *name;
int number_of_instances;
int number_of_tasks;
int number_of_signals;
int number_of_inputs;
int number_of_returns;
int number_of_sensors;
int number_of_outputs;
int number_of_locals;
int number_of_exceptions;
int number_of_implications;
int number_of_exclusions;
int number_of_variables;
int number_of_execs;
int number_of_halts;
int number_of_nets;
int number_of_states;
int state;
unsigned short *halt_list;
unsigned short *awaited_list;
unsigned short *emitted_list;
unsigned short *started_list;
unsigned short *killed_list;
unsigned short *suspended_list;
unsigned short *active_list;
int run_time_error_code;
int error_info;
void* p_extended;
int (*run)();
int (*reset)();
char *(*show_variable)(int, char*);
void (*set_variable)(int, char*, char*);
int (*check_value)(int, char*);
int (*execute_action)();
struct __InstanceEntry* instance_table;
struct __TaskEntry* task_table;
struct __SignalEntry* signal_table;
struct __InputEntry* input_table;
struct __ReturnEntry* return_table;
struct __ImplicationEntry* implication_table;
struct __ExclusionEntry* exclusion_table;
struct __VariableEntry* variable_table;
struct __ExecEntry* exec_table;
struct __HaltEntry* halt_table;
struct __NetEntry* net_table;
};
#ifdef SIGNAL_DUMP
extern void __DoDump();
extern void __DumpReset();
#endif
typedef void (*__abortpar_PIF)();

                       
/* EXTERN DECLARATIONS */

extern int __CheckVariables(int*);
extern void __ResetInput(void);
extern void __ResetExecs(void);
extern void __ResetVariables(void);
extern void __ResetVariableStatus(void);
extern void __AppendToList(unsigned short*, unsigned short);
extern void __ListCopy(unsigned short*, unsigned short**);
extern void __WriteVariable(int);
extern void __ResetVariable(int);
extern void __ResetModuleEntry(void);
extern void __ResetModuleEntryBeforeReaction(void);
extern void __ResetModuleEntryAfterReaction(void);
#ifndef _NO_EXTERN_DEFINITIONS
#ifndef _NO_OUTPUT_FUNCTION_DEFINITIONS
#ifndef abortpar_O_O
extern void abortpar_O_O();
#endif
#endif
#endif
#if defined(__ESTEREL_SLAVE_SIM)
#endif


/* INITIALIZED CONSTANTS */

/* MEMORY ALLOCATION */

static boolean __abortpar_V0;           /* boolean of signal I */

static unsigned short __abortpar_HaltList[4];
static unsigned short __abortpar_AwaitedList[4];
static unsigned short __abortpar_EmittedList[4];
static unsigned short __abortpar_StartedList[1];
static unsigned short __abortpar_KilledList[1];
static unsigned short __abortpar_SuspendedList[1];
static unsigned short __abortpar_ActiveList[1];
static unsigned short __abortpar_AllAwaitedList[4]={1,0};


/* INPUT FUNCTIONS */

void abortpar_I_I (void) {
__abortpar_V0 = _true;
}
void abortpar_IS_I (void) {
__abortpar_V0 = _true;
}

/* FUNCTIONS RETURNING NUMBER OF EXEC */

int abortpar_number_of_execs (void) {
return (0);
}


/* AUTOMATON (STATE ACTION-TREES) */

/* ACTIONS */

/* PREDEFINED ACTIONS */

/* PRESENT SIGNAL TESTS */

static int __abortpar_A1 (void) {
if (__abortpar_V0) __AppendToList(__abortpar_EmittedList,0);
__abortpar_GENERIC_TEST(__abortpar_V0);
}
static int __abortpar_Check1 [] = {1,0,0};

/* OUTPUT ACTIONS */

static void __abortpar_A2 (void) {
#ifdef __OUTPUT
abortpar_O_O();
#endif
__AppendToList(__abortpar_EmittedList,1);
}
static int __abortpar_Check2 [] = {1,0,0};

/* ASSIGNMENTS */

static void __abortpar_A3 (void) {
__abortpar_V0 = _false;
}
static int __abortpar_Check3 [] = {1,0,1,0};

/* PROCEDURE CALLS */

/* CONDITIONS */

/* DECREMENTS */

/* START ACTIONS */

/* KILL ACTIONS */

/* SUSPEND ACTIONS */

/* ACTIVATE ACTIONS */

/* WRITE ARGS ACTIONS */

/* RESET ACTIONS */

/* ACTION SEQUENCES */


static int *__abortpar_CheckArray[] = {
0,
__abortpar_Check1,
__abortpar_Check2,
__abortpar_Check3
};
static int **__abortpar_PCheckArray =  __abortpar_CheckArray;


/* SHOW VARIABLE FUNCTION */

char* __abortpar_show_variable (int typeCode, char* pVariable) {
   if (typeCode < 0) {
      return __PredefinedTypeToText(typeCode, pVariable);
   } 
   else {
      switch (typeCode) {
      default:
         return 0;
      }
   }
}

/* SET VARIABLE FUNCTION */

static void __abortpar_set_variable(int __Type, char* __pVar, char* __Text) {
}

/* CHECK VALUE FUNCTION */

static int __abortpar_check_value (int __Type, char* __Text) {
return 0;
}

/* SIMULATION TABLES */

struct __InstanceEntry __abortpar_InstanceTable [] = {
{"abortpar","abortpar",0,"","abort-par.strl",{1,1,1,0},{1,18,1,0},{0,0,0,0}},
};

struct __SignalEntry __abortpar_SignalTable [] = {
{"I",33,0,0,{1,3,7,0},0,NULL,0,NULL,0,NULL},
{"O",34,0,0,{1,4,8,0},0,NULL,0,NULL,0,NULL},
{"L",40,0,0,{1,6,8,0},0,NULL,0,NULL,0,NULL}};

struct __InputEntry __abortpar_InputTable [] = {
{"I",73,0,0,-1,0,0,0,(__abortpar_PIF)abortpar_IS_I,0,{1,3,7,0}}};

struct __VariableEntry __abortpar_VariableTable [] = {
{"__abortpar_V0","V0","boolean",-2,2,0,(char*)&__abortpar_V0,"I",0,0,0,{1,3,7,0}}
};

struct __HaltEntry __abortpar_HaltTable [] = {
{{1,18,1,0}},
{{1,10,5,0}},
{{1,14,5,0}}
};


static void __abortpar__reset_input (void) {
__abortpar_V0 = _false;
}


/* MODULE DATA FOR SIMULATION */

int abortpar();
int abortpar_reset();

static struct __ModuleEntry __abortpar_ModuleData = {
"Simulation interface release 6","Compiled Sorted Equations","abortpar",
1,0,3,1,0,0,1,1,0,0,0,1,0,3,0,0,0,
__abortpar_HaltList,
__abortpar_AwaitedList,
__abortpar_EmittedList,
__abortpar_StartedList,
__abortpar_KilledList,
__abortpar_SuspendedList,
__abortpar_ActiveList,
0,0,
(void*)0,abortpar,abortpar_reset,
__abortpar_show_variable,__abortpar_set_variable,__abortpar_check_value,0,
__abortpar_InstanceTable,
0,
__abortpar_SignalTable,__abortpar_InputTable,0,
0,0,
__abortpar_VariableTable,
0,
__abortpar_HaltTable,
0};

/* REDEFINABLE BIT TYPE */

#ifndef __SSC_BIT_TYPE_DEFINED
typedef char __SSC_BIT_TYPE;
#endif

/* REGISTER VARIABLES */

static __SSC_BIT_TYPE __abortpar_R[3] = {_true,
 _false,
 _false};

/* AUTOMATON ENGINE */

int abortpar (void) {
/* AUXILIARY VARIABLES */

static __SSC_BIT_TYPE E[6];

__abortpar_ModuleData.awaited_list = __abortpar_AwaitedList;
__ResetModuleEntryBeforeReaction();
E[0] = __abortpar_R[1]&&!(__abortpar_R[0]);
E[1] = __abortpar_R[2]&&!(__abortpar_R[0]);
E[2] = E[1]&&(__CheckVariables(__abortpar_CheckArray[1]),
__abortpar_A1());
if (E[2]) {
__AppendToList(__abortpar_EmittedList,2);
}
E[3] = __abortpar_R[0]||(__abortpar_R[1]&&E[0]&&!(E[2]));
if (E[3]) {
__AppendToList(__abortpar_EmittedList,1);
}
if (E[3]) {
__CheckVariables(__abortpar_CheckArray[2]);__abortpar_A2();
}
E[0] = E[0]&&E[2];
E[4] = __abortpar_R[1]||__abortpar_R[2];
E[5] = (E[4]&&!(__abortpar_R[0])&&!(__abortpar_R[1]))||E[0];
E[4] = (E[4]&&!(__abortpar_R[0])&&!(__abortpar_R[2]))||E[2];
E[2] = (E[0]||E[2])&&E[5]&&E[4];
E[1] = E[1]&&!((__CheckVariables(__abortpar_CheckArray[1]),
__abortpar_A1()));
__abortpar_R[2] = __abortpar_R[0]||(__abortpar_R[2]&&E[1]);
E[4] = (E[3]||__abortpar_R[2])&&(E[5]||E[3])&&(E[4]||__abortpar_R[2]);
__abortpar_R[0] = !(_true);
__abortpar_R[1] = E[3];
if (__abortpar_R[1]) { __AppendToList(__abortpar_HaltList,1); }
if (__abortpar_R[2]) { __AppendToList(__abortpar_HaltList,2); }
if (!E[4]) { __AppendToList(__abortpar_HaltList,0); }
__ResetModuleEntryAfterReaction();
__abortpar_ModuleData.awaited_list = __abortpar_AllAwaitedList;
__abortpar__reset_input();
#ifdef SIGNAL_DUMP
__DoDump();
#endif
return E[4];
}

/* AUTOMATON RESET */

int abortpar_reset (void) {
__abortpar_ModuleData.awaited_list = __abortpar_AwaitedList;
__ResetModuleEntry();
__abortpar_ModuleData.awaited_list = __abortpar_AllAwaitedList;
__abortpar_ModuleData.state = 0;
__abortpar_R[0] = _true;
__abortpar_R[1] = _false;
__abortpar_R[2] = _false;
__abortpar__reset_input();
#ifdef SIGNAL_DUMP
__DumpReset();
#endif
return 0;
}

/* UNIFIED API */

#if !defined(__ESTEREL_INIT_SIM)
typedef int (*SimInitFunc_t) ();
extern int __SimulatorInit(struct __ModuleEntry**, int, char**, SimInitFunc_t);
int abortpar_init (char** pError, SimInitFunc_t pFunc) {
   int initOk;
   initOk = __SimulatorInit(__GetModuleTable(),
                            __GetNumberOfModules(),
                            pError,
                            pFunc);
   return initOk;
}
#endif
#if !defined(__ESTEREL_END_SIM)
typedef int (*SimEndFunc_t) ();
extern int __SimulatorEnd(SimEndFunc_t);
int abortpar_end (SimEndFunc_t pFunc) {
   int endOk;
   endOk = __SimulatorEnd(pFunc);
   return endOk;
}
#endif
extern int __RunModuleEntry(void);
int abortpar_run(void) {
   return __RunModuleEntry(); 
}
extern int __GetModuleError(void);
int abortpar_getError(void) {
   return __GetModuleError();
}
extern char* __GetModuleErrorMessage(void);
char* abortpar_getErrorMessage(void) {
   return __GetModuleErrorMessage();
}

int __NumberOfModules = 1;
struct __ModuleEntry* __ModuleTable[] = {
&__abortpar_ModuleData
};
int __GetNumberOfModules() {
   return 1;
}
struct __ModuleEntry** __GetModuleTable() {
   return __ModuleTable;
}
struct __ModuleStateDumpEntry ; 
struct __ModuleStateDumpEntry** __GetModuleStateDumpTable() {   return 0; }
int __GetCheckSum(int* pValue) {
/* No checksum available */
   return 0;
}
