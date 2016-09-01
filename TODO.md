
HipHop.js TODO List
===================

* fix and finish specification

* [doc langmap] make script (based on grep) to automatically generate
  link for each instruction to test code containing this instruction

* [doc API] systematically put examples on each language instruction

* [doc] remove useless hello-world example, find gripping example, and
  keeps only part between <hh.module>... </hh.module>

* Trigger Exec::start instantaneously when exec statement is executed:
  it allows to put `func_start_accessor_list` in an ActionNet that will
  automatically generate `runtime` array for each accessor (don't need
  to do it manually). It change nothing on the semantics but simplify
  the code in machine.js, and avoid duplication (generation of
  `runtime`)

* Warning on host expression used in conditional if no signal are used
  (generally, conditional are dependent of signal on reactive world,
  not of values of host world)

* Check implementation of `dfunc`
