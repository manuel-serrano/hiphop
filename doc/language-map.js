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
     ${(function() {if ("br" in attrs) return <br/>})()}
     ${children(arguments)}
     ${(function() {if ("br" in attrs) return <br/>})()}
     <strong>&lt;/${attrs.name}&gt;</strong>
   </span>;
}

function TERM_NODE(attrs) {
   return <span>
     <strong>&lt;${attrs.name} </strong>
     ${(function() {if ("br" in attrs) return <br/>})()}
     ${children(arguments)}
     ${(function() {if ("br" in attrs) return <br/>})()}
     <strong>/&gt;</strong>
   </span>;
}

function TERM(attrs) {
   return <span>
     ${(function() {
	if (!attrs)
	   return "";
	if ("JSFunction" in attrs)
	   return <span><strong>${attrs.name}</strong>=JSFunction</span>;
	else if ("JSObject" in attrs)
	   return <span><strong>${attrs.name}</strong>=JSObject</span>;
	else if ("JSString" in attrs)
	   return <span><strong>${attrs.name}</strong>=JSString</span>;
	else if ("JSValue" in attrs)
	   return <span><strong>${attrs.name}</strong>=JSValue</span>;
	else if ("JSUInt" in attrs)
	   return <span><strong>${attrs.name}</strong>=JSUInt</span>;
	else if ("HHModule" in attrs)
	   return <span><strong>${attrs.name}</strong>=HHModule</span>;
	else if ("JSMapSS" in attrs)
	   return <span><strong>${attrs.name}</strong>=JSMap[JSString, JSString]</span>;
	else
	   return <span><strong>${attrs.name}</strong></span>;
     })()}
     ${(function() {if (attrs && "br" in attrs) return <br/>})()}
   </span>
}

function NTERM(attrs) {
   return <em style=${"font-size:130%;"}>
     ${attrs.name}
     ${(function() {if (attrs && "br" in attrs) return <br/>})()}
   </em>
}

function OPT(attrs) {
   let repeat_l = attrs && "repeat" in attrs ? "{ " : "";
   let repeat_r = attrs && "repeat" in attrs ? " }" : "";

   return <span>
     [ ${repeat_l}
       ${children(arguments)}
       ${repeat_r} ]
     ${(function() {if (attrs && "br" in attrs) return <br/>})()}
   </span>;
}

function REPEAT(attrs) {
   let opt_l = attrs && "opt" in attrs ? "[ " : "";
   let opt_r = attrs && "opt" in attrs ? " ]" : "";

   return <span>
      ${"{ "}
      ${opt_l}
      ${children(arguments)}
      ${opt_r}
      ${" }"}
      ${(function() {if (attrs && "br" in attrs) return <br/>})()}
   </span>;
}

exports.langage_map =
   <table class="table table-striped table-hover">

     ${header("Conventions")}

     <tr>
     ${comment(true,
	       "JSFunction is a reference to any JavaScript function.",
	       "JSValue is a refernce to any JavaScript value (primitive or objects).",
	       "JSObject is a reference to a JavaScript object.",
	       "JSUInt is a JavsScript positive integer.",
	       "JSString is a JavaScript string.",
	       "HHModule is a JavaScript object containing an Hiphop.js program code.",
	       "JSMap[<em>type</em>, <em>type</em>] is a JavaScript map.")}
     ${comment(true,
	       "Hiphop.js symbols are in <strong>bold</strong>.",
	       "Non terminal symbols have the following typo: " +
	       "<span style=\"font-size:130%;\"><em>non-terminal</em></span>.",
	       "[ ] contains optional term.",
	       "{ } contains repeatable term.",
	       "( ) disambiguate priority.",
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
	   <term name="name" JSString />
	   <indent>
	     <opt br><term name="valued" /></opt>
	     <opt br><term name="combine" JSFunction /></opt>
	     <opt br><term name="value" JSValue /></opt>
	     <opt br><term name="reset" JSFunction /></opt>
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
	   <term  name="name" JSString />
	   <indent>
	     
	     <opt br><term name="valued" /></opt>
	     <opt br><term name="combine" JSFunction /></opt>
	     <opt br><term name="value" JSValue /></opt>
	     <opt br><term name="reset" JSFunction /></opt>
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
	     <opt><term name="arg" JSValue />| ( <term name="arg0" JSValue br/>
			<indent>
			  <term name="arg1" JSValue br />
	     ... <br />
			  <term name="argN" JSValue /> )
			</indent>
	     </opt>
	 </indent>
	 </term_node>
       </td>
       ${comment(true, "Instantaneous execution of given JavaScript function.")}
     </tr>

     <tr>
       <td>
	 <term_node name="Exec">
	   <indent>
	     <term name="interface" JSObject br />
	     <opt br><term name="signal" JSString /></opt>
	     <opt ><term name="arg" JSValue /> | ( <term name="arg0" JSValue br/>
			 <indent>
			   <term name="arg1" JSValue br/>
	     ...<br />
			   <term name="argN" JSValue /> )
			 </indent>
	     </opt>
	   </indent>

	 </term_node>
       </td>
       ${comment(true,
		 "Execution of JavaScript function referenced by <strong>interface.start" +
		 "</strong>, and wait for terminaison of the routine by the call to this.return() in start function.")}
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
	     <opt><term name="not"/></opt>
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
	     <opt><term name="not"/></opt>
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
       ${comment(true,
		 "Temporal loop which is body is initialy started.",
		 "The signal guard can't be <strong>immediate</strong>.")}
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
       ${comment(true,
		 "Tempooral loop which initial waiting of true signal " +
		 "guard or expression.",
		 "Unlike LoopEach, the signal guard can be <strong>immediate</strong>.")}
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
       ${comment(true,
		 "If the signal guard or the expression is true, keeps the " +
		 "state of the body statement and pauses for the current instant.")}
     </tr>

     <tr>
       <td>
	 <term_cnode name="Trap">
	   <cnode_args>
	     <term name="name" JSString/>
	   </cnode_args>
	   <nterm name="stmt"/>
	 </term_cnode>
       </td>
       ${comment(true, "Mechanism to catch exceptions raised by the body statement.")}
     </tr>

     <tr>
       <td>
	 <term_node name="Exit">
	   <term name="trap" JSString/>
	 </term_cnode>
       </td>
       ${comment(true, "Raises an exception.")}
     </tr>

     <tr>
       <td>
	 <term_cnode name="Let">
	   <indent>
	       <repeat br>
	          <term_node name="Signal">
	            <indent>
	              <term br name="name" JSString />
	              <opt br><term name="valued" /></opt>
	              <opt br><term name="combine" JSFunction /></opt>
	              <opt br><term name="value" JSValue /></opt>
	              <opt br><term name="reset" JSFunction /></opt>
	            </indent>
                  </term_node>
	       </repeat>
	       <repeat>
	         <nterm name="stmt"/>
	       </repeat>
	    </indent>
	 </term_cnode>
       </td>
       ${comment(true,
		 "Local declaration of a signal.",
		 "<strong>Let</strong> determines scope of local signals.")}
     </tr>

     <tr>
       <td>
	 <term_node name="Run">
	   <indent>
	     <term name="module" HHModule br />
	     <term name="sigs_assoc" JSMapSS />
	   </indent>
	 </term_node>
       </td>
       ${comment(true,
		 "Create an instance of a Hiphop.js module, and embeded " +
		 "in the location of the Run instruction.",
		 "The map associate signals of callee module " +
		 "(keys of the map) to signals of caller module (values of the map).")}
     </tr>

     ${header("Signal guard", "sig")}
     <tr>
       <td>
	 <opt><term name="pre"/></opt>
	 <opt><term name="immediate"/></opt>
	 <term name="signal" JSString />
       </td>
       ${comment(true,
		 "Signal guard. Return true if the signal is present.",
		 "If <strong>pre</strong> keyword is present, return true if " +
		 "the signal was present on the previous instant.")}

     </tr>

     ${header("Signal emission", "sigemit")}
     <tr>
       <td colspan=2>
	 <term name="signal" JSString />
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
       ${comment(true,
		 "The value of the expression is the return value of " +
		 "<strong>func</strong> func call, which is called without parameters.")}
     </tr>
     <tr>
       <td>
	 <term name="arg" JSValue />
       </td>
       ${comment(true,
		 "The value of the expression is <strong>arg</strong> " +
		 "(directly returns whithout function call).")}
     </tr>
     <tr>
       <td>
	 <term name="func" JSFunction /> <term name="arg" JSValue />
       </td>
       ${comment(true,
		 "The value of the expression is the return value of " +
		 "<strong>func</strong>, which is called with " +
		 "<strong>arg</strong> as parameter.")}
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
       ${comment(true,
		 "The value of the expression is the return value of " +
		 "<strong>func</strong>, which is called with <em>N</em> parameters.")}
     </tr>

     ${header("Counter expressions", "countexpr")}
     <tr>
       <td>
	 <term name="count" JSUInt />
       </td>
       ${comment(true,
		 "Temporal guard that count the number of times " +
		 "the signal gard or expression must be true.")}
     </tr>
     <tr>
       <td>
	 <term name="funcCount" JSFunction />
       </td>
       ${comment(true,
		 "The value of the temporal expression is the return " +
		 "value of <strong>funcCount</strong>, which is called without " +
		 "parameters.")}
     </tr>
     <tr>
       <td>
	 <term name="argCount" JSValue />
       </td>
       ${comment(true,
		 "The value of the temporal expression is <strong>argCount</strong>" +
		 " directly returns without function call.")}
     </tr>
     <tr>
       <td>
	 <term name="funcCount" JSFunction /> <term name="argCount" JSValue />
       </td>
       ${comment(true,
		 "The value of the temporal expression is the return " +
		 "value of <strong>funcCount</strong>, which is called with " +
		 "<strong>argCount</strong> as parameter.")}
     </tr>
     <tr>
       <td>
	 <term name="funcCount" JSFunction />
	 <indent>
	   <term name="argCount0" JSValue br/>
	   <term name="argCount1" JSValue br/>
	   ...<br />
	   <term name="argCountN" JSValue />
	 </indent>
       </td>
       ${comment(true,
		 "The value of the temporal expression is the return value of " +
		 "<strong>funcCount</strong>, which is called with <em>N</em> " +
		 "parameters.")}
     </tr>
   </table>
