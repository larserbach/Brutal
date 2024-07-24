/* eslint-disable @typescript-eslint/no-unsafe-return */
/* _eslint-disable @typescript-eslint/no-explicit-any */
/* _eslint-disable @typescript-eslint/no-unsafe-call */
/* _eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
/* _eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-async-promise-executor */
/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
// Type handling
// Supported Nodes include any Figma relevant node which supports strokes, fill or effects
// SectionNodes seem to be a bit special, currently they seem not to support stokes

import { SupportedNode, SUPPORTED_TYPES } from "./types";
import { getErrorString, clone } from "./utils";


function supportedNodes(node: SceneNode): node is SupportedNode {
  return SUPPORTED_TYPES.includes(node.type);
}

// Parameter Suggestions - key: actionChoice
const PARAM_REMOVE_ALL_COLORS =
  "Remove All (Styles, variables and custom colors)";
const PARAM_REMOVE_COLOR_STYLES = "Remove styles from selected layers";
const PARAM_REMOVE_COLOR_VARIABLES = "Remove variables from selected layers";
const PARAM_REMOVE_CUSTOM_COLORS = "Remove custom colors from selected layers";
const PARAM_DETACH_COLOR_STYLES = "Detach styles on selected layers";
const PARAM_DETACH_COLOR_VARIABLES = "Detach variables on selected layers";
const PARAM_REPLACE_ALL_COLORS = "Replace styles, variables and custom colors";
// Parameter Suggestions - key: nestedLayerChoice
const PARAM_All_LAYERS_TRUE = "All layers in current selection";
const PARAM_All_LAYERS_FALSE = "Only nested layers in current selection";
// Parameter Suggestions - key: preserveChildren
const PARAM_PRESERVE_CHILDREN_TRUE = "Also preserve children of named layer(s)";
const PARAM_PRESERVE_CHILDREN_FALSE = "Preserve only named layer(s)";

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

/* # # # # # # # # # # # #*/
/* # USER IDENTIFICATION  */
/* # # # # # # # # # # # #*/

const getUserId = async () => {
  let userId = Date.now();

  try {
    const id = await figma.clientStorage.getAsync("userId");

    if (typeof id === "undefined") {
      figma.clientStorage.setAsync("userId", userId);
    } else {
      userId = id;
    }
  } catch (e) {
    console.error("userId retrieving error", e);
    figma.clientStorage.setAsync("userId", userId);
  }
  return userId;
};

const userIdentifacation = new Promise<boolean>(async (resolve, reject) => {
  console.log("  awaiting userID");
  const userId = await getUserId();
  console.log(`  got userId ${userId}`);
  figma.ui.postMessage({ type: "identify", userId });
  console.log("promise resolved");
  resolve(true);
});

// This shows the HTML page in "ui.html".
figma.showUI(__html__, { visible: false });

figma.ui.onmessage = (msg) => {
  console.log("Got message from ui:");
  if (msg.type === "track-done") {
    console.log("  track is done");
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    figma.closePlugin(msg.data);
  } else if (msg.type === "initialized") {
    console.log("  mixpanel is initialized");
  }
};

/* # # # # # # # # # # # #*/
/* # # # CONTROLERS # # # */
/* # # # # # # # # # # # #*/

// The 'input' event listens for text change in the Quick Actions box after a plugin is 'Tabbed' into.
figma.parameters.on("input", ({ key, query, result }: ParameterInputEvent) => {
  switch (key) {
    case "actionChoice": {
      const actionChoiceOptions = [
        PARAM_REMOVE_ALL_COLORS,
        PARAM_REMOVE_COLOR_STYLES,
        PARAM_REMOVE_COLOR_VARIABLES,
        PARAM_REMOVE_CUSTOM_COLORS,
        PARAM_DETACH_COLOR_STYLES,
        PARAM_DETACH_COLOR_VARIABLES,
        PARAM_REPLACE_ALL_COLORS,
      ];
      const actionChoiceSuggestions = actionChoiceOptions.filter((s) =>
        s.toLowerCase().includes(query.toLowerCase())
      );
      result.setSuggestions(actionChoiceSuggestions);
      break;
    }

    case "nestedLayerChoice": {
      // the user must choose if he want's to remove only nested layers
      const nestedLayerChoiceOptions = [
        PARAM_All_LAYERS_TRUE,
        PARAM_All_LAYERS_FALSE,
      ];
      const nestedLayerChoiceSuggestions = nestedLayerChoiceOptions.filter(
        (s) => s.includes(query)
      );
      result.setSuggestions(nestedLayerChoiceSuggestions);
      break;
    }
    case "layerName": {
      const layerNameSuggestions = listExcludableNodes(query);
      result.setSuggestions(layerNameSuggestions);
      break;
    }
    case "preserveChildren": {
      const includeChildrenOptions = [
        PARAM_PRESERVE_CHILDREN_TRUE,
        PARAM_PRESERVE_CHILDREN_FALSE,
      ];
      const includeChildrenSuggestions = includeChildrenOptions.filter((s) =>
        s.includes(query)
      );
      result.setSuggestions(includeChildrenSuggestions);
      break;
    }
    default:
      return;
  }
});

function listExcludableNodes(query: string): {name: string, data: string}[] {
  // users selection
  const sel: readonly SceneNode[] = figma.currentPage.selection;
  // the filter
  const inputfilter = (node: SceneNode) =>
    query.length === 0
      ? true
      : node.name.toLowerCase().startsWith(query.toLowerCase());
  // Set to collect all valid node names
  const namesSet = new Set<string>();
  // Worker function to get all supported child nodes
  const filteredChildNodes = (node: SceneNode): SceneNode[] => {
    return "children" in node
      ? node.findAll((child: SceneNode): boolean => {
          // If node is not of supported type eg:(SLICE), it will not be added
          if (!supportedNodes(child)) return false;
          // Only nodes with names matching the user input
          return child.name != null && inputfilter(child);
        })
      : [];
  };
  // Worker function to get all supported nodes in selection
  const filteredSelection = (nodes: readonly SceneNode[]): SceneNode[] => {
    return (
      nodes.filter((node) => node.name != null && inputfilter(node))
    );
  };

  // add names of valid child nodes to namesSet
  sel.flatMap((selectedNode) =>
    filteredChildNodes(selectedNode).forEach((node) => {
      namesSet.add(node.name);
    })
  );
  // add names of valid selected nodes to namesSet
  filteredSelection(sel).forEach((node: SceneNode) => namesSet.add(node.name));

  // create an array from namesSet
  const formattedNodes = Array.from(namesSet, (name) => ({ name, data: name }));
  const namesuggestions = [...formattedNodes];
  return namesuggestions;
}

// When the user presses Enter after inputting all parameters, the 'run' event is fired.
figma.on("run", async ({ parameters }) => {
  // The user must make a selection
  const sel: readonly SceneNode[] = figma.currentPage.selection;
  if (sel.length < 1) {
    figma.closePlugin("🟡 Select at least one layer 🟡");
  }

  try {
    // the usual
    const result = startPluginWithParameters(parameters);
    // figma.closePlugin(result);

    //analytics
    userIdentifacation
      .then(() => {
        console.log("is identified");
        figma.ui.postMessage({
          type: "track",
          data: { track: parameters?.actionChoice, msg: result },
        });
      })
      .catch((err) => {
        console.error(err);
      });
  } catch (err: unknown) {
    const msg = typeof getErrorString(err) == "string" ? getErrorString(err) : "Something went terribly wrong @ 001"
    figma.closePlugin(msg);
  }
});

const validNodes: SupportedNode[] = [];

// Manages logic depending on user input, returns messages when everything is done
function startPluginWithParameters(parameters: ParameterValues | undefined): string {
  // Get users selection on the canvas
  if (parameters === undefined) {
    throw new Error("No parameters available");
  }

  const sel: readonly SceneNode[] = figma.currentPage.selection;

  // The user must make a selection
  if (sel.length < 1) {
    throw new Error("👾👾👾 Please make a selection 👾👾👾");
  }

  // Nodes with this string will not be touched
  const preservedNode: string | undefined = typeof parameters.layerName == "string"
    ? parameters.layerName.toLowerCase()
    : undefined;

  // if true the children of preservedNode will be preserved
  const preserveChildren: boolean =
    parameters.preserveChildren === PARAM_PRESERVE_CHILDREN_TRUE;

  // setting validNodes
  if (parameters.nestedLayerChoice === PARAM_All_LAYERS_FALSE) {
    sel.forEach((node) => {
      if (
        !preservedNode
          ? true
          : !node.name.toLowerCase().startsWith(preservedNode)
      ) {
        if ("children" in node && node.children.length > 0) {
          const children = node.children;
          setValidNodesRecursively(children, preservedNode, preserveChildren);
        }
      }
    });
  } else if (parameters.nestedLayerChoice === PARAM_All_LAYERS_TRUE) {
    setValidNodesRecursively(sel, preservedNode, preserveChildren);
  } else {
    throw new Error("Some issue with parameters.nestedLayerChoice");
  }

  switch (parameters.actionChoice) {
    case PARAM_REMOVE_COLOR_STYLES:
      validNodes.forEach((node) => {
        removeStyleOnNodesFills(node);
        removeStyleOnNodesStrokes(node);
        removeStyleOnNodesEffects(node);
      });
      return "🫥 All colors styles are removed in your selection";
      
    case PARAM_REMOVE_COLOR_VARIABLES:
      validNodes.forEach((node) => {
        removeVariablesOnNodesFills(node);
        removeVariablesOnNodesStrokes(node);
        removeVariablesOnNodesEffects(node);
      });
      return "🫥 All colors variables are removed in your selection";
      
    case PARAM_REMOVE_CUSTOM_COLORS:
      validNodes.forEach((node) => {
        removeCustomColorsOnNodesFills(node);
        removeCustomColorsOnNodesStrokes(node);
        removeCustomColorsOnNodesEffects(node);
      });
      return "🫥 All custom colors are removed in your selection";
      
    case PARAM_REMOVE_ALL_COLORS:
      validNodes.forEach((node) => {
        removeAnyColorTypeOnNodesFills(node);
        removeAnyColorTypeOnNodesStrokes(node);
        removeAnyColorTypeOnNodesEffects(node);
      });
      return "🫥 All colors are removed in your selection";
      
    case PARAM_DETACH_COLOR_STYLES:
      validNodes.forEach((node) => {
        detachStyleOnNodesFills(node);
        detachStyleOnNodesStrokes(node);
        detachStyleOnNodesEffects(node);
      });
      return "🥳 Detached all color styles in your selection.";
      
    case PARAM_DETACH_COLOR_VARIABLES:
      validNodes.forEach((node) => {
        detachVariablesOnNodesFills(node);
        detachVariablesOnNodesStrokes(node);
        detachVariablesOnNodesEffects(node);
      });
      return "🥳 Detached all color variables in your selection.";
      
    case PARAM_REPLACE_ALL_COLORS:
      validNodes.forEach((node) => {
        replaceAnyColorTypeOnNodesFills(node);
        replaceAnyColorTypeOnNodesStrokes(node);
        removeAnyColorTypeOnNodesEffects(node);
      });
      return "👏 Your colors were replaced.";
      
    default:
      throw new Error(
        "Plugin started with unknown parameters: " + JSON.stringify(parameters)
      );
  }
}

/* # # # # # # # # # # # #*/
/* # # # FUNCTIONS # # # #*/
/* # # # # # # # # # # # #*/

function setValidNodesRecursively(
  nodes: SceneNode[] | readonly SceneNode[],
  preservedNode: string | undefined = undefined,
  preserveChildren = true
) {
  nodes.forEach((node) => {
    const isExcluded =
      !preservedNode
        ? false
        : node.name.toLowerCase().startsWith(preservedNode);

    if (!isExcluded) {
      if (supportedNodes(node)) validNodes.push(node);

      if ("children" in node)
        setValidNodesRecursively(
          node.children,
          preservedNode,
          preserveChildren
        );
    }
    if (isExcluded) {
      if (!preserveChildren && "children" in node) {
        setValidNodesRecursively(
          node.children,
          preservedNode,
          preserveChildren
        );
      }
    }
  });
}

// FILLS

async function removeStyleOnNodesFills(node: SupportedNode): Promise<void> {
  if (node.fillStyleId === "") {
    return;
  }
  await node.setFillStyleIdAsync("");
  node.fills = [];
}

async function detachStyleOnNodesFills(node: SupportedNode): Promise<void> {
  if (node.fillStyleId === "") {
    return;
  }
  await node.setFillStyleIdAsync("");
}

function removeVariablesOnNodesFills(node: SupportedNode): void {
  if (node.fillStyleId !== "") {
    return;
  }

  // Checking if it's an array
  if (!(node.fills instanceof Array)) {
    return;
  }

  const clonedFills: Paint[] = (node.fills).map((x) => clone(x));

  node.fills = clonedFills.filter((fill) => {
    const hasVariableAlias = fill.type === 'SOLID' && fill.boundVariables?.color?.type === "VARIABLE_ALIAS"
    return (!hasVariableAlias)
  });
}

function detachVariablesOnNodesFills(node: SupportedNode): void {
  if (node.fillStyleId !== "") {
    return;
  }

  // Checking if it's an array
  if (!(node.fills instanceof Array)) {
    return;
  }

  const clonedFills: Paint[] = (node.fills).map((x) => clone(x));

  node.fills = clonedFills.map((fill) => {
    const hasVariableAlias = fill.type === 'SOLID' && fill.boundVariables?.color?.type === "VARIABLE_ALIAS";
    if (hasVariableAlias) {
      delete fill.boundVariables.color
    }
    return fill;
  });
}

function removeCustomColorsOnNodesFills(node: SupportedNode): void {
  if (node.fillStyleId !== "") {
    return;
  }
  // Checking if it's an array
  if (!(node.fills instanceof Array)) {
    return;
  }

  const clonedFills: Paint[] = (node.fills).map((x) => clone(x));

  node.fills = clonedFills.filter((fill) => {
    const hasVariableAlias = fill.type === 'SOLID' && fill.boundVariables?.color?.type === "VARIABLE_ALIAS";
    return hasVariableAlias
  });
}

async function removeAnyColorTypeOnNodesFills(node: SupportedNode): Promise<void> {
  node.fills = [];
  await node.setFillStyleIdAsync("");
}

async function replaceAnyColorTypeOnNodesFills(node: SupportedNode): Promise<void> {
  if (!(node.fills instanceof Array && node.fills.length)) {
    return;
  }
  await node.setFillStyleIdAsync("");
  node.fills = node.type === "TEXT" ? [OPAQUE] : [SEMITRANSPARENT];
}

// STROKES

async function removeStyleOnNodesStrokes(node: SupportedNode): Promise<void> {
  // guard
  if (node.type === "SECTION" || node.strokeStyleId === "") return;
  await node.setStrokeStyleIdAsync("")
  node.strokes = [];
}

async function detachStyleOnNodesStrokes(node: SupportedNode): Promise<void> {
  // guard
  if (node.type === "SECTION" || node.strokeStyleId === "") return;
  await node.setStrokeStyleIdAsync("")
}

function detachVariablesOnNodesStrokes(node: SupportedNode): void {
  // guard
  if (node.type === "SECTION" || node.strokeStyleId !== "") return;

  // Checking if it's an array
  if (!(node.strokes instanceof Array)) {
    return;
  }

  const clonedStrokes: Paint[] = (node.strokes).map((x) => clone(x));

  node.strokes = clonedStrokes.map((stroke) => {
    const hasVariableAlias = stroke.type === 'SOLID' && stroke.boundVariables?.color?.type === "VARIABLE_ALIAS";
    if (hasVariableAlias) {
      delete stroke.boundVariables.color
    }
    return stroke;
  });
}

function removeVariablesOnNodesStrokes(node: SupportedNode): void {
  if (node.type === "SECTION" || node.strokeStyleId !== "") return;

  // Checking if it's an array
  if (!(node.strokes instanceof Array)) {
    return;
  }
  
  const clonedStrokes: Paint[] = (node.strokes).map((x) => clone(x));

  node.strokes = clonedStrokes.filter((stroke) => {
    const hasVariableAlias = stroke.type === 'SOLID' && stroke?.boundVariables?.color?.type === "VARIABLE_ALIAS";
    return !hasVariableAlias
  });
}

function removeCustomColorsOnNodesStrokes(node: SupportedNode): void {
  if (node.type === "SECTION" || node.strokeStyleId !== "") return;
  // Checking if it's an array
  if (!(node.strokes instanceof Array)) {
    return;
  }

  const clonedStrokes: Paint[] = (node.strokes).map((x) => clone(x));

  node.strokes = clonedStrokes.filter((stroke) => {
    const hasVariableAlias = stroke.type === 'SOLID' && stroke.boundVariables?.color?.type === "VARIABLE_ALIAS";
    return hasVariableAlias
  });

  
}

async function removeAnyColorTypeOnNodesStrokes(node: SupportedNode): Promise<void> {
  // guard
  if (node.type === "SECTION") return;

  node.strokes = [];
  await node.setStrokeStyleIdAsync("")
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

// EFFECTS

async function removeStyleOnNodesEffects(node: SupportedNode): Promise<void> {
  // guard
  if (node.type === "SECTION" || node.type === "SHAPE_WITH_TEXT") return;
  if (node.effectStyleId === "") {
    return;
  }
  await node.setEffectStyleIdAsync("")
  node.effects = [];
}

async function detachStyleOnNodesEffects(node: SupportedNode): Promise<void> {
  // guard
  if (node.type === "SECTION" || node.type === "SHAPE_WITH_TEXT") return;
  if (node.effectStyleId === "") {
    return;
  }

  await node.setEffectStyleIdAsync("")
}

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

  const clonedEffects: readonly Effect[] = (node.effects).map((x) => clone(x));

  node.effects = clonedEffects.map((effect) => {
    const hasVariableAlias = effect?.boundVariables && 'color' in effect.boundVariables && effect.boundVariables.color?.type == "VARIABLE_ALIAS"
    if (hasVariableAlias) {
      delete effect.boundVariables.color
    }
    return effect;
  });
}

function removeVariablesOnNodesEffects(node: SupportedNode): void {
  // guard
  if (node.type === "SECTION" || node.type === "SHAPE_WITH_TEXT") return;

  if (node.effectStyleId !== "") {
    return;
  }

  // Checking if it's an array
  if (!(node.effects instanceof Array)) {
    return;
  }
  
  const clonedEffects: readonly Effect[]  = (node.effects).map((x) => clone(x));

  node.effects = clonedEffects.filter((effect) => {
    const hasVariableAlias = effect.boundVariables && 'color' in effect.boundVariables && effect.boundVariables.color?.type == "VARIABLE_ALIAS"
    return !hasVariableAlias
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

  const clonedEffects: Effect[] = (node.effects).map((x) => clone(x));

  node.effects = clonedEffects.filter((effect) => {
    const hasVariableAlias = effect.boundVariables && 'color' in effect.boundVariables && effect.boundVariables.color?.type === "VARIABLE_ALIAS";
    return hasVariableAlias
  });
}

async function removeAnyColorTypeOnNodesEffects(node: SupportedNode): Promise<void> {
  // guard
  if (node.type === "SECTION" || node.type === "SHAPE_WITH_TEXT") return;

  node.effects = [];
  await node.setEffectStyleIdAsync("")
}
