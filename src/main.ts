
// Type handling
// Supported Nodes include any Figma relevant node which supports strokes, fill or effects
// SectionNodes seem to be a bit special, currently they seem not to support stokes

type SupportedNode = 
BooleanOperationNode |
ComponentNode |
ComponentSetNode |
EllipseNode |
FrameNode |
InstanceNode |
LineNode |
PolygonNode |
RectangleNode |
SectionNode |
StarNode |
TextNode | 
VectorNode |
ShapeWithTextNode;

const SUPPORTED_TYPES : NodeType[] = [
'BOOLEAN_OPERATION', 
'COMPONENT', 
'COMPONENT_SET', 
'ELLIPSE', 
'FRAME', 
'INSTANCE', 
'LINE', 
'POLYGON', 
'RECTANGLE',
'SECTION',
'STAR', 
'TEXT', 
'VECTOR',
'SHAPE_WITH_TEXT'
];

function supportedNodes(node: SceneNode): node is SupportedNode {
	return SUPPORTED_TYPES.includes(node.type);
}

// Menu Commands
const CMD_REMOVE_STYLES = 'removeStyles';
const CMD_REPLACE_STYLES = 'replaceStyles';

// Colors
const OPAQUE: Paint[] = [{
    "type": 'SOLID',
    "visible": true,
    "opacity": 1.0,
    "blendMode": 'NORMAL',
    "color": {
      "r": 1.0,
      "g": 0.0,
      "b": 0.431
    }
}]
const SEMITRANSPARENT: Paint[] = [{
    "type": 'SOLID',
    "visible": true,
    "opacity": 0.10,
    "blendMode": 'NORMAL',
    "color": {
		"r": 1.0,
		"g": 0.0,
		"b": 0.431
    }
}]


/* # # # # # # # # # # # #*/
/* # # # CONTROLERS # # # */
/* # # # # # # # # # # # #*/


// The 'input' event listens for text change in the Quick Actions box after a plugin is 'Tabbed' into.

figma.parameters.on(
	'input', 
	({ key, query, result }: ParameterInputEvent) => {
		console.clear();
		switch (key) {
			case 'choice':
				// the user must choose if he want's to remove only nested layers
				const choiceOptions = ["All layers in selection", "Only nested layers in selection"]
				const choiceSuggestions = choiceOptions.filter(s => s.includes(query));
				result.setSuggestions(choiceSuggestions);
			break;

			case 'name':
				const nameSuggestions = listExcludableNodes(query);
				result.setSuggestions(nameSuggestions);			
			break;

			case 'settings_excludeChildren':
				const includeChildrenOptions = ["Exclude only named layer(s)", "Also exclude children of named layer(s)"]
				const includeChildrenSuggestions = includeChildrenOptions.filter(s => s.includes(query));
				result.setSuggestions(includeChildrenSuggestions);	
			break;

			default:
			return;
		}
});

function listExcludableNodes(query: string): any {

	// users selection
	const sel : readonly SceneNode[] = figma.currentPage.selection;	
	// the filter
	const inputfilter = (node: SceneNode) =>  query.length === 0 ? true : node.name.toLowerCase().startsWith(query.toLowerCase());
	// Set to collect all valid node names
	let namesSet: Set<string> = new Set()
	// Worker function to get all supported child nodes
	const filteredChildNodes = (node : SceneNode) : SceneNode[] =>
	{
		return ('children' in node) ? 
			node.findAll( (child:SceneNode) : boolean => {
				// If node is not of supported type eg:(SLICE), it will not be added
				if(!supportedNodes(child)) return false
				// Only nodes with names matching the user input
				return child.name != null && inputfilter(child);
			}) : [];
	}
	// Worker function to get all supported nodes in selection
	const filteredSelection = (nodes: readonly SceneNode[]) : SceneNode [] => 
	{
		return nodes.filter( (node: SceneNode) => 
			supportedNodes(node)).
			filter(node => node.name != null && inputfilter(node))
	}

	// add names of valid child nodes to namesSet
	sel.flatMap((selectedNode) => filteredChildNodes(selectedNode).forEach(node => {namesSet.add(node.name)}));
	// add names of valid selected nodes to namesSet
	filteredSelection(sel).forEach((node: SceneNode) => namesSet.add(node.name))
	
	// create an array from namesSet
	const formattedNodes = Array.from(namesSet, (name) => ({ name, data: name }));
	const namesuggestions = [...formattedNodes];
	return namesuggestions
}


// When the user presses Enter after inputting all parameters, the 'run' event is fired.
figma.on('run', ({ parameters }) => {
	console.log(parameters)
	try {
		const result = startPluginWithParameters(parameters!, figma.command);
		figma.closePlugin(result);
	} catch (error:any) {
		console.error(`${error.name} ${error.message}`)
		figma.closePlugin(error.message)
	}
});
  
let validNodes: SupportedNode[] = []
// Manages logic depending on user input, returns messages when everything is done
function startPluginWithParameters(parameters: any, command: string): string {

	// Get users selection on the canvas
	const sel : readonly SceneNode[] = figma.currentPage.selection;
	
	// The user must make a selection
	if(sel.length < 1){
		throw new Error('👾👾👾 Please make a selection 👾👾👾')
	}

	// Nodes with this string will not be touched
	const excludedNode: string = parameters.name ? parameters.name.toLowerCase() : [];

	// setting validNodes
	if(parameters.choice === "Only nested layers in selection"){
		
		sel.forEach( node => {
			if(!supportedNodes(node)) return;
	
			if(excludedNode.length === 0 ? true : !node.name.toLowerCase().startsWith(excludedNode)){
				if('children' in node && node.children.length > 0){
					const children = node.children
					setValidNodesRecursivly(children, excludedNode)
				}
			}
		})

	} else if (parameters.choice === "All layers in selection"){
		setValidNodesRecursivly(sel, excludedNode)
	} else {
		throw new Error('some issue with parameters.choice')
	}
	
	// getting validNodes
	const nodes = validNodes as SupportedNode[];
	
	// console.log(nodes)
	// Collect all valid child nodes in 'nodes' array
	// let nodes: SupportedNode[] = sel.flatMap(node => getAllValidNestedNodes(node, excludedNode))
	
	// // If the user choose to remove styles from any layer, add valid selected nodes to 'nodes' array
	// if(parameters.choice === "All layers in selection"){
	
	// 	const filteredSel: SupportedNode[] = sel.filter( (node: SceneNode) : boolean => {
	// 		if(!supportedNodes(node)) return false
	// 		return excludedNode.length === 0 ? true : !node.name.toLowerCase().startsWith(excludedNode)
	// 		}) as SupportedNode[];

	// 	filteredSel.forEach(node => nodes.push(node))
	// }

	// Depending on the menue command we proceed with removing or replacing styles on all collected nodes
	switch (command) {
		case CMD_REMOVE_STYLES:
			nodes.forEach(removeStyle)
			return "👻 Styles removed"
		case CMD_REPLACE_STYLES:
			nodes.forEach(replaceStyle)		
			return "✨ Styles replaced"
		default:
			throw new Error('Plugin started with unknown command: ' + JSON.stringify(command))
	}
}

/* # # # # # # # # # # # #*/
/* # # # FUNCTIONS # # # #*/
/* # # # # # # # # # # # #*/


function setValidNodesRecursivelyXX(nodes: SceneNode[] | readonly SceneNode[], excludedNode: string = "", excludeChildren = false) {
	nodes.forEach(node => {
	  if ('children' in node && node.children.length > 0 && !excludeChildren) {
		setValidNodesRecursivelyXX(node.children, excludedNode, excludeChildren);
	  }
	  if (excludedNode.length !== 0 && node.name.toLowerCase().startsWith(excludedNode) || !supportedNodes(node)) {
		return;
	  } else {
		validNodes.push(node);
	  }
	});
  }

  


function setValidNodesRecursivly (nodes : SceneNode[] | readonly SceneNode[], excludedNode: string = "", excludeChildren = false)
{
	
	nodes.forEach( node => {
		
		if(excludedNode.length === 0 ? true : !node.name.toLowerCase().startsWith(excludedNode)){
			if( 'children' in node && node.children.length > 0){
				const children = node.children
				setValidNodesRecursivly(children, excludedNode)
			}
			if(!supportedNodes(node)) return;
			validNodes.push(node)
		}
	})
}

// Returns childnodes of any node passed in to it. Children get filtered by type and name
function getAllValidNestedNodes (sel : SceneNode, excludedNode: string = ""): SupportedNode[]
{
	return ('children' in sel) ? 
		sel.findAll( (node:SceneNode) : boolean => {
			// If node is not of supported type eg:(SLICE), it will not be added
			if(!supportedNodes(node)) return false
			// Excluding nodes with names matching the user input
			return excludedNode.length === 0 ? true : !node.name.toLowerCase().startsWith(excludedNode)
		}) as SupportedNode[] : [];
}

// Replaces fills and strokes of single node with prediefined colors SEMITRANSPARENT / OPAQUE
function replaceStyle(elem: SupportedNode)
{

	// replace fills
	if ( elem.fills === figma.mixed || elem.fills.length ){
		elem.fills = elem.type === 'TEXT' ? OPAQUE : SEMITRANSPARENT;
		elem.fillStyleId = "";
	}

	// guard
	if (elem.type === 'SECTION') return;

	// replace strokes
	if (elem.strokes.length > 0 ){
		elem.strokes = OPAQUE;
		elem.strokeStyleId = "";
	}

	// guard
	if (elem.type === 'SHAPE_WITH_TEXT') return;

	// remove effects
	if (elem.effects != undefined ){
		elem.effects = [];
		elem.effectStyleId = "";
	}
}


// Removes fills, effects and strokes of single node
function removeStyle(elem: SupportedNode)
{
	// remove fills	
	if(elem.fills != undefined ){
		elem.fills = [];
		elem.fillStyleId = "";
	}

	// guard
	if (elem.type === 'SECTION') return; 

	// remove strokes
	if(elem.strokes !== undefined ){
		elem.strokes = [];
		elem.strokeStyleId = "";
	}
	
	// guard
	if (elem.type === 'SHAPE_WITH_TEXT') return; 

	// remove effects
	if(elem.effects !== undefined) {
		elem.effects = [];
		elem.effectStyleId = "";
	}
}
