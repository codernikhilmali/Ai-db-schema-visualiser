import type { Node, Edge } from 'reactflow';
import type { TableNodeData } from '../components/nodes/TableNode';

export interface ERSchema {
  [tableName: string]: {
    columns: {
      name: string;
      type: string;
      isPrimary?: boolean;
      isForeignKey?: boolean;
      isNotNull?: boolean;
      isUnique?: boolean;
      references?: { table: string; column: string };
    }[];
    position?: { x: number; y: number };
  };
}

export const parseERSchema = (schema: string): { nodes: Node<TableNodeData>[], edges: Edge[] } => {
  try {
    const parsed: ERSchema = JSON.parse(schema);
    const nodes: Node<TableNodeData>[] = [];
    const edges: Edge[] = [];
    const edgeSet = new Set<string>();
    const tableNames = Object.keys(parsed);

    // Helper: check if a target table exists for an FK name
    const findTarget = (colName: string): string | undefined => {
      const prefix = colName.replace(/_id$/i, '').replace(/id$/i, '').toLowerCase();
      return tableNames.find(t =>
        t.toLowerCase() === prefix ||
        t.toLowerCase() === prefix + 's' ||
        t.toLowerCase() === prefix + 'es'
      );
    };

    // 1. Generate Nodes
    Object.entries(parsed).forEach(([tableName, tableConfig]) => {
      nodes.push({
        id: tableName,
        type: 'table',
        position: tableConfig.position || { x: 0, y: 0 },
        data: {
          label: tableName,
          columns: tableConfig.columns.map(col => {
            let isFk = col.isForeignKey ?? false;

            // Detect FK by naming convention if not explicitly set
            if (!isFk) {
              if (col.references) {
                isFk = true;
              } else if (col.name.endsWith('_id')) {
                // Check if target table exists (works for both PK+FK composite keys and plain FKs)
                isFk = !!findTarget(col.name);
              } else if (!col.isPrimary && col.name.toLowerCase().endsWith('id') && col.name.length > 2) {
                isFk = !!findTarget(col.name);
              }
            }

            return { ...col, isForeignKey: isFk };
          })
        }
      });
    });

    // 2. Generate edges
    nodes.forEach(sourceNode => {
      sourceNode.data.columns.forEach(col => {
        if (!col.isForeignKey) return;

        let targetTableName: string | undefined;
        if (col.references) {
          targetTableName = col.references.table;
        } else {
          targetTableName = findTarget(col.name);
        }

        if (targetTableName && targetTableName !== sourceNode.id && parsed[targetTableName]) {
          const edgeKey = `${sourceNode.id}:${col.name}->${targetTableName}`;
          if (!edgeSet.has(edgeKey)) {
            edgeSet.add(edgeKey);
            const targetPKCol = parsed[targetTableName].columns.find(c => c.isPrimary);
            const targetColName = col.references?.column ?? targetPKCol?.name ?? 'id';

            edges.push({
              id: `edge-${sourceNode.id}-${col.name}-${targetTableName}`,
              source: sourceNode.id,
              target: targetTableName,
              sourceHandle: `${col.name}-source-right`,
              targetHandle: `${targetColName}-target-left`,
              type: 'smoothstep',
              animated: false,
              markerEnd: {
                type: 'arrowclosed' as any,
                width: 12, height: 12,
                color: '#7C5CFF',
              },
              label: col.name,
              style: { stroke: 'rgba(124,92,255,0.15)', strokeWidth: 1.5 },
              labelStyle: { fill: '#a78bfa', fontSize: 9, fontWeight: 600, fontFamily: '"Inter", sans-serif' },
              labelBgPadding: [4, 2] as [number, number],
              labelBgBorderRadius: 4,
              labelBgStyle: { fill: '#0B1020', fillOpacity: 0.95, stroke: 'rgba(124,92,255,0.2)', strokeWidth: 1 },
            });
          }
        }
      });
    });

    return { nodes, edges };
  } catch {
    return { nodes: [], edges: [] };
  }
};
