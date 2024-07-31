import { SupportedNode } from "../types";
import { removeAnyColorTypeOnNodesEffects } from "./removeAllColors";


// Colors
const OPAQUE: SolidPaint = {
  type: "SOLID",
  visible: true,
  opacity: 1.0,
  blendMode: "NORMAL",
  color: {
    r: 1.0,
    g: 0.0,
    b: 0.431,
  },
  boundVariables: {},
};

const SEMITRANSPARENT: SolidPaint = {
  type: "SOLID",
  visible: true,
  opacity: 0.1,
  blendMode: "NORMAL",
  color: {
    r: 1.0,
    g: 0.0,
    b: 0.431,
  },
  boundVariables: {},
};

async function replaceAnyColorTypeOnNodesFills(node: SupportedNode): Promise<void> {
  if (!(node.fills instanceof Array && node.fills.length)) {
    return;
  }
  await node.setFillStyleIdAsync("");
  node.fills = node.type === "TEXT" ? [OPAQUE] : [SEMITRANSPARENT];
}

async function replaceAnyColorTypeOnNodesStrokes(node: SupportedNode): Promise<void> {
  // guard
  if (node.type === "SECTION") return;
  if (!(node.strokes instanceof Array && node.strokes.length)) {
    return;
  }

  await node.setStrokeStyleIdAsync("")
  node.strokes = [OPAQUE];
}


export function replaceAllColors(node:SupportedNode): void {

  replaceAnyColorTypeOnNodesFills(node).catch(err => {throw err});
  replaceAnyColorTypeOnNodesStrokes(node).catch(err => {throw err});
  removeAnyColorTypeOnNodesEffects(node).catch(err => {throw err});
}