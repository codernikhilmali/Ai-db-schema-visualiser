import ELK from 'elkjs/lib/elk.bundled.js';
import type { Node, Edge } from 'reactflow';

const elk = new ELK();

// Dynamic sizing based on column count and schema size
const getNodeDimensions = (node: Node, totalNodes: number) => {
  const cols = node.data?.columns?.length || 1;
  const ROW_H = 28;
  const HEADER_H = 50;
  const FOOTER_H = 26;
  const SECTION_H = 20;
  const pk = node.data?.columns?.filter((c: any) => c.isPrimary)?.length || 0;
  const fk = node.data?.columns?.filter((c: any) => c.isForeignKey && !c.isPrimary)?.length || 0;
  const dual = node.data?.columns?.filter((c: any) => c.isPrimary && c.isForeignKey)?.length || 0;
  const sections = (pk > 0 ? 1 : 0) + (dual > 0 ? 1 : 0) + (fk > 0 ? 1 : 0) + ((cols - pk - fk) > 0 ? 1 : 0);
  const height = HEADER_H + FOOTER_H + cols * ROW_H + sections * SECTION_H + 4;
  // Keep nodes wide enough to read clearly
  const width = totalNodes > 15 ? 240 : totalNodes > 10 ? 260 : totalNodes > 6 ? 280 : 300;
  return { width, height };
};

export interface LayoutResult {
  nodes: Node[];
  edges: Edge[];
}

export const applyElkLayout = async (
  nodes: Node[],
  edges: Edge[]
): Promise<LayoutResult> => {
  if (nodes.length === 0) return { nodes, edges };

  const n = nodes.length;

  // ── GENEROUS spacing so tables fill the full canvas ──────────
  // The key issue was tables being too cramped. We now use much
  // larger spacing values at every schema size.
  const isLarge = n > 10;
  const isMedium = n > 5;

  // Significantly increased spacing for breathing room
  const nodeSpacing = isLarge ? 80 : isMedium ? 120 : 160;
  const layerSpacing = isLarge ? 140 : isMedium ? 200 : 260;

  const elkNodes = nodes.map((node) => {
    const { width, height } = getNodeDimensions(node, n);
    return { id: node.id, width, height };
  });

  const elkEdges = edges.map((e) => ({
    id: e.id,
    sources: [e.source],
    targets: [e.target],
  }));

  // Build layout options with generous spacing
  const layoutOptions: Record<string, string> = {
    'elk.algorithm': 'layered',
    // RIGHT flow for all sizes — creates a natural left-to-right reading flow
    'elk.direction': isLarge ? 'DOWN' : 'RIGHT',
    // GENEROUS node spacing within same layer
    'elk.spacing.nodeNode': String(nodeSpacing),
    // GENEROUS spacing between layers (horizontal gap between columns of tables)
    'elk.layered.spacing.nodeNodeBetweenLayers': String(layerSpacing),
    // Edge-to-node spacing
    'elk.layered.spacing.edgeNodeBetweenLayers': '40',
    'elk.layered.spacing.edgeEdgeBetweenLayers': '30',
    'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
    'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
    'elk.edgeRouting': 'ORTHOGONAL',
    'elk.layered.mergeEdges': 'true',
    // Large padding around entire graph
    'elk.padding': '[top=80,left=80,bottom=80,right=80]',
    // Spread nodes evenly
    'elk.layered.nodePlacement.bk.fixedAlignment': 'BALANCED',
    'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
    // Wide aspect ratio to fill horizontal canvas space
    'elk.aspectRatio': isLarge ? '2.0' : isMedium ? '1.8' : '1.6',
    // Wrapping for large schemas to use canvas width
    'elk.layered.wrapping.strategy': isLarge ? 'MULTI_EDGE' : 'OFF',
    'elk.layered.wrapping.additionalEdgeSpacing': '40',
    // Separate connected components with generous spacing
    'elk.separateConnectedComponents': 'true',
    'elk.spacing.componentComponent': '150',
  };

  // For very large schemas, balance layer heights
  if (n > 15) {
    layoutOptions['elk.layered.highDegreeNodes.treatment'] = 'true';
    layoutOptions['elk.layered.highDegreeNodes.threshold'] = '4';
  }

  const graph = await elk.layout({
    id: 'root',
    layoutOptions,
    children: elkNodes,
    edges: elkEdges,
  });

  const layoutNodes = nodes.map((node) => {
    const elkNode = graph.children?.find((en) => en.id === node.id);
    return {
      ...node,
      position: {
        x: elkNode?.x ?? node.position.x,
        y: elkNode?.y ?? node.position.y,
      },
    };
  });

  // Recompute optimal handle sides based on new positions
  const layoutEdges = edges.map((e) => {
    const src = layoutNodes.find((nd) => nd.id === e.source);
    const tgt = layoutNodes.find((nd) => nd.id === e.target);
    if (!src || !tgt) return e;

    const srcDim = getNodeDimensions(src, n);
    const srcR = src.position.x + srcDim.width;
    const tgtDim = getNodeDimensions(tgt, n);
    const tgtR = tgt.position.x + tgtDim.width;

    const candidates = [
      { ss: 'right', ts: 'left', d: Math.abs(srcR - tgt.position.x) },
      { ss: 'left', ts: 'right', d: Math.abs(src.position.x - tgtR) },
      { ss: 'right', ts: 'right', d: Math.abs(srcR - tgtR) },
      { ss: 'left', ts: 'left', d: Math.abs(src.position.x - tgt.position.x) },
    ];
    const best = candidates.reduce((a, b) => (a.d <= b.d ? a : b));

    const srcCol = e.sourceHandle?.split('-source-')[0] || '';
    const tgtCol = e.targetHandle?.split('-target-')[0] || '';

    return {
      ...e,
      sourceHandle: `${srcCol}-source-${best.ss}`,
      targetHandle: `${tgtCol}-target-${best.ts}`,
    };
  });

  return { nodes: layoutNodes, edges: layoutEdges };
};
