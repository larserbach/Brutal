/* eslint-disable @typescript-eslint/no-unused-vars */

// Type handling
// Supported Nodes include any Figma relevant node which supports strokes, fill or effects
// SectionNodes seem to be a bit special, currently they seem not to support stokes

import { SupportedNode, SUPPORTED_TYPES } from "./types";
import { removeColorStyles } from "./Workers/removeColorStyle";
import { removeColorVariables }  from "./Workers/removeColorVariables";
import { removeCustomColors } from "./Workers/removeCustomColors";
import { removeAllColors } from "./Workers/removeAllColors";
import { detachColorStyles } from "./Workers/detachColorStyles";
import { detachColorVariables } from "./Workers/detachColorVariables";
import { replaceAllColors } from "./Workers/replaceAllColors";




function supportedNodes(node: SceneNode): node is SupportedNode {
  return SUPPORTED_TYPES.includes(node.type);
}

// Parameter Suggestions - key: actionChoice
const PARAM_REMOVE_ALL_COLORS = "Remove All (Styles, variables and custom colors)";
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



/* # # # # # # # # # # # #*/
/* # USER IDENTIFICATION  */
/* # # # # # # # # # # # #*/

const getUserId = async (): Promise<string | undefined> => {
  try{
    // console.log("try getUserID")
    const storedId = await figma.clientStorage.getAsync("userId") as string | undefined;
    if (storedId) {
      return storedId;
    } else {
      const userId = String(Date.now());
      await figma.clientStorage.setAsync("userId", userId)
      return userId
    }

  } catch (e) {
    console.error("userId retrieving error", e);
    throw e
  }
};

// This shows the HTML page in "ui.html".
figma.showUI(__html__, { visible: false });

figma.ui.onmessage = (msg: {type: string, data: string | undefined}) => {
  // console.log("Got message from ui:"); 

  if (msg.type === "initialized") {
    // console.log("  mixpanel is initialized");
  } else if (msg.type === "mixpanel-init-fail") {
    console.error("  mixpanel initializiation failed");
  } else if (msg.type === "track-done") {
    // console.log("  track is done");
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    figma.closePlugin(msg.data);
  } else if (msg.type === "track-failed") {
    console.error("  track failed");
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    figma.closePlugin(msg.data);
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
figma.on("run", ({ parameters }) => {
  // The user must make a selection
  const sel: readonly SceneNode[] = figma.currentPage.selection;
  if (sel.length < 1) {
    console.error('no selection')
    figma.closePlugin("🟡 Select at least one layer 🟡");

  } else {
    // the usual    
    const result = startPluginWithParameters(parameters);
    console.log(result)
    
    getUserId()
    .then(userId => {
      // console.log(`  got userId ${userId}`);
      figma.ui.postMessage({ type: "identify", userId });
      figma.ui.postMessage({
        type: "track",
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        data: { track: parameters?.actionChoice, msg: result },
      });
    })
    .catch((err) => {
      console.error(err);

    });
  }
});

const validNodes: SupportedNode[] = [];

// Manages logic depending on user input, returns messages when everything is done
function startPluginWithParameters(parameters: ParameterValues | undefined): string {
  console.log('startPluginWithParams')
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
      if ( !preservedNode ? true : !node.name.toLowerCase().startsWith(preservedNode) ) {
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
      validNodes.forEach((node) => {removeColorStyles(node)});
      return "🫥 All colors styles are removed in your selection";
      
    case PARAM_REMOVE_COLOR_VARIABLES:
      validNodes.forEach((node) => {removeColorVariables(node)});
      return "🫥 All colors variables are removed in your selection";
      
    case PARAM_REMOVE_CUSTOM_COLORS:
      validNodes.forEach((node) => {removeCustomColors(node)});
      return "🫥 All custom colors are removed in your selection";
      
    case PARAM_REMOVE_ALL_COLORS:
      validNodes.forEach((node) => {removeAllColors(node)});
      return "🫥 All colors are removed in your selection";
      
    case PARAM_DETACH_COLOR_STYLES:
      validNodes.forEach((node) => {detachColorStyles(node)});
      return "🥳 Detached all color styles in your selection.";
      
    case PARAM_DETACH_COLOR_VARIABLES:
      validNodes.forEach((node) => { detachColorVariables(node)});
      return "🥳 Detached all color variables in your selection.";
      
    case PARAM_REPLACE_ALL_COLORS:
      validNodes.forEach((node) => { replaceAllColors(node) });
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