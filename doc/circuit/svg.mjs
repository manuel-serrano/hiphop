/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/doc/circuit/svg.mjs           */
/*    -------------------------------------------------------------    */
/*    Author      :  manuel serrano                                    */
/*    Creation    :  Fri Jan  9 09:45:59 2026                          */
/*    Last change :  Mon Jan 12 13:32:05 2026 (serrano)                */
/*    Copyright   :  2026 manuel serrano                               */
/*    -------------------------------------------------------------    */
/*    Draw a full svg figure                                           */
/*=====================================================================*/

/*---------------------------------------------------------------------*/
/*    The module                                                       */
/*---------------------------------------------------------------------*/
export { svg, xml };

/*---------------------------------------------------------------------*/
/*    svg ...                                                          */
/*---------------------------------------------------------------------*/
function svg(attrs, ...nodes) {
   if (typeof attrs !== "object") {
      throw new TypeError("svg: bad attributes " + attrs);
   }
   return `<svg width="${attrs?.width ?? 400}" height="${attrs?.height ?? 400}"`
      + (attrs?.id ? ` id="${attrs.id}"` : "")
      + (attrs?.class ? ` class="${attrs.class}"` : ' class="circuit"')
      + ">\n"
      + nodes.join("\n")
      + "</svg>";
}

/*---------------------------------------------------------------------*/
/*    xml ...                                                          */
/*---------------------------------------------------------------------*/
function xml(node) {
   if ((typeof node === "object") && "svg" in node) {
      const attrs = { width: node.width + node.x, height: node.height + node.y, class: "circuit" };
      node = svg(attrs, node.svg);
   }
   return '<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n' + node;
}
