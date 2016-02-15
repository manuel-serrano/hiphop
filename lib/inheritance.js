"use hopscript"

GLOBAL.___DEFINE_INHERITANCE___ = function(superclass, subclass) {
   function error(name) {
      throw new TypeError("Can't inherit: `" + name + "` is not a Function.");
   }

   if (!(superclass  instanceof Function))
      error("superclass");
   if (!(subclass instanceof Function))
      error("subclass");

   let subclass_constructor = subclass.prototype.constructor;

   subclass.prototype = Object.create(superclass.prototype);
   subclass.prototype.constructor = subclass_constructor;
}
