export type SupportedNode =
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

export const SUPPORTED_TYPES: NodeType[] = [
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