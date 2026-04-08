# Esterelcoq, an Esterel simulator extracted from Rocq

## Files

+ esterel.ml: definitions & simulator extracted from Coq
+ esterel.mli: interface of esterel.ml
+ esterelcoq.ml: main entry point: read/write JSON and call the simulator
+ dune: stanza for compiling and running the simulator with Dune

## Installation & running using dune

1. Install `opam` (for instance using your package manager)

2. Using opam, install the packages `dune` and `yojson`
   ```shell
   opam install dune yojson
   ```
3. Compile and run the simulator with
   ```shell
   dune exec ./esterelcoq.exe -- [options] <inputfile>
   ```
   where
   - `<inputfile>` is the input program and events in JSON format
   - `[options]` can specify which semantics and output file to use

## Manual Installation and running

1. Make sure the Yojson library (an Ocaml library for parsing JSON) is available and find its location (for instance using `ocamlfind`)

2. Compile all ml/mli files, using Yojson for esterecoq.ml
   ```shell
   ocamlc esterel.mli
   ocamlc esterel.ml
   ocamlc -I <PATH-TO-YOJSON> yojson.cma esterel.cmo esterelcoq.ml -o esterelcoq
   ```

3. Run the produced executable
   ```shell
   ./esterelcoq [options] <inputfile>
   ```
