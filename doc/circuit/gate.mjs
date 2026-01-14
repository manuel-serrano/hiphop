/*=====================================================================*/
/*    serrano/prgm/project/hiphop/hiphop/doc/circuit/gate.mjs          */
/*    -------------------------------------------------------------    */
/*    Author      :  manuel serrano                                    */
/*    Creation    :  Fri Jan  9 08:53:28 2026                          */
/*    Last change :  Wed Jan 14 07:57:26 2026 (serrano)                */
/*    Copyright   :  2026 manuel serrano                               */
/*    -------------------------------------------------------------    */
/*    Various circuit gates drawing                                    */
/*=====================================================================*/

/*---------------------------------------------------------------------*/
/*    The module                                                       */
/*---------------------------------------------------------------------*/
export { label, wire, wireM, dot, and, or, reg, assig, getStyle, getId };

/*---------------------------------------------------------------------*/
/*    getStyle ...                                                     */
/*---------------------------------------------------------------------*/
function getStyle(attrs) {
   let style = "stroke-linecap:butt;stroke-linejoin:miter;stroke-opacity:1";

   if (attrs.fill) {
      style += `;fill:${attrs.fill}`;
   } else if (!("fill" in attrs)) {
      style += `;fill:transparent`;
   }

   if (attrs.stroke) {
      style += `;stroke:${attrs.stroke}`;
   }

   return style;
}

/*---------------------------------------------------------------------*/
/*    getId ...                                                        */
/*---------------------------------------------------------------------*/
function getId(attrs, defClass) {
   return (attrs?.id ? ` id="${attrs.id}"` : "") + (attrs?.class ? ` class="${defClass} ${attrs.class}"` : ` class="${defClass}"`);
}

/*---------------------------------------------------------------------*/
/*    getClass ...                                                     */
/*---------------------------------------------------------------------*/
function getClass(attrs, defClass) {
   if (attrs.class) {
      return `${attrs.class} ${defClass}`;
   } else {
      return defClass;
   }
}

/*---------------------------------------------------------------------*/
/*    label ...                                                        */
/*---------------------------------------------------------------------*/
function label(attrs, label, x, y) {
   const margin = attrs?.margin ?? "   ";
   const anchor = attrs?.anchor ?? "middle";
   const baseline = attrs?.baseline ?? "middle";
   const svg = `${margin}<text ${getId(attrs, "label")} x="${x}" y="${y}" text-anchor="${anchor}" dominant-baseline="${baseline}">${label}</text>\n`;

   return { svg, x, y };
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
      svg += dot({ fill: attrs?.stroke, stroke: attrs.stroke, class: getClass(attrs, "branch"), width: dw }, coords[0][0] - dw/2, coords[0][1] - dw/2);
   }

   if (attrs.dot === "not") {
      svg += dot({ fill: "transparent", stroke: attrs.stroke, class: getClass(attrs, "not"), width: dw }, tx - dw, ty - dw/2);
      coords[coords.length - 1][0] -= dw;
   }

   const points=coords.map(c => `${c[0]},${c[1]}`).join(" ");
   if (attrs.label && attrs.anchor !== "r") {
      svg += `${margin}<text class="${getClass(attrs, "wire-label")}" x="${coords[0][0] - 5}" y="${coords[0][1]}" text-anchor="end" dominant-baseline="middle">${attrs.label}</text>\n`;
   }
   
   svg += `${margin}<g`
      + getId(attrs, "wire")
      + ` style="${getStyle(attrs)}"`
      + ">\n"
      + `${margin}   <path d="m ${coords}"/>\n`
      + `${margin}</g>\n`

   if (attrs.label && attrs.anchor === "r") {
      svg += `${margin}<text class="${getClass(attrs, "wire-label")}" x="${tx + 5}" y="${ty}" text-anchor="start" dominant-baseline="middle">${attrs.label}</text>\n`;
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
   try {
      for (let i = 0; i < coords.length; i++) {
	 if (coords[i][0] === null) {
	    coords[i][0] = coords[i-1][0];
	 }
	 if (coords[i][1] === null) {
	    coords[i][1] = coords[i-1][1];
	 }
      }
   } catch(e) {
      console.error("wireM: wrong coords", coords);
      throw e;
   }
   
   const margin = attrs?.margin ?? "   ";
   const name = attrs?.name ?? "P";
   const dw = 6;
   const lx = coords[coords.length - 1][0];
   const ly = coords[coords.length - 1][1];

   let svg = "";
   
   if (attrs.dot === "branch") {
      svg += dot({ fill: attrs.stroke, stroke: attrs.stroke, class: getClass(attrs, "branch"), width: dw }, coords[0][0] - dw/2, coords[0][1] - dw/2);
   }

   if (attrs.dot === "not") {
      svg += dot({ fill: "transparent", stroke: attrs.stroke, class: getClass(attrs, "not"), width: dw }, lx - dw, ly - dw/2);
      coords[coords.length - 1][0] -= dw;
   }

   const points=coords.map(c => `${c[0]},${c[1]}`).join(" ");
   if (attrs.label && attrs.anchor !== "r") {
      svg += `${margin}<text class="${getClass(attrs, "wire-label")}" x="${coords[0][0] - 5}" y="${coords[0][1]}" text-anchor="end" dominant-baseline="middle">${attrs.label}</text>\n`;
   }
   
   svg += `${margin}<g`
      + getId(attrs, "wire")
      + ` style="${getStyle(attrs)}"`
      + ">\n"
      + `${margin}   <path d="M ${coords}"/>\n`
      + `${margin}</g>\n`

   if (attrs.label && attrs.anchor === "r") {
      svg += `${margin}<text class="${getClass(attrs, "wire-label")}" x="${lx + 5}" y="${ly}" text-anchor="start" dominant-baseline="middle">${attrs.label}</text>\n`;
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

   const tx = x + width/2;
   const ty = y + width/2;
   const optionalText = attrs.id
      ? `${margin}   <text class="reg" id="${attrs.id + "-text"}" x=${tx} y=${ty} text-anchor="middle" dominant-baseline="middle"> </text>\n`
      : "";

   const svg = `${margin}<g`
      + getId(attrs, "reg")
      + ` style="${getStyle(attrs)}"`
      + ">\n"
      + optionalText
      + `${margin}   <path class="reg" d="m ${x},${y} ${width},0 0,${width} -${width},0 0,0 Z"/>\n`
      + `${margin}   <path class="reg" d="m ${x+padding},${y+width} ${(width/2)-padding},${-padding} ${width/2-padding},${+padding}"/>\n`
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
   
   const svg = `${margin}<g`
      + getId(attrs, "assig")
      + ` style="${getStyle(attrs)}"`
      + ">\n"
      + `${margin}   <path d="m ${x},${y} ${width},${height/2} -${width},${height/2} Z"/>\n`
      + `${margin}</g>\n`;

   return { svg, x, y, width, height, lx: x + width, ly: y + height, outy: y + height/2 };
}

