/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/doc/circuit/svg.mjs           */
/*    -------------------------------------------------------------    */
/*    Author      :  manuel serrano                                    */
/*    Creation    :  Fri Jan  9 09:45:59 2026                          */
/*    Last change :  Tue Jan 13 10:28:02 2026 (serrano)                */
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
function svg(attrs, node) {
   if (typeof attrs !== "object") {
      throw new TypeError("svg: bad attributes " + attrs);
   }

   const width = attrs.width ? attrs.width : node.width + node.x;
   const height = attrs.height ? attrs.height : node.height + node.x;
   const viewBox = attrs?.viewBox ?? `0 0 ${width} ${height}`;
   
   return `<svg width="${width}" height="${height}" `
      + (attrs?.id ? ` id="${attrs.id}"` : "")
      + (attrs?.class ? ` class="${attrs.class}"` : ' class="circuit"')
      + (viewBox ? ` viewBox="${viewBox}"` : "")
      + ">\n"
      + node.svg
      + "</svg>";
}

/*---------------------------------------------------------------------*/
/*    xml ...                                                          */
/*---------------------------------------------------------------------*/
function xml(node) {
   const content = (typeof node === "string") ? node : svg({}, node);
   return '<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n' + content;
}
