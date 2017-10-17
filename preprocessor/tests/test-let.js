MODULE Foo {
   LET foo, bar;
   LET baz;
   IF (1 + 1) {
      LET baz;
      LET taz=5, toz;
      EMIT s(1);
     // LET i;
   };
}

// LET is allowed only at block begining or immediately after another
// LET.  It allows to Keep the JS semantics (scope of let = block) and
// avoid messy situations like instrjs1;let xxx;instrjs2, since xxx is
// actually defined before instrjs1. It is even more confusing with
// temporal instructions, so we prune this case...
