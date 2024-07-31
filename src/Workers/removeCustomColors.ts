import { SupportedNode } from "../types";
import { clone } from "../utils";

function removeCustomColorsOnNodesFills(node: SupportedNode): void {
  if (node.fillStyleId !== "") {
    return;
  }
  // Checking if it's an array
  if (!(node.fills instanceof Array)) {
    return;
  }

  const clonedFills: Paint[] = (node.fills).map((x) => clone(x) as Paint);

  node.fills = clonedFills.filter((fill) => {
    const hasVariableAlias = fill.type === 'SOLID' && fill.boundVariables?.color?.type === "VARIABLE_ALIAS";
    return hasVariableAlias
  });
}

function removeCustomColorsOnNodesStrokes(node: SupportedNode): void {
  if (node.type === "SECTION" || node.strokeStyleId !== "") return;
  // Checking if it's an array
  if (!(node.strokes instanceof Array)) {
    return;
  }

  const clonedStrokes: Paint[] = (node.strokes).map((x) => clone(x) as Paint);

  node.strokes = clonedStrokes.filter((stroke) => {
    const hasVariableAlias = stroke.type === 'SOLID' && stroke.boundVariables?.color?.type === "VARIABLE_ALIAS";
    return hasVariableAlias
  });  
}

function removeCustomColorsOnNodesEffects(node: SupportedNode): void {
  // guard
  console.log('-- remove custom effects --')
  if (node.type === "SECTION" || node.type === "SHAPE_WITH_TEXT") return;

  if (node.effectStyleId !== "") {
    console.log('has style')
    return;
  }

    console.log('shouldn not have a style')

  // Checking if it's an array
  if (!(node.effects instanceof Array)) {
    return;
  }

   const clonedEffects: Effect[] = (node.effects).map((x) => clone(x) as Effect);

  node.effects = clonedEffects.filter((effect) => {
    const hasVariableAlias = effect.boundVariables && 'color' in effect.boundVariables && effect.boundVariables.color?.type === "VARIABLE_ALIAS";
    return hasVariableAlias
  });
}



export function removeCustomColors(node:SupportedNode):void {

  removeCustomColorsOnNodesFills(node);
  removeCustomColorsOnNodesStrokes(node);
  removeCustomColorsOnNodesEffects(node);
}