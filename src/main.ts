
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



// When the user presses Enter after inputting all parameters, the 'run' event is fired.
figma.on('run', ({ parameters }) => {
	startPluginWithParameters(parameters!);
});
  

function startPluginWithParameters(parameters: any) {

	const sel = figma.currentPage.selection;
	// the user must make a selection
	if(sel.length > 0){
		const excludedNode: string = parameters.name ? parameters.name.toLowerCase() : [];

		// get all child nodes of the selection, except those matching the second user input
		const nodes =  sel.flatMap(node => getAllNestedNodes(node, excludedNode))
		nodes.forEach(removeStyle)

		// if the user choose to remove styles from any layer
		if(parameters.choice === "All layers in selection"){
			const customfilter = (node: any) => !node.name.toLowerCase().startsWith(excludedNode);
			const filteredSel  = sel.filter( (node: SceneNode) => excludedNode.length === 0 ? true : customfilter(node));
			filteredSel.forEach(node => removeStyle(node))
		}
	}
	const message = sel.length > 0 ? "👻 Styles removed" : "👾 Please make a selection"
	figma.closePlugin(message);
}


function getAllNestedNodes (sel : SceneNode, excludedNode: string = ""): SceneNode[]
{
	const filter = (node: any) => !node.name.toLowerCase().startsWith(excludedNode);
	const nodes  = ('children' in sel) ? (sel.findAll( (node: SceneNode) => excludedNode.length === 0 ? true : filter(node))) : [];
	return nodes;	
};


function removeStyle(elem: any){
	
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
