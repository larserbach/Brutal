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
      const choiceOptions = [PARAM_All_LAYERS_TRUE, PARAM_All_LAYERS_FALSE];
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
      .filter((node: SceneNode) => supportedNodes(node))
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
    console.error(`${error.name} ${error.message}`);
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
      if (!supportedNodes(node)) return;

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
    setValidNodesRecursively(sel, preservedNode, preserveChildren);
  } else {
    throw new Error("some issue with parameters.choice");
  }

  // getting validNodes
  const nodes = validNodes as SupportedNode[];

  // Depending on the menue command we proceed with removing or replacing styles on all collected nodes
  switch (command) {
    case CMD_REMOVE_STYLES:
      nodes.forEach(removeStyle);
      return "👻 Styles removed";
    case CMD_REPLACE_STYLES:
      nodes.forEach(replaceStyle);
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

    if (!isExcluded && supportedNodes(node)) {
      validNodes.push(node);
      if ("children" in node)
        setValidNodesRecursively(
          node.children,
          preservedNode,
          preserveChildren
        );
    } else if (isExcluded && !preserveChildren && "children" in node) {
      setValidNodesRecursively(node.children, preservedNode, preserveChildren);
    }
  });
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

// Removes fills, effects and strokes of single node
function removeStyle(elem: SupportedNode) {
  // remove fills
  if (elem.fills != undefined) {
    elem.fills = [];
    elem.fillStyleId = "";
  }

  // guard
  if (elem.type === "SECTION") return;

  // remove strokes
  if (elem.strokes !== undefined) {
    elem.strokes = [];
    elem.strokeStyleId = "";
  }

  // guard
  if (elem.type === "SHAPE_WITH_TEXT") return;

  // remove effects
  if (elem.effects !== undefined) {
    elem.effects = [];
    elem.effectStyleId = "";
  }
}
