"use hopscript"

const hhKeywords = [
   "MODULE", "IN", "OUT", "INOUT", "VAL", "PREVAL", "PRE", "NOW",
   "COMBINE", "COMPLETE", "COMPLETEANDREACT", "HALT", "PAUSE",
   "NOTHING", "PAR", "FORK", "ABORT", "WEAKABORT", "EVERY", "ATOM",
   "IMMEDIATE", "LOOP", "LOOPEACH", "AWAIT", "EMIT", "TRAP",
   "EXIT", "EXEC", "EXECEMIT", "EXECASSIGN", "SUSPEND", "SUSTAIN",
   "RUN", "EMITWHENSUSPENDED", "FROM", "TO", "PRIVATE", "COUNT",
   "ONKILL", "ONSUSP", "ONRES", "ONFIRSTSUSP", "ONFIRSTRES", "LET",
   "IF", "ELSE", "TOGGLE", "DONE", "DONEREACT", "SEQUENCE", "LOCAL",
   "EXECID", "WHILE", "PROMISE", "FOR", "THIS"
];

function makeToken(type, line, column, value=null) {
   return {
      type: type,
      line: line,
      column: column,
      value: value != null ? value : type
   };
}

function Lexer(buffer) {
   this.buffer = buffer;
   this.len = buffer.length;
   this.pos = 0;
   this.line = 1;
   this.column = 0;
   this.current = null;
}

exports.Lexer = Lexer;

Lexer.prototype.__isEOF = function() {
   return this.pos >= this.len;
}

Lexer.prototype.__isEOL = function() {
   let c = this.buffer[this.pos];

   return c == "\n" || c == "\r";
}

Lexer.prototype.__isBlank = function() {
   return /\s/.test(this.buffer[this.pos]);
}

Lexer.prototype.__isOperator = function() {
   return ["+", "-", "*", "/", ".", "\\", ":", "%", "|", "!", "?", "#", "&",
	   ";", ",", "(",  ")", "<", ">", "{", "}", "[", "]", "=", "`"]
      .indexOf(this.buffer[this.pos]) > -1;
}

Lexer.prototype.__isAlpha = function(idx=this.pos) {
   let c = this.buffer[idx];

   return ((c >= "a" && c <= "z")
	   || (c >= "A" && c <= "Z")
	   || c == "_"
	   || c == "$");
}

Lexer.prototype.__isDigit = function() {
   let c = this.buffer[this.pos];

   return c >= "0" && c <= "9";
}

Lexer.prototype.__isAlphaNum = function() {
   let c = this.buffer[this.pos];

   return this.__isAlpha() || this.__isDigit();
}

Lexer.prototype.__skipBlank = function() {
   while (this.pos < this.len) {
      if (this.__isEOL()) {
	 break;
      }
      if (!this.__isBlank()) {
	 break;
      }
      this.pos++;
      this.column++;
   }

   return this.__isEOF();
}

Lexer.prototype.__skipComment = function() {
   if (this.__isEOF()) {
      return true;
   } else if (this.buffer[this.pos] == "/"
	       && this.buffer[this.pos + 1] == "/") {
      this.pos += 2;
      this.column += 2;
      while (!this.__isEOF() && !this.__isEOL()) {
	 this.pos++;
	 this.column++;
      }
      this.pos++;
      this.column++;
      this.__skipBlank();
      return this.__skipComment();
   } else if (this.buffer[this.pos] == "/"
	      && this.buffer[this.pos + 1] == "*") {
      this.pos += 2;
      this.column += 2;
      while (!this.__isEOF()) {
	 this.pos++;
	 this.column++;
	 if (this.buffer[this.pos] == "*"
	     && this.buffer[this.pos + 1] == "/") {
	    this.pos += 2;
	    this.column += 2;
	    break;
	 }
      }
      return this.__skipComment();
   } else {
      return false;
   }
}

Lexer.prototype.__newLine = function() {
   if (this.__isEOL()) {
      this.pos++;
      this.current = makeToken("NEWLINE", this.line, this.column);
      this.line++;
      this.column = 0;
      return true;
   }
   return false;
}

Lexer.prototype.__operator = function() {
   if (!this.__isOperator()) {
      return false;
   }

   let pos = this.pos;
   let column = this.column;
   let value = this.buffer[pos];
   let value_ = this.buffer.substring(pos, pos + 2);
   let value__ = this.buffer.substring(pos, pos + 3);
   let value___ = this.buffer.substring(pos, pos + 4);

   if (value___ == ">>>=") {
      value = value___;
      this.pos += 4;
      this.column += 4;
   } else if (value__ == "<<=" || value__ == ">>=" || value__ == ">>>"
	      || value__ == "===" || value__ == "!==") {
      value = value__;
      this.pos += 3;
      this.column += 3;
   } else if (value_ == "*=" || value_ == "/=" || value_ == "%="
       || value_ == "+=" || value_ == "-=" || value_ == "&="
       || value_ == "^=" || value_ == "|=" || value_ == "&&"
       || value_ == "||" || value_ == "==" || value_ == "++"
       || value_ == "--" || value_ == "!=" || value_ == "<="
       || value_ == ">=") {
      value = value_;
      this.pos += 2;
      this.column += 2;
   } else {
      this.pos++;
      this.column++;
   }

   this.current = makeToken(value, this.line, column);
   return true;
}

Lexer.prototype.__identifier = function() {
   if (!this.__isAlpha()) {
      return false;
   }

   let column = this.column;
   let type = "IDENTIFIER";
   let identifier = "";

   do {
      identifier += this.buffer[this.pos];
      this.pos++;
      this.column++;
   } while (this.__isAlphaNum() && !this.__isEOF());

   if (["async", "await", "break", "case", "const", "continue",
	"debugger", "default", "delete", "do", "else", "false", "finally",
	"for", "function", "if", "in", "instanceof", "let", "new", "null",
	"return", "switch", "this", "throw", "true", "try", "typeof", "var",
	"const", "let", "void", "while", "with", "yield", "class", "enum",
	"export", "extends", "import", "super","implements", "interface", "of",
	"package", "private", "protected", "public", "static", "service"]
       .indexOf(identifier) > -1) {
      type = "RESERVED";
   } else if (hhKeywords.indexOf(identifier) > -1) {
      type = "HHRESERVED";
   }

   this.current = makeToken(type , this.line, column, identifier);
   return true;
}

Lexer.prototype.__tilde = function() {
   if (this.buffer[this.pos] == "~") {
      this.current = makeToken("~", this.line, this.column);
      this.pos++;
      this.column++;
      return true;
   }
   return false;
}

Lexer.prototype.__xml = function() {
   //
   // BUG: expression `a <b` will detect an invalide XML node `<b`
   //
   if (this.buffer[this.pos] == "<"
       && (this.__isAlpha(this.pos + 1) || this.buffer[this.pos + 1] == "/")) {
      let posStart = this.pos;
      let column = this.column;
      let tag = "";

      for (;;) {
	 if (this.__isEOF()) {
	    throw new Error(`${this.line}:${column} invalid XML tag ${tag}`);
	 }
	 tag += this.buffer[this.pos];
	 this.pos++;
	 this.column++;
	 if (this.buffer[this.pos - 1] == ">") {
	    break;
	 }
      }

      let token = makeToken("XML", this.line, column, tag);
      this.current = token;

      token.leaf = this.buffer[this.pos - 2] == "/";
      token.closing = this.buffer[posStart + 1] == "/";
      token.openning = !token.closing && !token.leaf;

      if (token.closing && token.leaf) {
	 throw new Error(`${this.line}:${column} invalid XML node ${token.value}`);
      }
      return true;
   }
   return false;
}

Lexer.prototype.__literal = function() {
   let c = this.buffer[this.pos]
   let literal = "";
   let column = this.pos;

   if (c == "'" || c == '"' || c == "`") {
      let delim = c;

      this.pos++;
      this.column++;
      c = this.buffer[this.pos];
      for (;;) {
	 if (c == "\\") {
	    literal += c;
	    literal += this.buffer[this.pos + 1];
	    this.pos += 2;
	    this.column += 2;
	    c = this.buffer[this.pos];
	 } else if (this.__isEOL() || this.__isEOF()) {
	    throw new Error(`${this.line}:${column} invalid litteral ${this.buffer.substring(column, this.pos)}`);
	 } else if (c == delim) {
	    this.current = makeToken("LITERAL", this.line, column, literal);
	    this.current.string = true;
	    this.current.stringDelim = delim;
	    this.current.template = delim == "`" ? true : false;
	    this.pos++;
	    this.column++;
	    return true;
	 } else {
	    literal += c;
	    this.pos++;
	    this.column++;
	    c = this.buffer[this.pos];
	 }
      }
   } else if (this.__isDigit()) {
      for (;;) {
	 if (this.__isDigit() || c == "."
	     //
	     // Support for Hop.js HTML/CSS extensions
	     //
	     || (literal != "" && this.__isAlphaNum())) {
	    literal += c;
	    this.pos++;
	    this.column++;
	    c = this.buffer[this.pos];
	 } else if (this.__isEOL() || this.__isEOF() || this.__isBlank()
		    || this.__isOperator()) {
	    this.current = makeToken("LITERAL", this.line, column, literal);
	    return true;
	 } else {
	    throw new Error(`${this.line}:${column} invalid literal number ${c}`);
	 }
      }
   } else {
      return false;
   }
}

Lexer.prototype.token = function() {
   this.current = null;

   if (this.__skipBlank()) {
      return makeToken("EOF", this.line, this.column);
   } else if (this.__skipComment()) {
      return makeToken("EOF", this.line, this.column);
   } else if (this.__newLine()
	      || this.__tilde()
	      || this.__xml()
	      || this.__literal()
	      || this.__operator()
	      || this.__identifier()) {
      this.current.blankNext = this.__isBlank() || this.__isEOL();

      return this.current;
   } else {
      throw new Error(`${this.line}:${this.column} unexpected character ${this.buffer[this.pos]}`);
   }
}
