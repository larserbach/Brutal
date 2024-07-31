import { SupportedNode } from "../types";

async function detachStyleOnNodesFills(node: SupportedNode): Promise<void> {
  if (node.fillStyleId === "") {
    return;
  }
  await node.setFillStyleIdAsync("");
}

async function detachStyleOnNodesStrokes(node: SupportedNode): Promise<void> {
  // guard
  if (node.type === "SECTION" || node.strokeStyleId === "") return;
  await node.setStrokeStyleIdAsync("")
}

async function detachStyleOnNodesEffects(node: SupportedNode): Promise<void> {
  // guard
  if (node.type === "SECTION" || node.type === "SHAPE_WITH_TEXT") return;
  if (node.effectStyleId === "") {
    return;
  }

  await node.setEffectStyleIdAsync("")
}


export function detachColorStyles(node:SupportedNode): void {
  detachStyleOnNodesFills(node).catch(err => {throw err});
  detachStyleOnNodesStrokes(node).catch(err => {throw err});
  detachStyleOnNodesEffects(node).catch(err => {throw err});
}