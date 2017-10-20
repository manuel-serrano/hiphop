#!/usr/local/bin/hop --no-server
"use hopscript"

const path = require("path");
const fs = require("fs");
const parser = require("./parser");
const lexer = require("./lexer");
const inputFile = path.resolve(process.env.INPUT);
const outputFile = path.resolve(process.env.OUTPUT);

if (!inputFile || !outputFile) {
   console.error(`Usage: INPUT=<input-file> OUTPUT=<output-file> ${process.argv[0]}`);
   process.exit(1);
} else if (inputFile === outputFile) {
   console.error(`Error: INPUT and OUTPUT are the same file.`);
   process.exit(2);
}

const inputBuffer = fs.readFileSync(inputFile, "utf8");
const outputBuffer = ((new parser.Parser(new lexer.Lexer(inputBuffer))).generateAST())();

fs.writeFileSync(outputFile, outputBuffer);
