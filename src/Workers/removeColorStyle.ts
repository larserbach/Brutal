import { SupportedNode } from "../types";


// # # # # # # # # #
// FILLS
// # # # # # # # # #

function setTextSegmentFills(node: TextNode): void{

  const styledTextSegementId = node.getStyledTextSegments(['fillStyleId'])
  console.log("styledTextSegementId:")
  console.log(styledTextSegementId)

  const segmentsWithStyleApplied = styledTextSegementId.filter(segment => {
    return segment.fillStyleId
  })

  console.log("segmentsWithStyleApplied:")
  console.log(segmentsWithStyleApplied)

  const styledTextSegementFills = node.getStyledTextSegments(['fills'])
  console.log("styledTextSegementFills")
  console.log(styledTextSegementFills)

  styledTextSegementFills.forEach((segment) => {

    if (!("fills" in segment)) return;
    
    console.log('hasFills')

    if (segmentsWithStyleApplied.some(obj => {
      console.log(`seg.start ${segment.start}`)
      console.log(`obj.start ${obj.start}`)
      return obj.start == segment.start
    })) {
      console.log("fills are in segment and has style applied:")
      console.log(segment)
      node.setRangeFills(segment.start, segment.end, [])
    }
  })
}


async function removeStyleOnNodesFills(node: SupportedNode): Promise<void> {
  if (node.fillStyleId === "") {
    return;
  }

  
  console.log(typeof node.fills)
  if (typeof node.fills == 'symbol' && node.type == "TEXT"){
    console.log('fills is symbol, must have colored text segements')
    
    console.log(node.fills)
    setTextSegmentFills(node)
    
  } else {
    await node.setFillStyleIdAsync("");
    node.fills = []
  }
}

// # # # # # # # # #
// STROKES
// # # # # # # # # #

async function removeStyleOnNodesStrokes(node: SupportedNode): Promise<void> {
  // guard
  if (node.type === "SECTION" || node.strokeStyleId === "") return;
  await node.setStrokeStyleIdAsync("")
  node.strokes = [];
}

// # # # # # # # # #
// EFFECTS
// # # # # # # # # #

async function removeStyleOnNodesEffects(node: SupportedNode): Promise<void> {
  // guard
  if (node.type === "SECTION" || node.type === "SHAPE_WITH_TEXT") return;
  if (node.effectStyleId === "") {
    return;
  }
  await node.setEffectStyleIdAsync("")
  node.effects = [];
}

export function removeColorStyles(node:SupportedNode):void {
  removeStyleOnNodesFills(node).catch(err => {throw err});
  removeStyleOnNodesStrokes(node).catch(err => {throw err});
  removeStyleOnNodesEffects(node).catch(err => {throw err});
}