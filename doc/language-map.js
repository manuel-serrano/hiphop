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
	if ("runtime-expr" in attrs)
	   return <span><strong>${attrs.name}</strong>=<nterm name="runtime-expr"/></span>;
	else if ("static-expr" in attrs)
	   return <span><strong>${attrs.name}</strong>=<nterm name="static-expr"/></span>;
	else if ("runtime-exprORstatic-expr" in attrs)
	   return <span><strong>${attrs.name}</strong>=(<nterm name="runtime-expr"/>|<nterm name="static-expr"/>)</span>;
	else if ("JSObject" in attrs)
	   return <span><strong>${attrs.name}</strong>=JSObject</span>;
	else if ("JSString" in attrs)
	   return <span><strong>${attrs.name}</strong>=JSString</span>;
	else if ("JSValue" in attrs)
	   return <span><strong>${attrs.name}</strong>=JSValue</span>;
	else if ("JSFunction" in attrs)
	   return <span><strong>${attrs.name}</strong>=JSFunction</span>;
	else if ("JSUInt" in attrs)
	   return <span><strong>${attrs.name}</strong>=JSUInt</span>;
	else if ("HHModule" in attrs)
	   return <span><strong>${attrs.name}</strong>=HHModule</span>;
	else if ("expr" in attrs)
	   return <span><strong>${attrs.name}</strong>=expr</span>
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
	       "JSValue is a reference to any JavaScript value.",
	       "JSFunction is a reference to any JavaScript function.",
	       "JSObject is a reference to a JavaScript object.",
	       "HHModule is a JavaScript object containing an Hiphop.js program code.")}
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
	   <cnode_args>
	     <opt><nterm name="signal-decl"/></opt>
	   </cnode_args>
	   <indent>
	     <nterm name="stmt"/>
	   </indent>
	 </term_cnode>
       </td>
       ${comment(true,
		 "Entry point of a reactive program.",
		 "Can defines global signals.")}
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
	   <term name="apply" JSFunction/>
	 </term_node>
       </td>
       ${comment(true, "Instantaneous execution of given JavaScript function.")}
     </tr>

     <tr>
       <td>
	 <term_node name="Exec">
	   <indent>
	     <nterm name="signal" br/>
	     <term br name="apply" JSFunction/>
	     <opt br><term name="kill" JSFunction /></opt>
	     <opt br><term name="susp" JSFunction /></opt>
	     <opt br><term name="res" JSFunction /></opt>
	   </indent>

	 </term_node>
       </td>
       ${comment(true,
		 "Execution of JavaScript function referenced by <strong>apply" +
		 "</strong>, and wait for terminaison of the routine by the call to this.return()" +
		 " or this.returnAndReact() in apply function.")}
     </tr>

     <tr>
       <td>
	 <term_node name="Emit">
	  { <nterm name="signal"/> }
	    <opt br><nterm name="js-expr"/></opt>
	    <indent><opt><term name="ifValue" JSValue /> | <term name="ifApply" JSFunction /></opt></indent>
	 </term_node>
       </td>
       ${comment(true,
		 "Terminates instantaneously.",
		 "Can emit several signals.")}
     </tr>

     <tr>
       <td>
	 <term_node name="Sustain">
	    { <nterm name="signal"/> }
	    <opt br><nterm name="js-expr"/></opt>
	    <indent><opt><term name="ifValue" JSValue /> | <term name="ifApply" JSFunction /></opt></indent>
	 </term_node>
       </td>
       ${comment(true,
		 "Never terminates.",
		 "Can be aborted.",
		 "Can emit several signals.")}
     </tr>

     <tr>
       <td>
	 <term_cnode name="Loop">
	   <nterm name="stmt"/>
	 </term_cnode>
       </td>
        ${comment(true,
		  "Instantaneously start its body.",
		  "Instantaneously restarts its body when it has terminated.",
		  "Never terminates, can be aborted or exited.",
		  "<em style=\"font-size:130%\">stmt</em> must not be instantaneous.")}
     </tr>

     <tr>
       <td>
	 <term_cnode name="If">
	   <cnode_args>
	     <opt><term name="not"/></opt>
	     <nterm name=delay-expr/>
	   </cnode_args>
	   <indent>
	     <nterm name="stmt" br/>
	     <opt><nterm name="stmt"/></opt>
	   </indent>
	 </term_cnode>
       </td>
        ${comment(true,
		  "Instantaneously evaluated the delay expression.",
		  "Takes the then branch if the delay elapses, the else branch otherwise.")}
     </tr>

     <tr>
       <td>
	 <term_node name="Await">
	   <nterm name="delay-expr"/>
	   <opt >
	     <nterm name="count-expr"/>
	   </opt>
	 </term_node>
       </td>
        ${comment(true,
		  "Terminates when the delay elapses.",
		  "Instantaneous is <strong>immediate</strong> keyword is present.")}
     </tr>

     <tr>
       <td>
	 <term_cnode name="Abort">
	   <cnode_args>
	     <nterm name="delay-expr" />
	     <opt><nterm name="count-expr"/></opt>
	   </cnode_args>
	   <indent>
	     <nterm name="stmt"/>
	   </indent>
	 </term_cnode>
       </td>
       ${comment(true, "Absortion; kills the statement when the delay elapses.")}
     </tr>

     <tr>
       <td>
	 <term_cnode name="WeakAbort">
	   <cnode_args>
	      <nterm name="delay-expr" />
	      <opt><nterm name="count-expr"/></opt>
	   </cnode_args>
	   <indent>
	     <nterm name="stmt"/>
	   </indent>
	 </term_cnode>
       </td>
       ${comment(true,
		 "Weak variant of absortion; restarts the statement in " +
		 "the instant where de delay elapses, and kills it at the end of the instant.")}
     </tr>

     <tr>
       <td>
	 <term_cnode name="LoopEach">
	   <cnode_args>
	     <nterm name="delay-expr" />
	     <opt><nterm name="count-expr"/></opt>
	   </cnode_args>
	   <indent>
	     <nterm name="stmt"/>
	   </indent>
	 </term_cnode>
       </td>
       ${comment(true, "Temporal loop which is initialy started.")}
     </tr>

     <tr>
       <td>
	 <term_cnode name="Every">
	   <cnode_args>
	     <nterm name="delay-expr" />
	     <opt><nterm name="count-expr"/></opt>
	   </cnode_args>
	   <indent>
	     <nterm name="stmt"/>
	   </indent>
	 </term_cnode>
       </td>
       ${comment(true,
		 "Tempooral loop which initially wait the delay expression elapses.")}
     </tr>

     <tr>
       <td>
	 <term_cnode name="Suspend">
	   <cnode_args>
	     <nterm name="delay-expr" />
	   </cnode_args>
	   <indent>
	     <nterm name="stmt"/>
	   </indent>
	 </term_cnode>
       </td>
       ${comment(true,
		 "Keeps the state of its body and pauses for the current instant.")}
     </tr>

     <tr>
       <td>
	 <term_cnode name="Trap">
	   <cnode_args>
	     <nterm name="trap"/>
	   </cnode_args>
	   <nterm name="stmt"/>
	 </term_cnode>
       </td>
       ${comment(true, "Defines a scope that can be exited by a trap.")}
     </tr>

     <tr>
       <td>
	 <term_node name="Exit">
	   <nterm name="trap"/>
	 </term_node>
       </td>
       ${comment(true, "Exit point of a trap.")}
     </tr>

     <tr>
       <td>
	 <term_cnode name="Let">
	   <cnode_args>
	     <opt><nterm name="signal-decl"/></opt>
	   </cnode_args>
	   <nterm name="stmt"/>
	 </term_cnode>
       </td>
       ${comment(true, "Defines a scope with local signals.")}
     </tr>

     <tr>
       <td>
	 <term_node name="Run">
	   <indent>
	     <term name="module" HHModule br />
	     <opt>{ <nterm name="signal"/>=<nterm name="signal"/> }</opt>
	   </indent>
	 </term_node>
       </td>
       ${comment(true,
		 "Inline a module in the current module.",
		 "By default, signals on the inlined module are binded to signals of " +
		 "the current module, if they have the same name.",
		 "Can explicitly bind a signal of the inlined module to a signal of the current module.")}
     </tr>

     ${header("Signal Declaration", "signal-decl")}
     <tr>
       <td>
	 { <nterm name="signal"/> <opt>=JSObject</opt> }
       </td>
       ${comment(true,
		 "Defines a signal.",
		 "The optional given object defines signal properties.")}

     </tr>

     ${header("Signal expression", "signal-expr")}
     <tr>
       <td>
	 <opt><term name="pre"/></opt>
	 <opt><term name="immediate"/></opt>
	 <nterm name="signal" />
       </td>
       ${comment(true,
		 "Signal expression. Return true if the signal is present.",
		 "If <strong>pre</strong> keyword is present, return true if " +
		 "the signal was present on the previous instant.")}

     </tr>

     ${header("JavaScript expression", "js-expr")}
     <tr>
       <td><term name="value" JSValue /> | <term name="apply" JSFunction /></td>
       ${comment(true,
		 "Defines a JavaScript expression.",
		 "Signal value and status can be read into the given JSFunction.")}

     </tr>

     ${header("Delay expression", "delay-expr")}
     <tr>
       <td><nterm name="signal-expr" /> | <nterm name="js-expr" /></td>
       ${comment(true, "Defines a delay expression.")}
     </tr>

     ${header("Counter expression", "count-expr")}
     <tr>
       <td><term name="countValue" JSValue /> | <term name="applyValue" JSFunction /></td>
       ${comment(true, "Define a counter expression.")}
     </tr>

     ${header("Signal name", "signal")}
     <tr>
       <td></td>
       ${comment(true, "Name of a signal.", "Must be a valid JavaScript identifier.")}
     </tr>

     ${header("Trap name", "trap")}
     <tr>
       <td></td>
       ${comment(true, "Name of a trap.", "Must be a valid JavaScript identifier.")}
     </tr>
   </table>
