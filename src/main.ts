
// The 'input' event listens for text change in the Quick Actions box after a plugin is 'Tabbed' into.
figma.parameters.on('input', ({ key, query, result }) => {
	switch (key) {
		case 'choice':
			// the user must choose if he want's to remove only nested layers
			const choices = ["All layers in selection", "Only nested layers in selection"]
			const suggestions = choices.filter(s => s.includes(query));
			result.setSuggestions(suggestions);
		break;

		case 'name':
			// providing the option to preserve styles on named layers

			const sel = figma.currentPage.selection;

			const customfilter = (node: SceneNode) => node.name.toLowerCase().startsWith(query.toLowerCase());

			let nodes: SceneNode[] = query.length > 0 ? sel.flatMap(node => getAllNestedNodes(node).concat(node))
				.filter(node => node.name != null && customfilter(node)) : [];

			// filter out SceneNodes with duplicate names
			nodes = nodes.filter((value, index, self) =>
				index === self.findIndex((t) => (
				  t.name === value.name
				))
			)

			const formattedNodes = nodes.map((node:any) => {
				const name = node.name;
				return ({ name, data:  node.name} );
			});

			const namesuggestions = [...formattedNodes];
			result.setSuggestions(namesuggestions);
		break;
		default:
			return;
	}
});


const CMD_REMOVE_STYLES = 'removeStyles';
const CMD_REPLACE_STYLES = 'replaceStyles';

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

function supportedNodes(node: SceneNode):
  node is SupportedNode
{
  return node.type === 'BOOLEAN_OPERATION' ||
  node.type === 'COMPONENT' ||
  node.type === 'COMPONENT_SET' ||
  node.type === 'ELLIPSE' ||
  node.type === 'FRAME' || 
  node.type === 'INSTANCE' ||
  node.type === 'LINE' ||
  node.type === 'POLYGON' ||
  node.type === 'RECTANGLE' ||
  node.type === 'SECTION' ||
  node.type === 'STAR' ||
  node.type === 'TEXT' ||
  node.type === 'VECTOR' ||
  node.type === 'SHAPE_WITH_TEXT'
}


// When the user presses Enter after inputting all parameters, the 'run' event is fired.
figma.on('run', ({ parameters }) => {
	try {
		const result = startPluginWithParameters(parameters!, figma.command);
		figma.closePlugin(result);
	} catch (error:any) {
		console.error(`${error.name} ${error.message}`)
		figma.closePlugin(error.message)
	}
	
});
  


function startPluginWithParameters(parameters: any, command: string): string {

	// Get users selection on the canvas
	const sel : readonly SceneNode[] = figma.currentPage.selection;
	
	// The user must make a selection
	if(sel.length < 1){
		throw new Error('👾👾👾 Please make a selection 👾👾👾')
	}

	// Nodes with this string will not be touched
	const excludedNode: string = parameters.name ? parameters.name.toLowerCase() : [];

		
	// Collect all valid child nodes in 'nodes' array
	let nodes: SupportedNode[] = sel.flatMap(node => getAllValidNestedNodes(node, excludedNode))
	console.log(nodes)
	// If the user choose to remove styles from any layer, add valid selected nodes to 'nodes' array
	if(parameters.choice === "All layers in selection"){
	console.log('want to remove style from all layers')
		const filteredSel: SupportedNode[] = sel.filter( (node: SceneNode) : boolean => {
			if(!supportedNodes(node)) return false
			return excludedNode.length === 0 ? true : !node.name.toLowerCase().startsWith(excludedNode)
			// return supportedNodes(node) ? !node.name.toLowerCase().startsWith(excludedNode) : false;
			}) as SupportedNode[];

		filteredSel.forEach(node => nodes.push(node))
	}
	console.log(nodes)

	// Depending on the menue command we proceed with removing or replacing styles on all collected nodes
	switch (command) {
		case CMD_REMOVE_STYLES:
			nodes.forEach(removeStyle)
			return "👻 Styles removed"
		case CMD_REPLACE_STYLES:
			nodes.forEach(replaceStyle)		
			return "✨ Layers got a new paintjob"
		default:
			throw new Error('Plugin started with unknown command: ' + JSON.stringify(command))
	}
}


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

function getAllNestedNodes (sel : SceneNode, excludedNode: string = ""): SceneNode[]
{
	const filter = (node: any) => !node.name.toLowerCase().startsWith(excludedNode);
	const nodes  = ('children' in sel) ? (sel.findAll( (node: SceneNode) => excludedNode.length === 0 ? true : filter(node))) : [];
	return nodes;	
};




// need to switch to supportedNode
function replaceStyle(elem: SupportedNode)
{
	console.log('replaceStyles')

	// replace fills
	if ( elem.fills === figma.mixed || elem.fills.length ){
		elem.fills = elem.type === 'TEXT' ? OPAQUE : SEMITRANSPARENT;
		elem.fillStyleId = "";
	}
	// replace strokes
	if (  elem.type !== 'SECTION' && elem.strokes.length > 0 ){
		elem.strokes = OPAQUE;
		elem.strokeStyleId = "";
	}
	// remove effects
	if ( elem.type !== 'SECTION' && elem.type !== 'SHAPE_WITH_TEXT' && elem.effects != undefined ){
		elem.effects = [];
		elem.effectStyleId = "";
	}
}


function removeStyle(elem: SupportedNode)
{
	console.log("rmv")

	// remove fills	
	if(elem.fills != undefined ){
		elem.fills = [];
		elem.fillStyleId = "";
	}

	// remove strokes
	if(elem.type !== 'SECTION' && elem.strokes != undefined ){
		elem.strokes = [];
		elem.strokeStyleId = "";
	}

	// remove effects
	if(elem.type !== 'SECTION' && elem.type !== 'SHAPE_WITH_TEXT' && elem.effects != undefined) {
		elem.effects = [];
		elem.effectStyleId = "";
	}
}
