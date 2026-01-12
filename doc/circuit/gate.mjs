/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/doc/circuit/gate.mjs          */
/*    -------------------------------------------------------------    */
/*    Author      :  manuel serrano                                    */
/*    Creation    :  Fri Jan  9 08:53:28 2026                          */
/*    Last change :  Mon Jan 12 13:56:13 2026 (serrano)                */
/*    Copyright   :  2026 manuel serrano                               */
/*    -------------------------------------------------------------    */
/*    Various circuit gates drawing                                    */
/*=====================================================================*/

/*---------------------------------------------------------------------*/
/*    The module                                                       */
/*---------------------------------------------------------------------*/
export { wire, wireM, dot, and, or, reg, assig };

/*---------------------------------------------------------------------*/
/*    getStyle ...                                                     */
/*---------------------------------------------------------------------*/
function getStyle(attrs) {
   let style = "stroke-linecap:butt;stroke-linejoin:miter;stroke-opacity:1";

   style += (attrs.fill ? `;fill:${attrs.fill}` : ";fill:transparent");
   style += (attrs.stroke ? `;stroke:${attrs.stroke}` : ";stroke:var(--stroke-color)");

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
   const dw = 6;
   const tx = coords.map(c => c[0]).reduce((a, b) => a + b, 0);
   const ty = coords.map(c => c[1]).reduce((a, b) => a + b, 0);

   let svg = "";
   
   if (attrs.dot === "branch") {
      svg += dot({ stroke: attrs.stroke, class: "branch", width: dw }, coords[0][0] - dw/2, coords[0][1] - dw/2);
   }

   if (attrs.dot === "not") {
      svg += dot({ stroke: attrs.stroke, class: "branch", width: dw, fill: "transparent" }, tx - dw, ty - dw/2);
      coords[coords.length - 1][0] -= dw;
   }

   const points=coords.map(c => `${c[0]},${c[1]}`).join(" ");
   if (attrs.label && attrs.anchor !== "r") {
      svg += `${margin}<text class="wire-label" x="${coords[0][0] - 5}" y="${coords[0][1]}" text-anchor="end" dominant-baseline="middle">${attrs.label}</text>\n`;
   }
   
   svg += `${margin}<g`
      + getId(attrs, "wire")
      + ` style="${getStyle(attrs)}"`
      + ">\n"
      + `${margin}   <path d="m ${coords}"/>\n`
      + `${margin}</g>\n`

   if (attrs.label && attrs.anchor === "r") {
      svg += `${margin}<text class="wire-label" x="${tx + 5}" y="${ty}" text-anchor="start" dominant-baseline="middle">${attrs.label}</text>\n`;
   }
   
   return { svg , coords, x: coords[0][0], y: coords[0][1], lx: tx, ly: ty };
}

/*---------------------------------------------------------------------*/
/*    wireM...                                                         */
/*---------------------------------------------------------------------*/
function wireM(attrs, ...coords) {
   if (typeof attrs !== "object") {
      throw new TypeError("namedCircuit: bad attributes " + attrs);
   }

   // coords cleanup
   for (let i = 0; i < coords.length; i++) {
      if (!coords[i][0]) {
	 coords[i][0] = coords[i-1][0];
      }
      if (!coords[i][1]) {
	 coords[i][1] = coords[i-1][1];
      }
   }
   
   const margin = attrs?.margin ?? "   ";
   const name = attrs?.name ?? "P";
   const dw = 6;
   const lx = coords[coords.length - 1][0];
   const ly = coords[coords.length - 1][1];

   let svg = "";
   
   if (attrs.dot === "branch") {
      svg += dot({ stroke: attrs.stroke, class: "branch", width: dw }, coords[0][0] - dw/2, coords[0][1] - dw/2);
   }

   if (attrs.dot === "not") {
      svg += dot({ stroke: attrs.stroke, class: "branch", width: dw, fill: "transparent" }, lx - dw, ly - dw/2);
      coords[coords.length - 1][0] -= dw;
   }

   const points=coords.map(c => `${c[0]},${c[1]}`).join(" ");
   if (attrs.label && attrs.anchor !== "r") {
      svg += `${margin}<text class="wire-label" x="${coords[0][0] - 5}" y="${coords[0][1]}" text-anchor="end" dominant-baseline="middle">${attrs.label}</text>\n`;
   }
   
   svg += `${margin}<g`
      + getId(attrs, "wire")
      + ` style="${getStyle(attrs)}"`
      + ">\n"
      + `${margin}   <path d="M ${coords}"/>\n`
      + `${margin}</g>\n`

   if (attrs.label && attrs.anchor === "r") {
      svg += `${margin}<text class="wire-label" x="${lx + 5}" y="${ly}" text-anchor="start" dominant-baseline="middle">${attrs.label}</text>\n`;
   }
   
   return { svg , coords, x: coords[0][0], y: coords[0][1], lx, ly };
}

/*---------------------------------------------------------------------*/
/*    dot ...                                                          */
/*---------------------------------------------------------------------*/
function dot(attrs, x, y) {
    if (typeof attrs !== "object") {
      throw new TypeError("dot: bad attributes " + attrs);
   }
   const margin = attrs?.margin ?? "   ";
   const width = attrs?.width ?? 6;

   attrs.stroke = attrs.stroke ?? "var(--and-color)";
   attrs.fill = attrs.fill ?? "inherit";
   
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
   const width = attrs?.width ?? 40;
   const height = attrs?.height ?? width / 1.5;
   const arcwidth = attrs?.arcwidth ?? (width / 10) * 4;
   const control = width / 5;
   
   attrs.stroke = attrs.stroke ?? "var(--and-color)";
   
   const svg = `${margin}<g`
      + getId(attrs, "logical and")
      + ` style="${getStyle(attrs)}"`
      + ">\n"
      + `${margin}   <path d="m ${x},${y} 0,${height} ${width-arcwidth},0 c ${control},0 ${arcwidth},${-(height/2-control)} ${arcwidth},-${height/2} c 0,-${height/2-control/2} ${arcwidth/2-control*2},-${height/2} -${arcwidth},-${height/2} Z"/>\n`
      + `${margin}</g>\n`;
   
   return { svg, x, y, width, height, control, lx: x + width, ly: y + height, outy: y + height/2 };
}

/*---------------------------------------------------------------------*/
/*    or ...                                                           */
/*---------------------------------------------------------------------*/
function or(attrs, x, y) {
   if (typeof attrs !== "object") {
      throw new TypeError("or: bad attributes " + attrs);
   }
   const margin = attrs?.margin ?? "   ";
   const width = attrs?.width ?? 50;
   const height = attrs?.height ?? width / 1.5;
   const arcwidth = attrs?.arcwidth ?? (width / 10) * 8;
   const larcwidth = attrs?.larcwidth ?? (width / 10) * 2;
   const control = width / 10;
   
   attrs.stroke = attrs.stroke ?? "var(--or-color)";
   
   const svg = `${margin}<g`
      + getId(attrs, "logical or")
      + ` style="${getStyle(attrs)}"`
      + ">\n"
      + `${margin}   <path d="m ${x},${y} c ${control},${control} ${larcwidth},${(height/2-control)} ${larcwidth},${height/2} c 0,${height/2-control} -${larcwidth-control},${height/2-control} -${larcwidth},${height/2} l ${width-arcwidth},0 c ${control * 6},0 ${arcwidth},${-(height/2-control)} ${arcwidth},-${height/2} c 0,-${height/2-control} -${arcwidth-(control * 4)},-${height/2} -${arcwidth},-${height/2} Z"/>\n`
      + `${margin}</g>\n`;

   return { svg, x, y, width, height, control, lx: x + width, ly: y + height, outy: y + height/2 };
}

/*---------------------------------------------------------------------*/
/*    reg ...                                                          */
/*---------------------------------------------------------------------*/
function reg(attrs, x, y) {
   if (typeof attrs !== "object") {
      throw new TypeError("reg: bad attributes " + attrs);
   }
   const margin = attrs?.margin ?? "   ";
   const width = attrs?.width ?? 30;
   const padding = (width / 10) * 2.5;
   
   attrs.stroke = attrs.stroke ?? "var(--reg-color)";
   
   const svg = `${margin}<g`
      + getId(attrs, "reg")
      + ` style="${getStyle(attrs)}"`
      + ">\n"
      + `${margin}   <path d="m ${x},${y} ${width},0 0,${width} -${width},0 0,0 Z"/>\n`
      + `${margin}   <path d="m ${x+padding},${y+width} ${(width/2)-padding},${-padding} ${width/2-padding},${+padding}"/>\n`
      + `${margin}</g>\n`;

   return { svg, x, y, width, height: width, lx: x + width, ly: y + width, outy: y + width/2 };
}


/*---------------------------------------------------------------------*/
/*    assig ...                                                        */
/*---------------------------------------------------------------------*/
function assig(attrs, x, y) {
   if (typeof attrs !== "object") {
      throw new TypeError("and: bad attributes " + attrs);
   }
   const margin = attrs?.margin ?? "   ";
   const width = attrs?.width ?? attrs?.height ?? 30;
   const height = attrs?.height ?? width;
   
   attrs.stroke = attrs.stroke ?? "var(--assig-color)";
   
   const svg = `${margin}<g`
      + getId(attrs, "assig")
      + ` style="${getStyle(attrs)}"`
      + ">\n"
      + `${margin}   <path d="m ${x},${y} ${width},${height/2} -${width},${height/2} Z"/>\n`
      + `${margin}</g>\n`;

   return { svg, x, y, width, height: height, lx: x + width, ly: y + height };
}

