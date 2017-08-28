#!/usr/local/bin/hop --no-server
"use hopscript"

const fs = require("fs");
const parser = require("./parser");
const lexer = require("./lexer");
const inputFile = process.env.INPUT;
const outputFile = process.env.OUTPUT;

if (!inputFile || !outputFile) {
   console.error(`Usage: INPUT=<input-file> OUTPUT=<output-file> ${process.argv[0]}`);
   process.exit(1);
}

const inputBuffer = fs.readFileSync(inputFile, "utf8");
const outputBuffer = ((new parser.Parser(new lexer.Lexer(inputBuffer))).generateAST())();

fs.writeFileSync(outputFile, outputBuffer);
