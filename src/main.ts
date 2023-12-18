// Type handling
// Supported Nodes include any Figma relevant node which supports strokes, fill or effects
// SectionNodes seem to be a bit special, currently they seem not to support stokes

type SupportedNode =
  | BooleanOperationNode
  | ComponentNode
  | ComponentSetNode
  | EllipseNode
  | FrameNode
  | InstanceNode
  | LineNode
  | PolygonNode
  | RectangleNode
  | SectionNode
  | StarNode
  | TextNode
  | VectorNode
  | ShapeWithTextNode;

const SUPPORTED_TYPES: NodeType[] = [
  "BOOLEAN_OPERATION",
  "COMPONENT",
  "COMPONENT_SET",
  "ELLIPSE",
  "FRAME",
  "INSTANCE",
  "LINE",
  "POLYGON",
  "RECTANGLE",
  "SECTION",
  "STAR",
  "TEXT",
  "VECTOR",
  "SHAPE_WITH_TEXT",
];

function supportedNodes(node: SceneNode): node is SupportedNode {
  return SUPPORTED_TYPES.includes(node.type);
}

// Menu Commands
const CMD_REMOVE_STYLES = "removeStyles";
const CMD_REPLACE_STYLES = "replaceStyles";
// Parameter Suggestions - key: actionChoice
const PARAM_REMOVE_ALL_COLORS = "Remove All (Styles, variables and custom colors)"
const PARAM_REMOVE_COLOR_STYLES = "Remove styles from selected layers"
const PARAM_REMOVE_COLOR_VARIABLES = "Remove variables from selected layers"
const PARAM_REMOVE_CUSTOM_COLORS = "Remove custom colors from selected layers"
const PARAM_DETACH_COLOR_STYLES = "Detach styles on selected layers"
const PARAM_DETACH_COLOR_VARIABLES = "Detach variables on selected layers"
// const PARAM_REPLACE_COLOR_STYLES = "Replace styles with custom color"
// const PARAM_REPLACE_COLOR_VARIABLES = "Replace variables with custom color"
// const PARAM_REPLACE_CUSTOM_COLORS = "Replace custom colors with custom color"
const PARAM_REPLACE_ALL_COLORS = "Replace styles, variables and custom colors"
// Parameter Suggestions - key: typeChoice
const PARAM_TYPE_FILLS = "Layer fills"
const PARAM_TYPE_STROKES = "Layer strokes"
const PARAM_TYPE_EFFECTS = "Layer effects"
const PARAM_TYPE_ANY = "All (Layer fills, strokes and effects)"
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
  boundVariables: {}
}

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
  boundVariables: {}
}

/* # # # # # # # # # # # #*/
/* # # # CONTROLERS # # # */
/* # # # # # # # # # # # #*/

// The 'input' event listens for text change in the Quick Actions box after a plugin is 'Tabbed' into.

var replaceFlag = false
figma.parameters.on("input", ({ key, query, result }: ParameterInputEvent) => {

  // The user must make a selection
  const sel: readonly SceneNode[] = figma.currentPage.selection;
  if (sel.length < 1) {
    throw new Error("You need to select at lease one layer.");
  }
  
  switch (key) {
    case "actionChoice":
      
      const actionChoiceOptions = [
        PARAM_REMOVE_ALL_COLORS,
        PARAM_REMOVE_COLOR_STYLES,
        PARAM_REMOVE_COLOR_VARIABLES,
        PARAM_REMOVE_CUSTOM_COLORS,
        PARAM_DETACH_COLOR_STYLES,
        PARAM_DETACH_COLOR_VARIABLES,
        PARAM_REPLACE_ALL_COLORS
      ]
      const actionChoiceSuggestions = actionChoiceOptions.filter((s) => 
        s.toLowerCase().includes(query.toLowerCase())
      )
      result.setSuggestions(actionChoiceSuggestions);
    break

    case "nestedLayerChoice":
      
      // the user must choose if he want's to remove only nested layers
      const nestedLayerChoiceOptions = [
        PARAM_All_LAYERS_TRUE, 
        PARAM_All_LAYERS_FALSE
      ]
      const nestedLayerChoiceSuggestions = nestedLayerChoiceOptions.filter((s) => 
        s.includes(query)
      )
      result.setSuggestions(nestedLayerChoiceSuggestions);
    break


    case "layerName":
      
      const layerNameSuggestions = listExcludableNodes(query);
      result.setSuggestions(layerNameSuggestions);
    break;


    case "preserveChildren":
      const includeChildrenOptions = [
        PARAM_PRESERVE_CHILDREN_TRUE,
        PARAM_PRESERVE_CHILDREN_FALSE,
      ];
      const includeChildrenSuggestions = includeChildrenOptions.filter((s) =>
        s.includes(query)
      );
      result.setSuggestions(includeChildrenSuggestions);
      break;

    default:
      return;
  }
});

function listExcludableNodes(query: string): any {
  
  // users selection
  const sel: readonly SceneNode[] = figma.currentPage.selection;
  // the filter
  const inputfilter = (node: SceneNode) =>
    query.length === 0
      ? true
      : node.name.toLowerCase().startsWith(query.toLowerCase());
  // Set to collect all valid node names
  let namesSet: Set<string> = new Set();
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
    return nodes
      // .filter((node: SceneNode) => supportedNodes(node))
      .filter((node) => node.name != null && inputfilter(node));
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
  try {
    const result = startPluginWithParameters(parameters!, figma.command);
    figma.closePlugin(result);
  } catch (error: any) {
    figma.closePlugin(error.message);
  }
});




let validNodes: SupportedNode[] = [];

// Manages logic depending on user input, returns messages when everything is done
function startPluginWithParameters(parameters: any, command: string): any {
  // Get users selection on the canvas
  const sel: readonly SceneNode[] = figma.currentPage.selection;

  // The user must make a selection
  if (sel.length < 1) {
    throw new Error("👾👾👾 Please make a selection 👾👾👾");
  }

  // Nodes with this string will not be touched
  const preservedNode: string = parameters.layerName
    ? parameters.layerName.toLowerCase()
    : [];

  // if true the children of preservedNode will be preserved
  const preserveChildren: boolean =
    parameters.preserveChildren === PARAM_PRESERVE_CHILDREN_TRUE;

  // setting validNodes
  if (parameters.nestedLayerChoice === PARAM_All_LAYERS_FALSE) {
    sel.forEach((node) => {

      if (
        preservedNode.length === 0
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
    throw new Error("some issue with parameters.nestedLayerChoice");
  }


  switch (parameters.actionChoice) {    
    case(PARAM_REMOVE_COLOR_STYLES):
      validNodes.forEach( node => {
        removeStyleOnNodesFills(node) 
        removeStyleOnNodesStrokes(node)
        removeStyleOnNodesEffects(node)
      })
      return('🫥 All colors styles are removed in your selection')
    break
    case(PARAM_REMOVE_COLOR_VARIABLES):
      validNodes.forEach( node => {
        removeVariablesOnNodesFills(node)
        removeVariablesOnNodesStrokes(node)
        removeVariablesOnNodesEffects(node)
      })
      return('🫥 All colors variables are removed in your selection')
    break
    case(PARAM_REMOVE_CUSTOM_COLORS):
      validNodes.forEach(node => {
        removeCustomColorsOnNodesFills(node)
        removeCustomColorsOnNodesStrokes(node)
        removeCustomColorsOnNodesEffects(node)    
      })
      return('🫥 All custom colors are removed in your selection')
    break
    case(PARAM_REMOVE_ALL_COLORS):
      validNodes.forEach(node => {
        removeAnyColorTypeOnNodesFills(node)
        removeAnyColorTypeOnNodesStrokes(node)
        removeAnyColorTypeOnNodesEffects(node)    
      })
      return('🫥 All colors are removed in your selection')
    break
    case(PARAM_DETACH_COLOR_STYLES):
      validNodes.forEach(node => {
        detachStyleOnNodesFills(node)
        detachStyleOnNodesStrokes(node)
        detachStyleOnNodesEffects(node)
      })
      return('🥳 Detached all color styles in your selection.')
    break
    case(PARAM_DETACH_COLOR_VARIABLES):
      validNodes.forEach(node => {
        detachVariablesOnNodesFills(node)
        detachVariablesOnNodesStrokes(node)
        detachVariablesOnNodesEffects(node)
      })
      return('🥳 Detached all color variables in your selection.')
    break
    case(PARAM_REPLACE_ALL_COLORS):
      validNodes.forEach(node => {  
        replaceAnyColorTypeOnNodesFills(node)
        replaceAnyColorTypeOnNodesStrokes(node)
        removeAnyColorTypeOnNodesEffects(node)
      })
    return("Your colors were replaced.")
    break
    default:
      throw new Error( "Plugin started with unknown parameters: " + JSON.stringify(parameters));
  }
}

/* # # # # # # # # # # # #*/
/* # # # FUNCTIONS # # # #*/
/* # # # # # # # # # # # #*/

function setValidNodesRecursively(
  nodes: SceneNode[] | readonly SceneNode[],
  preservedNode = "",
  preserveChildren = true
) {
  nodes.forEach((node) => {
    const isExcluded =
      preservedNode.length === 0
        ? false
        : node.name.toLowerCase().startsWith(preservedNode);

    if (!isExcluded) {

      if(supportedNodes(node)) validNodes.push(node);
      
      if ("children" in node)
        setValidNodesRecursively(
          node.children,
          preservedNode,
          preserveChildren
        );
    }
    if(isExcluded){
      
      if (!preserveChildren && "children" in node) {
        setValidNodesRecursively(node.children, preservedNode, preserveChildren);
      }
    }
  });
}



function clone(val:any) : any  {
  const type = typeof val
  if (val === null) {
    return null
  } else if (type === 'undefined' || type === 'number' ||
             type === 'string' || type === 'boolean') {
    return val
  } else if (type === 'object') {
    if (val instanceof Array) {
      return val.map(x => clone(x))
    } else if (val instanceof Uint8Array) {
      return new Uint8Array(val)
    } else {
      let o:any = {}
      for (const key in val) {
        o[key] = clone((val)[key])
      }
      return o
    }
  }
  throw 'unknown'
}


// FILLS

function removeStyleOnNodesFills (node:SupportedNode):void {
  if (node.fillStyleId === ""){ return}
  node.fillStyleId = ""
  node.fills = []
}

function detachStyleOnNodesFills (node:SupportedNode):void {
  if (node.fillStyleId === ""){ return }
  node.fillStyleId = ""
}

function replaceStyleOnNodesFills (node:SupportedNode):void {
  if (node.fillStyleId === ""){ return}
  node.fillStyleId = ""
  node.fills = node.type === "TEXT" ? [OPAQUE] : [SEMITRANSPARENT]
}

function removeVariablesOnNodesFills (node:SupportedNode): void {
  if (node.fillStyleId !== ""){return}
  
  // Checking if it's an array
  if (!(node.fills instanceof Array)) {return}
  // Use type assertion to inform TypeScript that node.fills is an array
  var clonedFills = (node.fills as any[]).map(x => clone(x))

  var newfills: any[] = []

  clonedFills.forEach(fill => {
    const hasVariableAlias = fill?.boundVariables?.color?.type === "VARIABLE_ALIAS";
    if (!hasVariableAlias) {
      newfills.push(fill)
    } 
  })
  node.fills = newfills
}

function detachVariablesOnNodesFills (node:SupportedNode): void {
  if (node.fillStyleId !== ""){return}

  // Checking if it's an array
  if (!(node.fills instanceof Array)) {return}
  // Use type assertion to inform TypeScript that node.fills is an array
  var clonedFills = (node.fills as any[]).map(x => clone(x))

  node.fills = clonedFills.map(fill => {
    const hasVariableAlias = fill?.boundVariables?.color?.type === "VARIABLE_ALIAS";
    if (hasVariableAlias) {
      fill.boundVariables = {}
    } 
    return fill
  })
}

function replaceVariablesOnNodesFills (node:SupportedNode): void {
  if (node.fillStyleId !== ""){return}
  
  // Checking if it's an array
  if (!(node.fills instanceof Array)) {return}
  // Use type assertion to inform TypeScript that node.fills is an array
  var clonedFills = (node.fills as any[]).map(x => clone(x))

  var newfills: any[] = []

  clonedFills.forEach(fill => {
    const hasVariableAlias = fill?.boundVariables?.color?.type === "VARIABLE_ALIAS";
    if (!hasVariableAlias) {
      newfills.push(fill)
    } else {
      newfills.push(node.type === "TEXT" ? OPAQUE : SEMITRANSPARENT)
    }
  })
  
  node.fills = newfills
}

function removeCustomColorsOnNodesFills (node:SupportedNode): void {
  if (node.fillStyleId !== ""){return}
  
  // Checking if it's an array
  if (!(node.fills instanceof Array)){return}
  // Use type assertion to inform TypeScript that node.fills is an array
  var clonedFills = (node.fills as any[]).map(x => clone(x))

  var newfills: any[] = []

  clonedFills.forEach(fill => {
    const hasVariableAlias = fill?.boundVariables?.color?.type === "VARIABLE_ALIAS";
    if (hasVariableAlias) {
      return newfills.push(fill)
    } 
  })
  
  node.fills = newfills
}

function removeAnyColorTypeOnNodesFills (node:SupportedNode){
  node.fills = [];
  node.fillStyleId = "";
}

function replaceAnyColorTypeOnNodesFills (node:SupportedNode): void {
  if (!(node.fills instanceof Array && node.fills.length)) {return}
  node.fillStyleId = "";
  node.fills = node.type === "TEXT" ? [OPAQUE] : [SEMITRANSPARENT]
}

// STROKES 

function removeStyleOnNodesStrokes (node:SupportedNode):void {
  // guard
  if (node.type === "SECTION" || node.strokeStyleId === "") return;
  node.strokeStyleId = ""
  node.strokes = []
}

function detachStyleOnNodesStrokes (node:SupportedNode):void {
  // guard
  if (node.type === "SECTION" || node.strokeStyleId === "") return;
  node.strokeStyleId = ""
}

function detachVariablesOnNodesStrokes (node:SupportedNode): void {
  
  // guard
  if (node.type === "SECTION" || node.strokeStyleId !== "") return;

  // Checking if it's an array
  if (!(node.strokes instanceof Array)) {return}

  // Use type assertion to inform TypeScript that node.fills is an array
  var clonedStrokes = (node.strokes as any[]).map(x => clone(x))

  node.strokes = clonedStrokes.map(stroke => {
    
    const hasVariableAlias = stroke?.boundVariables?.color?.type === "VARIABLE_ALIAS";
    if (hasVariableAlias) { 
      stroke.boundVariables = {}
    } 
    return stroke
  })
}

function removeVariablesOnNodesStrokes (node:SupportedNode): void {

  if (node.type === "SECTION" || node.strokeStyleId !== "") return;

  // Checking if it's an array
  if (!(node.strokes instanceof Array)) {return}
  // Use type assertion to inform TypeScript that node.strokes is an array
  var clonedStrokes = (node.strokes as any[]).map(x => clone(x))

  var newstrokes: any[] = []

  clonedStrokes.forEach(stroke => {
    const hasVariableAlias = stroke?.boundVariables?.color?.type === "VARIABLE_ALIAS";
    if (!hasVariableAlias) {
      return newstrokes.push(stroke)
    } 
  })
  
  node.strokes = newstrokes
}

function removeCustomColorsOnNodesStrokes (node:SupportedNode): void {
  if (node.type === "SECTION" || node.strokeStyleId !== "") return;
  // Checking if it's an array
  if (!(node.strokes instanceof Array)){return}
  // Use type assertion to inform TypeScript that node.strokes is an array
  var clonedStrokes = (node.strokes as any[]).map(x => clone(x))

  var newstrokes: any[] = []

  clonedStrokes.forEach(stroke => {
    const hasVariableAlias = stroke?.boundVariables?.color?.type === "VARIABLE_ALIAS";
    if (hasVariableAlias) {
      return newstrokes.push(stroke)
    } 
  })
  
  node.strokes = newstrokes
}

function removeAnyColorTypeOnNodesStrokes (node:SupportedNode){
  // guard
  if (node.type === "SECTION") return;

  node.strokes = [];
  node.strokeStyleId = "";
}

function replaceAnyColorTypeOnNodesStrokes (node:SupportedNode): void {
  // guard
  if (node.type === "SECTION") return;
  if (!(node.strokes instanceof Array && node.strokes.length)) {return}

  node.strokeStyleId = "";
  node.strokes = [OPAQUE]
}

// EFFECTS

function removeStyleOnNodesEffects (node:SupportedNode):void {
  // guard
  if (node.type === "SECTION" || node.type === "SHAPE_WITH_TEXT") return;
  if (node.effectStyleId === ""){return}

  node.effectStyleId = ""
  node.effects = []
}

function detachStyleOnNodesEffects (node:SupportedNode):void {
  // guard
  if (node.type === "SECTION" || node.type === "SHAPE_WITH_TEXT") return;
  if (node.effectStyleId === ""){return}

  node.effectStyleId = ""
}

function detachVariablesOnNodesEffects (node:SupportedNode): void {
  // guard
  if (node.type === "SECTION" || node.type === "SHAPE_WITH_TEXT") return;
  if (node.effectStyleId !== ""){return}
  
  // Checking if it's an array
  if (!(node.effects instanceof Array)) {return}

  // Use type assertion to inform TypeScript that node.fills is an array
  var clonedEffects = (node.effects as any[]).map(x => clone(x))

  node.effects = clonedEffects.map(effect => {
    
    const hasVariableAlias = effect?.boundVariables?.color?.type === "VARIABLE_ALIAS";
    if (hasVariableAlias) {
      effect.setBoundVariableForEffect(null)
      effect.boundVariables = {}
    } 
    return effect
  })
}

function removeVariablesOnNodesEffects (node:SupportedNode): void {
  // guard
  if (node.type === "SECTION" || node.type === "SHAPE_WITH_TEXT") return;
  
  if (node.effectStyleId !== ""){return}
  
  // Checking if it's an array
  if (!(node.effects instanceof Array)) {return}
  // Use type assertion to inform TypeScript that node.effects is an array
  var clonedEffects = (node.effects as any[]).map(x => clone(x))

  var neweffects: any[] = []

  clonedEffects.forEach(effect => {
    const hasVariableAlias = effect?.boundVariables?.color?.type === "VARIABLE_ALIAS";
    if (!hasVariableAlias) {
      return neweffects.push(effect)
    } 
  })
  
  node.effects = neweffects
}

function removeCustomColorsOnNodesEffects (node:SupportedNode): void {
  // guard
  if (node.type === "SECTION" || node.type === "SHAPE_WITH_TEXT") return;

  if (node.effectStyleId !== ""){return}
  
  // Checking if it's an array
  if (!(node.effects instanceof Array)){return}
  // Use type assertion to inform TypeScript that node.effects is an array
  var clonedEffects = (node.effects as any[]).map(x => clone(x))

  var neweffects: any[] = []

  clonedEffects.forEach(effect => {
    const hasVariableAlias = effect?.boundVariables?.color?.type === "VARIABLE_ALIAS";
    if (hasVariableAlias) {
      return neweffects.push(effect)
    } 
  })
  
  node.effects = neweffects
}

function removeAnyColorTypeOnNodesEffects (node:SupportedNode){
  // guard
  if (node.type === "SECTION" || node.type === "SHAPE_WITH_TEXT") return;

  node.effects = [];
  node.effectStyleId = "";
}


/*
These funcs all work, but did not render userful

function replaceCustomColorsOnNodesFills (node:SupportedNode): void {
  if (node.fillStyleId !== ""){
    
    return
  }

  
  // Checking if it's an array
  if (!(node.fills instanceof Array)){return}
  // Use type assertion to inform TypeScript that node.fills is an array
  var clonedFills = (node.fills as any[]).map(x => clone(x))

  var newfills: any[] = []

  clonedFills.forEach(fill => {
    const hasVariableAlias = fill?.boundVariables?.color?.type === "VARIABLE_ALIAS";
    if (hasVariableAlias) {
      return newfills.push(fill)
    } else {
      newfills.push(node.type === "TEXT" ? OPAQUE : SEMITRANSPARENT)
    }
  })
  
  node.fills = newfills
}


function replaceStyleOnNodesStrokes (node:SupportedNode):void {
  // guard
  if (node.type === "SECTION") return;

  if (node.strokeStyleId === ""){
    
    return
  }

  
  
  node.strokeStyleId = ""
  
  node.strokes = [OPAQUE]
}

function replaceVariablesOnNodesStrokes (node:SupportedNode): void {
  // guard
  if (node.type === "SECTION") return;

  if (node.strokeStyleId !== ""){
    
    return
  }

  
  // Checking if it's an array
  if (!(node.strokes instanceof Array)) {return}
  // Use type assertion to inform TypeScript that node.strokes is an array
  var clonedStrokes = (node.strokes as any[]).map(x => clone(x))

  var newstrokes: any[] = []

  clonedStrokes.forEach(stroke => {
    const hasVariableAlias = stroke?.boundVariables?.color?.type === "VARIABLE_ALIAS";
    if (!hasVariableAlias) {
      newstrokes.push(stroke)
    } else {
      newstrokes.push(OPAQUE)
    }
  })
  
  node.strokes = newstrokes
}

function replaceCustomColorsOnNodesStrokes (node:SupportedNode): void {
  // guard
  if (node.type === "SECTION") return;

  if (node.strokeStyleId !== ""){
    
    return
  }

  
  // Checking if it's an array
  if (!(node.strokes instanceof Array)) {return}
  // Use type assertion to inform TypeScript that node.strokes is an array
  var clonedStrokes = (node.strokes as any[]).map(x => clone(x))

  var newstrokes: any[] = []

  clonedStrokes.forEach(stroke => {
    const hasVariableAlias = stroke?.boundVariables?.color?.type === "VARIABLE_ALIAS";
    if (hasVariableAlias) {
      newstrokes.push(stroke)
    } else {
      newstrokes.push(OPAQUE)
    }
  })
  
  node.strokes = newstrokes
}
*/