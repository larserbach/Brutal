const types = [
	"BOOLEAN_OPERATION",
	"COMPONENT",
	"COMPONENT_SET",
	"CONNECTOR",
	"DOCUMENT",
	"ELLIPSE",
	"FRAME",
	"GROUP",
	"INSTANCE",
	"LINE",
	"PAGE",
	"POLYGON",
	"RECTANGLE",
	"SHAPE_WITH_TEXT",
	"SLICE",
	"STAMP",
	"STAR",
	"STICKY",
	"TEXT",
	"VECTOR",
  ];
  

// The 'input' event listens for text change in the Quick Actions box after a plugin is 'Tabbed' into.
figma.parameters.on('input', ({ key, query, result }) => {
	switch (key) {
		case 'choice':

			const choices = ["everything", "only nested layers"]

			const suggestions = choices.filter(s => s.includes(query));
			result.setSuggestions(suggestions);
			break;
		default:
			return;
	}
});



// When the user presses Enter after inputting all parameters, the 'run' event is fired.
figma.on('run', ({ parameters }) => {
	startPluginWithParameters(parameters!);
});
  

function startPluginWithParameters(parameters: any) {
	console.log(parameters);
	
	const sel = figma.currentPage.selection;
	const excludedNodes: string[] = ["Frame"];

	const nodes =  sel.flatMap(s => getAllNestedNodes(s, excludedNodes))
	nodes.forEach(removeStyle)

	if(parameters.choice === "everything"){
		sel.flatMap(s => removeStyle(s))
	}
	const message = sel.length > 0 ? "You've got no styles no more" : "🥴 Ooops! Please make a selection"
	figma.closePlugin(message);
}



function getAllNestedNodes (sel : SceneNode, excludedNodes: string[]): SceneNode[]
{
	
	const lowerCaseExcludedNodes: string[] = excludedNodes.map(n => n.toLowerCase());
	console.log(lowerCaseExcludedNodes)

	const filter = (node: any) => !lowerCaseExcludedNodes.includes(node.name.toLowerCase());
	
	const nodes  = ('children' in sel) ? (sel.findAll( (node: SceneNode) => excludedNodes.length === 0 ? true : filter(node))) : [];

	return nodes;
	
};




function removeStyle(elem: any){
	
	if(elem.fills != undefined ){
		elem.fills = [];
		elem.fillStyleId = "";
		console.log("remove fills")
	}

	if(elem.strokes != undefined ){
		elem.strokes = [];
		elem.strokeStyleId = "";
	}
}
