const sel = figma.currentPage.selection;

const killAll = true
const doNotKill: string[] = [] 

kill(sel, doNotKill, killAll)


function kill(_sel : readonly SceneNode[] | SceneNode[] , _excludes: string[], _killAll = false){

	function removeStyle(elem: any){
		if(elem.fills != undefined ){
			elem.fills = [];
			elem.fillStyleId = "";
			}
			if(elem.strokes != undefined ){
			elem.strokes = [];
			elem.strokeStyleId = "";
			}

			if(elem.children && elem.children.length > 0 && elem.type !== 'TEXT'){
				console.log(elem.type + " - " + elem.name)
				console.log("has children")
				return elem.children
			}
	}
		
	_sel.forEach( s => {
		var children : SceneNode[] = []


		if( !_excludes){
			 children = removeStyle(s)
		}else{
			if( !_excludes.includes(s.name) ){

				children = removeStyle(s)
		}}
		
		if(children && children.length > 0){
			kill(children, _excludes, _killAll)
		}	
		
	})

}
figma.closePlugin("You've got no styles no more")