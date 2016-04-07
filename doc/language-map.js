"use hopscript"

const markdown = require("markdown");
const doc = require("hopdoc");

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

function md_line(left, right=null) {
   if (right)
      return <tr>
	<td>${markdown.load(left).XML.car}</td>
	<td>${markdown.load(right).XML.car}</td>
      </tr>
   return <tr>
     <td colspan=2>${markdown.load(left).XML.car}</td>
   </tr>
}

exports.langage_map =
   <table class="table table-striped table-hover">
     ${header("Conventions")}
     ${md_line("**expr** _foo_ lala")}
     ${header("Statements", "stat")}
     ${header("Expressions")}
     ${md_line("**expr** _foo_ lala")}
     ${md_line("**expr** _foo_ lala", "bla bla bla")}
     ${header("Interface")}
     ${header("Module")}
   </table>

