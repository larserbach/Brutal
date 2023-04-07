
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

	const sel = figma.currentPage.selection;
	// the user must make a selection
	if(sel.length < 1){
		throw new Error('👾👾👾 Please make a selection 👾👾👾')
	}
	
	const excludedNode: string = parameters.name ? parameters.name.toLowerCase() : [];

	// get all child nodes of the selection, except those matching the second user input
	let nodes: SceneNode[] = sel.flatMap(node => getAllNestedNodes(node, excludedNode))

	// if the user choose to remove styles from any layer
	if(parameters.choice === "All layers in selection"){
		const customfilter = (node: any) => !node.name.toLowerCase().startsWith(excludedNode);
		const filteredSel  = sel.filter( (node: SceneNode) => excludedNode.length === 0 ? true : customfilter(node));
		filteredSel.forEach(node => nodes.push(node))
	}

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


function getAllNestedNodes (sel : SceneNode, excludedNode: string = ""): SceneNode[]
{
	const filter = (node: any) => !node.name.toLowerCase().startsWith(excludedNode);
	const nodes  = ('children' in sel) ? (sel.findAll( (node: SceneNode) => excludedNode.length === 0 ? true : filter(node))) : [];
	return nodes;	
};

function supportsFillsAndStrokesAndEffects(node: SceneNode):
  node is BooleanOperationNode | 
  ComponentNode | 
  ComponentSetNode | 
  EllipseNode | 
  FrameNode | 
  InstanceNode | 
  LineNode | 
  PolygonNode | 
  RectangleNode |
  StarNode |
  TextNode |
  VectorNode
  //   ShapeWithTextNode | 
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
  node.type === 'STAR' ||
  node.type === 'TEXT' ||
  node.type === 'VECTOR'
//   node.type === 'SHAPE_WITH_TEXT' || 
}




function replaceStyle(elem: SceneNode){
	console.log('replaceStyles')

	if( !supportsFillsAndStrokesAndEffects(elem) ) return;
	
	
	console.log('is supported')
	// replace fills
	if ( elem.fills === figma.mixed ){
		elem.fills = elem.type === 'TEXT' ? OPAQUE : SEMITRANSPARENT;
		elem.fillStyleId = "";
	} else if ( elem.fills.length > 0 ){
		elem.fills  = elem.type === 'TEXT' ? OPAQUE : SEMITRANSPARENT;
		elem.fillStyleId = "";
	}
	// replace strokes
	if ( elem.strokes.length > 0 ){
		elem.strokes = OPAQUE;
		elem.strokeStyleId = "";
	}
	// remove effects
	if ( elem.effects != undefined ){
		elem.effects = [];
		elem.effectStyleId = "";
	}

}


function removeStyle(elem: SceneNode){
	console.log("rmv")

	if( !supportsFillsAndStrokesAndEffects(elem) ) return;
	
	if(elem.fills != undefined ){
		elem.fills = [];
		elem.fillStyleId = "";
	}

	if(elem.strokes != undefined ){
		elem.strokes = [];
		elem.strokeStyleId = "";
	}

	if(elem.effects != undefined) {
		elem.effects = [];
		elem.effectStyleId = "";
	}
}
