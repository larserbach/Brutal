import { SupportedNode } from "../types";
import { clone } from "../utils";

// # # # # # # # # #
// FILLS
// # # # # # # # # #


function detachVariablesOnFills(fills: Paint[] | readonly Paint[]): Paint[] {

  const clonedFills: Paint[] = (fills).map((x) => clone(x) as Paint);

  return clonedFills.map((fill) => {
    const hasVariableAlias = fill.type === 'SOLID' && fill.boundVariables?.color?.type === "VARIABLE_ALIAS";
    if (hasVariableAlias) {
      delete fill.boundVariables.color
    }
    return fill;
  });
}

async function detachVariablesOnTextSegmentFills(node: TextNode): Promise<void>{

  const styledTextSegementId = node.getStyledTextSegments(['fillStyleId'])
  console.log("styledTextSegementId:")
  console.log(styledTextSegementId)

  const styledTextSegementFills = node.getStyledTextSegments(['fills'])
  console.log("styledTextSegementFills")
  console.log(styledTextSegementFills)

  styledTextSegementFills.forEach((segment) => {
    if ("fills" in segment) {
      console.log("fills are in segment")
      const newsSegmentsFills = detachVariablesOnFills(segment.fills)
      node.setRangeFills(segment.start, segment.end, newsSegmentsFills)
    }
  })
  // Reapply style IDs
  for (const segment of styledTextSegementId) {
    await node.setRangeFillStyleIdAsync(segment.start, segment.end, segment.fillStyleId)
  } 
}


async function detachVariablesOnNodesFills(node: SupportedNode): Promise<void> {
  
  if (typeof node.fills == 'symbol' && node.type == "TEXT"){
    console.log('fills is symbol, must have colored text segements')
    await detachVariablesOnTextSegmentFills(node)
    return
  }

  if (node.fillStyleId !== "") return;

  // Checking if it's an array
  if (!(node.fills instanceof Array)) return;

  node.fills = detachVariablesOnFills(node.fills)
}

// # # # # # # # # #
// STROKES
// # # # # # # # # #

function detachVariablesOnNodesStrokes(node: SupportedNode): void {
  // guard
  if (node.type === "SECTION" || node.strokeStyleId !== "") return;

  // Checking if it's an array
  if (!(node.strokes instanceof Array)) {
    return;
  }

  const clonedStrokes: Paint[] = (node.strokes).map((x) => clone(x) as Paint);

  node.strokes = clonedStrokes.map((stroke) => {
    const hasVariableAlias = stroke.type === 'SOLID' && stroke.boundVariables?.color?.type === "VARIABLE_ALIAS";
    if (hasVariableAlias) {
      delete stroke.boundVariables.color
    }
    return stroke;
  });
}

// # # # # # # # # #
// EFFECTS
// # # # # # # # # #

function detachVariablesOnNodesEffects(node: SupportedNode): void {
  // guard
  if (node.type === "SECTION" || node.type === "SHAPE_WITH_TEXT") return;
  if (node.effectStyleId !== "") {
    return;
  }

  // Checking if it's an array
  if (!(node.effects instanceof Array)) {
    return;
  }

  const clonedEffects: Effect[] = (node.effects).map((x) => clone(x) as Effect);

  node.effects = clonedEffects.map((effect) => {
    const hasVariableAlias = effect?.boundVariables && 'color' in effect.boundVariables && effect.boundVariables.color?.type == "VARIABLE_ALIAS"
    if (hasVariableAlias) {
      delete effect.boundVariables.color
    }
    return effect;
  });
}

export function detachColorVariables(node:SupportedNode): void {
  detachVariablesOnNodesFills(node).catch(err => {throw err});
  detachVariablesOnNodesStrokes(node);
  detachVariablesOnNodesEffects(node);
}