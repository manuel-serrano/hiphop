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
		     return <em>${symbol}::=</em>
	       })()}
	     </td>
	   </tr>
   return ret;
}

function indent() {
   let buf = "";

   for (let i = 0; i < cur_indent; i++)
      buf += "&nbsp;";
   return buf;
}

function TERM_NODE(attrs) {
   return <span>
     ${indent()}
     <strong>&lt;${attrs.name}&gt;</strong>
     ${(function() {if (attrs.br) {cur_indent += 3; return <br/>}x})()}
     ${children(arguments)}
     ${(function() {if (attrs.br) {cur_indent -= 3; return <br/>}})()}
     ${indent()}
     <strong>&lt;/${attrs.name}&gt;</strong>
   </span>;
}

function TERM(attrs) {
   return <span>
     ${indent()}
     ${attrs.name}
     ${(function() {if (attrs.br) return <br/>})()}
   </span>
}

function NTERM(attrs) {
   return <em>
     ${indent()}
     ${attrs.name}
     ${(function() {if (attrs.br) return <br/>})()}
   </em>
}

function OPT(attrs) {
   return <span>
     [${indent()} ${children(arguments)} ]
     ${(function() {if (attrs.br) return <br/>})()}
   </span>;
}

exports.langage_map =
   <table class="table table-striped table-hover">
     ${header("Conventions")}
     ${header("Statements", "stat")}
     ${header("Expressions")}
     ${header("Interface")}
     ${header("Module")}
     <tr>
       <td colspan=2>
	 <term_node name="Module" br>
	   <opt br>
	     <nterm name="module-header"/>
	   </opt>
	   <nterm name="stmt"/>
	 </term_node>
       </td>
     </tr>
   </table>

   // ${md_line("__<Module>__ \\[_module-header_\\] _stmt_ __</Module>__",
     // 	      "Entry point of a reactive program.")}
