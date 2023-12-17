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
// Parameter Suggestions
const PARAM_All_LAYERS_TRUE = "All layers in selection";
const PARAM_All_LAYERS_FALSE = "Only nested layers in selection";
const PARAM_PRESERVE_CHILDREN_TRUE = "Also preserve children of named layer(s)";
const PARAM_PRESERVE_CHILDREN_FALSE = "Preserve only named layer(s)";

// Colors
const OPAQUE: Paint[] = [
  {
    type: "SOLID",
    visible: true,
    opacity: 1.0,
    blendMode: "NORMAL",
    color: {
      r: 1.0,
      g: 0.0,
      b: 0.431,
    },
  },
];
const SEMITRANSPARENT: Paint[] = [
  {
    type: "SOLID",
    visible: true,
    opacity: 0.1,
    blendMode: "NORMAL",
    color: {
      r: 1.0,
      g: 0.0,
      b: 0.431,
    },
  },
];

/* # # # # # # # # # # # #*/
/* # # # CONTROLERS # # # */
/* # # # # # # # # # # # #*/

// The 'input' event listens for text change in the Quick Actions box after a plugin is 'Tabbed' into.

figma.parameters.on("input", ({ key, query, result }: ParameterInputEvent) => {
  switch (key) {
    case "choice":
      // the user must choose if he want's to remove only nested layers
      const choiceOptions = [
        PARAM_All_LAYERS_TRUE, 
        PARAM_All_LAYERS_FALSE
      ];
      const choiceSuggestions = choiceOptions.filter((s) => s.includes(query));
      result.setSuggestions(choiceSuggestions);
      break;

    case "name":
      const nameSuggestions = listExcludableNodes(query);
      result.setSuggestions(nameSuggestions);
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
function startPluginWithParameters(parameters: any, command: string): string {
  // Get users selection on the canvas
  const sel: readonly SceneNode[] = figma.currentPage.selection;

  // The user must make a selection
  if (sel.length < 1) {
    throw new Error("👾👾👾 Please make a selection 👾👾👾");
  }

  // Nodes with this string will not be touched
  const preservedNode: string = parameters.name
    ? parameters.name.toLowerCase()
    : [];

  // if true the children of preservedNode will be preserved
  const preserveChildren: boolean =
    parameters.preserveChildren === PARAM_PRESERVE_CHILDREN_TRUE;

  // setting validNodes
  if (parameters.choice === PARAM_All_LAYERS_FALSE) {
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
  } else if (parameters.choice === PARAM_All_LAYERS_TRUE) {
    console.log('all layers true')
    setValidNodesRecursively(sel, preservedNode, preserveChildren);
  } else {
    throw new Error("some issue with parameters.choice");
  }


  // getting validNodes
  // const nodes = validNodes as SupportedNode[];

  // Depending on the menue command we proceed with removing or replacing styles on all collected nodes
  switch (command) {
    case CMD_REMOVE_STYLES:
      validNodes.forEach(removeStyle);
      return "👻 Styles removed";
    case CMD_REPLACE_STYLES:
      validNodes.forEach(replaceStyle);
      return "✨ Styles replaced";
    default:
      throw new Error(
        "Plugin started with unknown command: " + JSON.stringify(command)
      );
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
    
    console.log(node.name)

    if (!isExcluded) {
      console.log('is not excluded')

      if(supportedNodes(node)) validNodes.push(node);
      
      if ("children" in node)
        setValidNodesRecursively(
          node.children,
          preservedNode,
          preserveChildren
        );
    }
    if(isExcluded){
      console.log('is excluded')
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

function removeFillStyle (node:SupportedNode):void {
  if (node.fillStyleId === ""){
    console.log('this node has no fill style')
    return
  }

  console.log('This node contains a fill style')
  console.log('detaching style')
  node.fillStyleId = ""
  console.log('removing all fills')
  node.fills = []
}

function detachFillStyle (node:SupportedNode):void {
  if (node.fillStyleId === ""){
    console.log('this node has no fill style')
    return
  }

  console.log('This node contains a fill style')
  console.log('detaching style')
  node.fillStyleId = ""
}

function detachFillVariables (node:SupportedNode): void {
  if (node.fillStyleId !== ""){
    console.log('this node has a style applied. I will not touch it')
    return
  }

  console.log('will check for variables')
  // Checking if it's an array
  if (!(node.fills instanceof Array)) {return}
  // Use type assertion to inform TypeScript that node.fills is an array
  var clonedFills = (node.fills as any[]).map(x => clone(x))

  node.fills = clonedFills.map(fill => {
    const hasVariableAlias = fill?.boundVariables?.color?.type === "VARIABLE_ALIAS";
    if (hasVariableAlias) {
      console.log('this is a fill with a bound variable');
      console.log('detaching now')
      fill.boundVariables = {}
    } 
    return fill
  })
}

function removeFillVariables (node:SupportedNode): void {
  if (node.fillStyleId !== ""){
    console.log('this node has a style applied. I will not touch it')
    return
  }

  console.log('will check for variables')
  // Checking if it's an array
  if (!(node.fills instanceof Array)) {return}
  // Use type assertion to inform TypeScript that node.fills is an array
  var clonedFills = (node.fills as any[]).map(x => clone(x))

  var newfills: any[] = []

  clonedFills.forEach(fill => {
    const hasVariableAlias = fill?.boundVariables?.color?.type === "VARIABLE_ALIAS";
    if (!hasVariableAlias) {
      return newfills.push(fill)
    } 
  })
  console.log (newfills)
  node.fills = newfills
}

function removeCustomFills (node:SupportedNode): void {
  if (node.fillStyleId !== ""){
    console.log('this node has a style applied. I will not touch it')
    return
  }

  console.log('will check for variables')
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
  console.log (newfills)
  node.fills = newfills
}

function removeAnyFill (node:SupportedNode){
  node.fills = [];
  node.fillStyleId = "";
}
// STROKES 

function removeStrokeStyle (node:SupportedNode):void {
  // guard
  if (node.type === "SECTION") return;

  if (node.strokeStyleId === ""){
    console.log('this node has no stroke style')
    return
  }

  console.log('This node contains a stroke style')
  console.log('detaching stroke style')
  node.strokeStyleId = ""
  console.log('removing all strokes')
  node.strokes = []
}

function detachStrokeStyle (node:SupportedNode):void {
  // guard
  if (node.type === "SECTION") return;

  if (node.strokeStyleId === ""){
    console.log('this node has no stroke style')
    return
  }

  console.log('This node contains a stroke style')
  console.log('detaching stroke style')
  node.strokeStyleId = ""
}

function detachStrokeVariables (node:SupportedNode): void {
  
  // guard
  if (node.type === "SECTION") return;

  if (node.strokeStyleId !== ""){
    console.log('this node has a stroke style applied. I will not touch it')
    return
  }

  console.log('will check for variables')
  // Checking if it's an array
  if (!(node.strokes instanceof Array)) {return}

  // Use type assertion to inform TypeScript that node.fills is an array
  var clonedStrokes = (node.strokes as any[]).map(x => clone(x))
  console.log(clonedStrokes)

  node.strokes = clonedStrokes.map(stroke => {
    console.log(stroke)
    const hasVariableAlias = stroke?.boundVariables?.color?.type === "VARIABLE_ALIAS";
    if (hasVariableAlias) {
      console.log('this is a stroke with a bound variable');
      console.log('detaching now')
      stroke.boundVariables = {}
    } 
    return stroke
  })
}

function removeStrokeVariables (node:SupportedNode): void {

  // guard
  if (node.type === "SECTION") return;
  
  if (node.strokeStyleId !== ""){
    console.log('this node has a stroke style applied. I will not touch it')
    return
  }

  console.log('will check for variables')
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
  console.log (newstrokes)
  node.strokes = newstrokes
}

function removeCustomStrokes (node:SupportedNode): void {

  // guard
  if (node.type === "SECTION") return;

  if (node.strokeStyleId !== ""){
    console.log('this node has a style applied. I will not touch it')
    return
  }

  console.log('will check for variables')
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
  console.log (newstrokes)
  node.strokes = newstrokes
}

function removeAnyStoke (node:SupportedNode){
  // guard
  if (node.type === "SECTION") return;

  node.strokes = [];
  node.strokeStyleId = "";
}

// EFFECTS

function removeEffectStyle (node:SupportedNode):void {
  // guard
  if (node.type === "SECTION" || node.type === "SHAPE_WITH_TEXT") return;


  if (node.effectStyleId === ""){
    console.log('this node has no effect style')
    return
  }

  console.log('This node contains a effect style')
  console.log('detaching effect style')
  node.effectStyleId = ""
  console.log('removing all effects')
  node.effects = []
}

function detachEffectStyle (node:SupportedNode):void {
  // guard
  if (node.type === "SECTION" || node.type === "SHAPE_WITH_TEXT") return;

  if (node.effectStyleId === ""){
    console.log('this node has no effect style')
    return
  }

  console.log('This node contains a effect style')
  console.log('detaching effect style')
  node.effectStyleId = ""
}

function detachEffectVariables (node:SupportedNode): void {
  // guard
  if (node.type === "SECTION" || node.type === "SHAPE_WITH_TEXT") return;

  if (node.effectStyleId !== ""){
    console.log('this node has a effect style applied. I will not touch it')
    return
  }

  console.log('will check for variables')
  // Checking if it's an array
  if (!(node.effects instanceof Array)) {return}

  // Use type assertion to inform TypeScript that node.fills is an array
  var clonedEffects = (node.effects as any[]).map(x => clone(x))
  console.log(clonedEffects)

  node.effects = clonedEffects.map(effect => {
    console.log(effect)
    const hasVariableAlias = effect?.boundVariables?.color?.type === "VARIABLE_ALIAS";
    if (hasVariableAlias) {
      console.log('this is a effect with a bound variable');
      console.log('detaching now')
      effect.boundVariables = {}
    } 
    return effect
  })
}

function removeEffectVariables (node:SupportedNode): void {
  // guard
  if (node.type === "SECTION" || node.type === "SHAPE_WITH_TEXT") return;
  
  if (node.effectStyleId !== ""){
    console.log('this node has a effect style applied. I will not touch it')
    return
  }

  console.log('will check for variables')
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
  console.log (neweffects)
  node.effects = neweffects
}

function removeCustomEffects (node:SupportedNode): void {
  // guard
  if (node.type === "SECTION" || node.type === "SHAPE_WITH_TEXT") return;

  if (node.effectStyleId !== ""){
    console.log('this node has a style applied. I will not touch it')
    return
  }

  console.log('will check for variables')
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
  console.log (neweffects)
  node.effects = neweffects
}

function removeAnyEffect (node:SupportedNode){
  // guard
  if (node.type === "SECTION" || node.type === "SHAPE_WITH_TEXT") return;

  node.effects = [];
  node.effectStyleId = "";
}



// Removes fills, effects and strokes of single node
function removeStyle(node: SupportedNode) {
  //removeCustomFills(node)
  removeAnyEffect(node)

}

// Replaces fills and strokes of single node with predefined colors SEMITRANSPARENT / OPAQUE
function replaceStyle(elem: SupportedNode) {
  // replace fills
  if (elem.fills === figma.mixed || elem.fills.length) {
    elem.fills = elem.type === "TEXT" ? OPAQUE : SEMITRANSPARENT;
    elem.fillStyleId = "";
  }

  // guard
  if (elem.type === "SECTION") return;

  // replace strokes
  if (elem.strokes.length > 0) {
    elem.strokes = OPAQUE;
    elem.strokeStyleId = "";
  }

  // guard
  if (elem.type === "SHAPE_WITH_TEXT") return;

  // remove effects
  if (elem.effects != undefined) {
    elem.effects = [];
    elem.effectStyleId = "";
  }
}