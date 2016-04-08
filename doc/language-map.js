"use hopscript"

const markdown = require("markdown");
const doc = require("hopdoc");

var cur_indent = 0;

function children(args) {
   return Array.prototype.slice.call(args, 1, args.length);
}

function header(label, symbol=null) {
   const ret =
	   <tr class="warning">
	     <td colspan=2 align=center>
	       <strong>${label}</strong>
	       ${(function() {
		  if (symbol)
		     return <span>
		       <em style="font-size:130%;margin-left:2%">
                          ${symbol}
		       </em> ::=
		     </span>
	       })()}
	     </td>
	   </tr>
   return ret;
}

function comment(col, ...args) {
   let lines = <ul>
      ${args.map(function(el, idx, arr) {
	 return <li>${el}</li>
      })}
    </ul>;

   if (col)
      return <td>${lines}</td>;
   return lines;
}

function INDENT() {
   let ret;

   cur_indent += 5;
   ret = <div style=${"margin-left:" + cur_indent + "%"}>
     ${children(arguments)}
   </div>
   cur_indent -= 5;

   return ret;
}

function CNODE_ARGS(attrs) {
   return {cnode_args: true,
	   children: children(arguments)}
}

function TERM_CNODE(attrs) {
   let node_children = children(arguments);
   let args = [];

   for (let i in node_children)
      if (node_children[i].cnode_args) {
	 args = node_children[i].children
	 node_children.slice(0, 1);
	 break;
      }

   // not jump line after </strong> and })} (avoid space)
   return <span>
     <strong>&lt;${attrs.name}</strong>${args.map(function(el, idx, arr) {
	return el
     })}<strong>&gt;</strong>
     ${(function() {if (attrs.br) return <br/>})()}
     ${children(arguments)}
     ${(function() {if (attrs.br) return <br/>})()}
     <strong>&lt;/${attrs.name}&gt;</strong>
   </span>;
}

function TERM_NODE(attrs) {
   return <span>
     <strong>&lt;${attrs.name} </strong>
     ${(function() {if (attrs.br) return <br/>})()}
     ${children(arguments)}
     ${(function() {if (attrs.br) return <br/>})()}
     <strong>/&gt;</strong>
   </span>;
}

function TERM(attrs) {
   return <span>
     ${(function() {
	if (!attrs)
	   "";
	if (attrs.JSFunction)
	   return <span><strong>${attrs.name}</strong>=JSFunction</span>;
	else if (attrs.JSString)
	   return <span><strong>${attrs.name}</strong>=JSString</span>;
	else if (attrs.JSValue)
	   return <span><strong>${attrs.name}</strong>=JSValue</span>;
	else if (attrs.JSUInt)
	   return <span><strong>${attrs.name}</strong>=JSUInt</span>;
	else
	   return <span><strong>${attrs.name}</strong></span>;
     })()}
     ${(function() {if (attrs && attrs.br) return <br/>})()}
   </span>
}

function NTERM(attrs) {
   return <em style=${"font-size:130%;"}>
     ${attrs.name}
     ${(function() {if (attrs && attrs.br) return <br/>})()}
   </em>
}

function OPT(attrs) {
   let repeat_l = attrs && attrs.repeat ? "{ " : "";
   let repeat_r = attrs && attrs.repeat ? " }" : "";

   return <span>
     [ ${repeat_l}
       ${children(arguments)}
       ${repeat_r} ]
     ${(function() {if (attrs && attrs.br) return <br/>})()}
   </span>;
}

function REPEAT(attrs) {
   let opt_l = attrs && attrs.opt ? "[ " : "";
   let opt_r = attrs && attrs.opt ? " ]" : "";

   return <span>
      ${"{ "}
      ${opt_l}
      ${children(arguments)}
      ${opt_r}
      ${" }"}
      ${(function() {if (attrs && attrs.br) return <br/>})()}
   </span>;
}

exports.langage_map =
   <table class="table table-striped table-hover">

     ${header("Conventions")}

     <tr>
     ${comment(true,
	       "JSFunction is a reference to any JavaScript function.",
	       "JSValue is a refernce to any JavaScript value (primitive or objects).",
	       "JSUInt is a JavsScript positive integer.",
	       "JSString is a JavaScript string.")}
     ${comment(true,
	       "Hiphop.js symbols are in <strong>bold</strong>.",
	       "Non terminal symbols have the following typo: " +
	       "<span style=\"font-size:130%;\"><em>non-terminal</em></span>.",
	       "[ ] contains optional term.",
	       "{ } contains repeatable term.",
	       "::= represents an expansion term.")}
     </tr>

     ${header("Module")}

     <tr>
       <td width="46%">
	 <term_cnode name="Module">
	   <indent>
	     <opt repeat br>
	       <nterm name="module-header"/>
	     </opt>
	     <nterm name="stmt"/>
	   </indent>
	 </term_cnode>
       </td>
       ${comment(true, "Entry point of a reactive program.")}
     </tr>

     ${header("Module header", "module-header")}

     <tr>
       <td>
	 <term_node name="InputSignal">
	   <indent>
	     <term br name="name" JSString />
	     <opt br><term name="valued" /></opt>
	     <opt br><term name="combine_with" JSFunction /></opt>
	     <opt br><term name="init_value" JSValue /></opt>
	     <opt br><term name="reinit_func" JSFunction /></opt>
	   </indent>
         </term_node>
       </td>
       ${comment(true,
		 "Input signal declaration.",
		 "Can be emitted fron inside the reactive program.",
		 "Has a global scope.")}
     </tr>

     <tr>
       <td>
	 <term_node name="OutputSignal">
	   <indent>
	     <term br name="name" JSString />
	     <opt br><term name="valued" /></opt>
	     <opt br><term name="combine_with" JSFunction /></opt>
	     <opt br><term name="init_value" JSValue /></opt>
	     <opt br><term name="reinit_func" JSFunction /></opt>
	   </indent>
         </term_node>
       </td>
       ${comment(true,
		 "Output signal declaration.",
		 "Has a global scope.")}
     </tr>

     ${header("Statements", "stmt")}

     <tr>
       <td colspan=2>
	 <repeat>
	   <nterm name="stmt"/>
	 </repeat>
       </td>
     </tr>

     <tr>
       <td>
	 <term_node name="Nothing"/>
       </td>
       ${comment(true, "Empty statement.", "Terminates instantaneously.")}
     </tr>

     <tr>
       <td>
	 <term_node name="Pause"/>
       </td>
       ${comment(true, "Pause for one instant.")}
     </tr>

     <tr>
       <td>
	 <term_node name="Halt"/>
       </td>
       ${comment(true, "Never terminates.", "Can be aborted.")}
     </tr>

     <tr>
       <td>
	 <term_node name="Atom">
	   <term name="func" JSFunction br />
	   <indent>
	     <opt><term name="arg" JSValue /></opt>

	   |

	     [ <term name="arg0" JSValue/>
	     <term name="arg1" JSValue />
	     ...
	     <term name="argN" JSValue /> ]
	 </indent>
	 </term_node>
       </td>
       ${comment(true, "Instantaneous execution of given JavaScript function.")}
     </tr>

     <tr>
       <td>
	 <term_node name="Emit">
	   <nterm name="sigemit"/>
	 </term_node>
       </td>
       ${comment(true, "Terminates instantaneously.")}
     </tr>

     <tr>
       <td>
	 <term_node name="Sustain">
	   <nterm name="sigemit"/>
	 </term_node>
       </td>
       ${comment(true, "Never terminates.", "Can be aborted.")}
     </tr>

     <tr>
       <td>
	 <term_cnode name="Loop">
	   <nterm name="stmt"/>
	 </term_cnode>
       </td>
        ${comment(true,
		  "Infinite loop, immediately restarts its body when terminated.",
		  "Never terminates, can be aborted or exited.",
		  "<em style=\"font-size:130%\">stmt</em> must not be instantaneous.")}
     </tr>

     <tr>
       <td>
	 <term_cnode name="Present">
	   <cnode_args>
	     <nterm name="sig"/>
	   </cnode_args>
	   <indent>
	     <nterm name="stmt" br/>
	     <opt><nterm name="stmt"/></opt>
	   </indent>
	 </term_cnode>
       </td>
        ${comment(true,
		  "Branching according to result of the signal guard.",
		  "Test and branching are instantaneous.")}
     </tr>

     <tr>
       <td>
	 <term_cnode name="If">
	   <cnode_args>
	     <nterm name=expr/>
	   </cnode_args>
	   <indent>
	     <nterm name="stmt" br/>
	     <opt><nterm name="stmt"/></opt>
	   </indent>
	 </term_cnode>
       </td>
        ${comment(true,
		  "Branching according to the value of test expression.",
		  "Test and branching are instantaneous.")}
     </tr>

     <tr>
       <td>
	 <term_node name="Await">
	   <nterm name="sig"/>
	   <opt >
	     <nterm name="countexpr"/>
	   </opt>
	 </term_node>
       </td>
        ${comment(true,
		  "Terminates when the signal guard is true.",
		  "Instantaneous is <strong>immediate</strong> keyword is present.")}
     </tr>

     <tr>
       <td>
	 <term_cnode name="Abort">
	   <cnode_args>
	     ( <nterm name="sig" />
	       <opt><nterm name="countexpr"/></opt> )
	     | <nterm name="expr" />
	   </cnode_args>
	   <indent>
	     <nterm name="stmt"/>
	   </indent>
	 </term_cnode>
       </td>
       ${comment(true,
		 "Absortion; kills the statement when the signal guard or " +
		 "the expression is true.")}
     </tr>

     <tr>
       <td>
	 <term_cnode name="WeakAbort">
	   <cnode_args>
	     ( <nterm name="sig" />
	       <opt><nterm name="countexpr"/></opt> )
	     | <nterm name="expr" />
	   </cnode_args>
	   <indent>
	     <nterm name="stmt"/>
	   </indent>
	 </term_cnode>
       </td>
       ${comment(true,
		 "Weak variant of absortion; starts the statement in " +
		 "the current instant when the guard expression is true, before killing it.")}
     </tr>

     <tr>
       <td>
	 <term_cnode name="LoopEach">
	   <cnode_args>
	     ( <nterm name="sig" />
	       <opt><nterm name="countexpr"/></opt> )
	     | <nterm name="expr" />
	   </cnode_args>
	   <indent>
	     <nterm name="stmt"/>
	   </indent>
	 </term_cnode>
       </td>
       ${comment(true, "")}
     </tr>

     <tr>
       <td>
	 <term_cnode name="Every">
	   <cnode_args>
	     ( <nterm name="sig" />
	       <opt><nterm name="countexpr"/></opt> )
	     | <nterm name="expr" />
	   </cnode_args>
	   <indent>
	     <nterm name="stmt"/>
	   </indent>
	 </term_cnode>
       </td>
       ${comment(true, "")}
     </tr>

     <tr>
       <td>
	 <term_cnode name="Suspend">
	   <cnode_args>
	     <nterm name="sig" /> | <nterm name="expr" />
	   </cnode_args>
	   <indent>
	     <nterm name="stmt"/>
	   </indent>
	 </term_cnode>
       </td>
       ${comment(true, "")}
     </tr>

     <tr>
       <td>
	 <term_cnode name="Trap">
	   <cnode_args>
	     <term name="trap_name" JSString/>
	   </cnode_args>
	   <nterm name="stmt"/>
	 </term_cnode>
       </td>
       ${comment(true, "Mechanism to catch exceptions raised by the body statement.")}
     </tr>

     <tr>
       <td>
	 <term_node name="Exit">
	   <term name="trap_name" JSString/>
	 </term_cnode>
       </td>
       ${comment(true, "Raises an exception.")}
     </tr>

     <tr>
       <td>
	 <term_node name="LocalSignal">
	   <indent>
	     <term br name="name" JSString />
	     <opt br><term name="valued" /></opt>
	     <opt br><term name="combine_with" JSFunction /></opt>
	     <opt br><term name="init_value" JSValue /></opt>
	     <opt br><term name="reinit_func" JSFunction /></opt>
	   </indent>
         </term_node>
       </td>
       ${comment(true,
		 "Local declaration of a signal.",
		 "Determines its scope.")}
     </tr>

     ${header("Signal access guard", "sig")}
     <tr>
       <td>
	 <opt><term name="pre"/></opt>
	 <opt><term name="immediate"/></opt>
	 <term name="signal_name" JSString />
       </td>
       ${comment(true,
		 "Signal access guard. Return true if the signal is present.",
		 "If <strong>pre</strong> keyword is present, return true if " +
		 "the signal was present on the previous instant.")}

     </tr>

     ${header("Signal emission", "sigemit")}
     <tr colspan=2>
       <td>
	 <term name="signal_name" JSString />
	 <opt>
	   <nterm name="expr"/>
	 </opt>
       </td>
     </tr>

     ${header("Expressions", "expr")}
     <tr>
       <td>
	 <term name="func" JSFunction />
       </td>
       ${comment(true, "The value of the expression is the return value of <strong>func</strong> func call, which is called without parameters.")}
     </tr>
     <tr>
       <td>
	 <term name="arg" JSValue />
       </td>
       ${comment(true, "The value of the expression is <strong>arg</strong> (directly returns whithout function call).")}
     </tr>
     <tr>
       <td>
	 <term name="func" JSFunction /> <term name="arg" JSValue />
       </td>
       ${comment(true,
		 "The value of the expression is the return value of <strong>func</strong>, which is called with <strong>arg</strong> as parameter.")}
     </tr>
     <tr>
       <td>
	 <term name="func" JSFunction />
	 <indent>
	   <term name="arg0" JSValue br/>
	   <term name="arg1" JSValue br/>
	   ...<br />
	   <term name="argN" JSValue />
	 </indent>
       </td>
       ${comment(true, "The value of the expression is the return value of <strong>func</strong>, which is called with <em>N</em> parameters.")}
     </tr>

     ${header("Counter expressions", "countexpr")}
     <tr>
       <td>
	 <term name="count" JSUInt />
       </td>
       ${comment(true, "todo")}
     </tr>
     <tr>
       <td>
	 <term name="func_count" JSFunction />
       </td>
       ${comment(true, "todo")}
     </tr>
     <tr>
       <td>
	 <term name="arg_count" JSValue />
       </td>
       ${comment(true, "todo")}
     </tr>
     <tr>
       <td>
	 <term name="func_count" JSFunction /> <term name="arg_count" JSValue />
       </td>
       ${comment(true, "todo")}
     </tr>
     <tr>
       <td>
	 <term name="func_count" JSFunction />
	 <indent>
	   <term name="arg_count0" JSValue br/>
	   <term name="arg_count1" JSValue br/>
	   ...<br />
	   <term name="arg_countN" JSValue />
	 </indent>
       </td>
       ${comment(true, "todo")}
     </tr>
   </table>
