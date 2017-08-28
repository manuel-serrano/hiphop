"use strict"

const fs = require("fs");
const lexer = require("../lexer");
const parser = require("../parser");
var src = fs.readFileSync(process.argv[process.argv.length - 1], "utf8");

//src = `i++; ++v`;

let p = new parser.Parser(new lexer.Lexer(src));
let ast = p.generateAST();
//console.log(JSON.stringify(ast));
console.log(ast());

