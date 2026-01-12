/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/doc/draw/gate.mjs             */
/*    -------------------------------------------------------------    */
/*    Author      :  manuel serrano                                    */
/*    Creation    :  Fri Jan  9 08:53:28 2026                          */
/*    Last change :  Mon Jan 12 09:55:16 2026 (serrano)                */
/*    Copyright   :  2026 manuel serrano                               */
/*    -------------------------------------------------------------    */
/*    Various circuit gates drawing                                    */
/*=====================================================================*/

/*---------------------------------------------------------------------*/
/*    The module                                                       */
/*---------------------------------------------------------------------*/
export { wire, dot, and, or, reg, assig };

/*---------------------------------------------------------------------*/
/*    getStyle ...                                                     */
/*---------------------------------------------------------------------*/
function getStyle(attrs) {
   let style = "stroke-width:2px;stroke-linecap:butt;stroke-linejoin:miter;stroke-opacity:1";

   style += (attrs.fill ? `;fill:${attrs.fill}` : ";fill:transparent");
   style += (attrs.stroke ? `;stroke:${attrs.stroke}` : ";stroke:red");

   return style;
}

/*---------------------------------------------------------------------*/
/*    getId ...                                                        */
/*---------------------------------------------------------------------*/
function getId(attrs, defClass) {
   return (attrs?.id ? ` id="${attrs.id}"` : "") + (attrs?.class ? ` class="${defClass} ${attrs.class}"` : ` class="${defClass}"`);
}

/*---------------------------------------------------------------------*/
/*    wire ...                                                         */
/*---------------------------------------------------------------------*/
function wire(attrs, ...coords) {
   if (typeof attrs !== "object") {
      throw new TypeError("namedCircuit: bad attributes " + attrs);
   }

   const margin = attrs?.margin ?? "   ";
   const name = attrs?.name ?? "P";

   const points=coords.map(c => `${c[0]},${c[1]}`).join(" ");

   let svg = "";

   if (attrs.label && attrs.anchor !== "r") {
      svg += `${margin}<text class="wire-label" x="${coords[0][0] - 5}" y="${coords[0][1]}" text-anchor="end" dominant-baseline="middle">${attrs.label}</text>\n`;
   }
   
   if (attrs.dot && attrs.anchor !== "r") {
      const dw = 5;
      svg += dot({ class: "branch", width: dw }, coords[0][0] - dw/2, coords[0][1] - dw/2);
   }
      
   svg += `${margin}<g`
      + getId(attrs, "wire")
      + ` style="${getStyle(attrs)}"`
      + ">\n"
      + `${margin}   <path d="m ${coords}"/>\n`
      + `${margin}</g>\n`

   if (attrs.label && attrs.anchor === "r") {
      const tx = 5 + coords.map(c => c[0]).reduce((a, b) => a + b, 0);
      const ty = coords.map(c => c[1]).reduce((a, b) => a + b, 0);
      svg += `${margin}<text class="wire-label" x="${tx}" y="${ty}" text-anchor="start" dominant-baseline="middle">${attrs.label}</text>\n`;
   }
   
   return { svg , coords };
}

/*---------------------------------------------------------------------*/
/*    dot ...                                                          */
/*---------------------------------------------------------------------*/
function dot(attrs, x, y) {
    if (typeof attrs !== "object") {
      throw new TypeError("dot: bad attributes " + attrs);
   }
   const margin = attrs?.margin ?? "   ";
   const width = attrs?.width ?? 10;
   
   return `${margin}<circle`
      + getId(attrs, "dot")
      + ` style="${getStyle(attrs)}"`
      + ` cx="${x+width/2}" cy="${y+width/2}" r="${width/2}" />\n`;
}

/*---------------------------------------------------------------------*/
/*    and ...                                                          */
/*---------------------------------------------------------------------*/
function and(attrs, x, y) {
   if (typeof attrs !== "object") {
      throw new TypeError("and: bad attributes " + attrs);
   }
   const margin = attrs?.margin ?? "   ";
   const width = attrs?.width ?? 20;
   const height = attrs?.height ?? 10;
   const arcwidth = attrs?.arcwidth ?? (width / 10) * 4;
   const control = width / 10;
   
   return `${margin}<g`
      + getId(attrs, "and")
      + ` style="${getStyle(attrs)}"`
      + ">\n"
      + `${margin}   <path d="m ${x},${y} 0,${height} ${width-arcwidth},0 c ${control},0 ${arcwidth},${-(height/2-control)} ${arcwidth},-${height/2} c 0,-${height/2-control} -${arcwidth-control},-${height/2} -${arcwidth},-${height/2} Z"/>\n`
      + `${margin}</g>\n`;
}

/*---------------------------------------------------------------------*/
/*    or ...                                                           */
/*---------------------------------------------------------------------*/
function or(attrs, x, y) {
   if (typeof attrs !== "object") {
      throw new TypeError("or: bad attributes " + attrs);
   }
   const margin = attrs?.margin ?? "   ";
   const width = attrs?.width ?? 60;
   const height = attrs?.height ?? width / 2;
   const arcwidth = attrs?.arcwidth ?? (width / 10) * 8;
   const larcwidth = attrs?.larcwidth ?? (width / 10) * 2;
   const control = width / 10;
   
   const svg = `${margin}<g`
      + getId(attrs, "or")
      + ` style="${getStyle(attrs)}"`
      + ">\n"
      + `${margin}   <path d="m ${x},${y} c ${control},${control} ${larcwidth},${(height/2-control)} ${larcwidth},${height/2} c 0,${height/2-control} -${larcwidth-control},${height/2-control} -${larcwidth},${height/2} l ${width-arcwidth},0 c ${control * 6},0 ${arcwidth},${-(height/2-control)} ${arcwidth},-${height/2} c 0,-${height/2-control} -${arcwidth-(control * 4)},-${height/2} -${arcwidth},-${height/2} Z"/>\n`
      + `${margin}</g>\n`;

   return { svg, x, y, width, height, control };
}

/*---------------------------------------------------------------------*/
/*    reg ...                                                          */
/*---------------------------------------------------------------------*/
function reg(attrs, x, y) {
   if (typeof attrs !== "object") {
      throw new TypeError("reg: bad attributes " + attrs);
   }
   const margin = attrs?.margin ?? "   ";
   const width = attrs?.width ?? 100;
   const padding = (width / 10) * 2.5;
   
   return `${margin}<g`
      + getId(attrs, "reg")
      + ` style="${getStyle(attrs)}"`
      + ">\n"
      + `${margin}   <path d="m ${x},${y} ${width},0 0,${width} -${width},0 0,0 Z"/>\n`
      + `${margin}   <path d="m ${x+padding},${y+width} ${(width/2)-padding},${-padding} ${width/2-padding},${+padding}"/>\n`
      + `${margin}</g>\n`;
}


/*---------------------------------------------------------------------*/
/*    assig ...                                                        */
/*---------------------------------------------------------------------*/
function assig(attrs, x, y) {
   if (typeof attrs !== "object") {
      throw new TypeError("and: bad attributes " + attrs);
   }
   const margin = attrs?.margin ?? "   ";
   const width = attrs?.width ?? 100;
   const height = width;
   
   return `${margin}<g`
      + getId(attrs, "assig")
      + ` style="${getStyle(attrs)}"`
      + ">\n"
      + `${margin}   <path d="m ${x},${y} ${width},${height/2} -${width},${height/2} Z"/>\n`
      + `${margin}</g>\n`;
}

