/* eslint-disable @typescript-eslint/no-unused-vars */

import { SupportedNode } from "../types";
import {clone } from "../utils";


// # # # # # # # # #
// FILLS
// # # # # # # # # #

function filterOutFillsWithVariables(fills: Paint[]): Paint[] {
  return fills.filter((fill: Paint) => {
    const hasVariableAlias = fill.type === 'SOLID' && fill.boundVariables?.color?.type === "VARIABLE_ALIAS"
    return (!hasVariableAlias)
  })
}

async function removeVariablesOnTextSegmentFills(node: TextNode): Promise<void>{

  const styledTextSegementId = node.getStyledTextSegments(['fillStyleId'])
  console.log("styledTextSegementId:")
  console.log(styledTextSegementId)

  const styledTextSegementFills = node.getStyledTextSegments(['fills'])
  console.log("styledTextSegementFills")
  console.log(styledTextSegementFills)

  styledTextSegementFills.forEach((segment) => {
    if ("fills" in segment) {
      console.log("fills are in segment")
      const newsSegmentsFills = filterOutFillsWithVariables(segment.fills)
      node.setRangeFills(segment.start, segment.end, newsSegmentsFills)
    }
  })
  // Reapply style IDs
  for (const segment of styledTextSegementId) {
    await node.setRangeFillStyleIdAsync(segment.start, segment.end, segment.fillStyleId)
  } 
}


async function removeVariablesOnNodesFills(node: SupportedNode): Promise<void> {

  if (typeof node.fills == 'symbol' && node.type == "TEXT"){
    console.log('fills is symbol, must have colored text segements')
    await removeVariablesOnTextSegmentFills(node)
    return
  }

  if (node.fillStyleId !== "") {return}

  // Checking if it's an array
  if (!(node.fills instanceof Array)) {
    console.log('fills is no array')
    return;
  }
  const clonedFills: Paint[] = (node.fills).map((x) => clone(x) as Paint);

  node.fills = clonedFills.filter((fill) => {
    const hasVariableAlias = fill.type === 'SOLID' && fill.boundVariables?.color?.type === "VARIABLE_ALIAS"
    return (!hasVariableAlias)
  });
}

// # # # # # # # # #
// STROKES
// # # # # # # # # #

function removeVariablesOnNodesStrokes(node: SupportedNode): void {
  //guard
  if (node.type === "SECTION" || node.strokeStyleId !== "") return;

 
  if (!(node.strokes instanceof Array)) return;
  
  const clonedStrokes: Paint[] = (node.strokes).map((x) => clone(x) as Paint);

  node.strokes = clonedStrokes.filter((stroke) => {
    const hasVariableAlias = stroke.type === 'SOLID' && stroke?.boundVariables?.color?.type === "VARIABLE_ALIAS";
    return !hasVariableAlias
  });
}

// # # # # # # # # #
// EFFECTS
// # # # # # # # # #

function removeVariablesOnNodesEffects(node: SupportedNode): void {
  // guard
  if (node.type === "SECTION" || node.type === "SHAPE_WITH_TEXT") return;

  if (node.effectStyleId !== "") return;

  // Checking if it's an array
  if (!(node.effects instanceof Array)) {
    return;
  }
  
   const clonedEffects: Effect[]  = (node.effects).map((x) => clone(x) as Effect);

  node.effects = clonedEffects.filter((effect) => {
    const hasVariableAlias = effect.boundVariables && 'color' in effect.boundVariables && effect.boundVariables.color?.type == "VARIABLE_ALIAS"
    return !hasVariableAlias
  });
}


export function removeColorVariables(node:SupportedNode):void {
  removeVariablesOnNodesFills(node).catch(err => {throw err});
  removeVariablesOnNodesStrokes(node);
  removeVariablesOnNodesEffects(node);
}