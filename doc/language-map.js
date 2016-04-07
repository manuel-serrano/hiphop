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
		       <em style="font-size:140%;margin-left:2%">
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

function TERM_CNODE(attrs) {
   return <span>
     <strong>&lt;${attrs.name}&gt;</strong>
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
     <strong> /&gt;</strong>
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
	else
	   return <span><strong>${attrs.name}</strong></span>;
     })()}
     ${(function() {if (attrs && attrs.br) return <br/>})()}
   </span>
}

function NTERM(attrs) {
   return <em style=${"font-size:140%;"}>
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
	       "<span style=\"font-size:140%;\"><em>non-terminal</em></span>.",
	       "[ ] contains optional term.",
	       "{ } contains repeatable term.",
	       "::= represents an expansion term.")}
     </tr>
     ${header("Statements", "stat")}
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
	 <term_node name="Emit">
	   <term name="signal_name" JSString/>
	   <opt>
	     <nterm name="expr"/>
	   </opt>
	 </term_node>
       </td>
       <td>
       </td>
     </tr>
     ${header("Expressions", "expr")}

     ${header("Module")}
     <tr>
       <td>
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
       <td colspan=2>
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
		 "bla bla 1 sur output signal",
		 "bla bla 2 sur output signal",
		 "bla bla 3 sur output signal")}
     </tr>
   </table>
