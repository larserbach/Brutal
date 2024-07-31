import { SupportedNode } from "../types";

async function removeAnyColorTypeOnNodesFills(node: SupportedNode): Promise<void> {
  node.fills = [];
  await node.setFillStyleIdAsync("");
}


async function removeAnyColorTypeOnNodesStrokes(node: SupportedNode): Promise<void> {
  // guard
  if (node.type === "SECTION") return;

  node.strokes = [];
  await node.setStrokeStyleIdAsync("")
}


// this func is also used in replaceAllColors
export async function removeAnyColorTypeOnNodesEffects(node: SupportedNode): Promise<void> {
  // guard
  if (node.type === "SECTION" || node.type === "SHAPE_WITH_TEXT") return;

  node.effects = [];
  await node.setEffectStyleIdAsync("")
}


export function removeAllColors(node:SupportedNode): void {
  removeAnyColorTypeOnNodesFills(node).catch(err => {throw err});
  removeAnyColorTypeOnNodesStrokes(node).catch(err => {throw err});
  removeAnyColorTypeOnNodesEffects(node).catch(err => {throw err});
}