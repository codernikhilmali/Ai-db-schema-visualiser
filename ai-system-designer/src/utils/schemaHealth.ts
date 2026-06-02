import { type Node, type Edge } from 'reactflow';

export interface Suggestion {
  type: 'error' | 'warning' | 'info' | 'success';
  text: string;
}

export interface SchemaHealthResult {
  score: number;
  suggestions: Suggestion[];
}

/**
 * Calculates a dynamic health score and generates specific insights/suggestions 
 * based on the current tables (nodes) and connections (edges).
 */
export function calculateSchemaHealth(nodes: Node[], edges: Edge[]): SchemaHealthResult {
  if (!nodes || nodes.length === 0) {
    return {
      score: 100,
      suggestions: [
        {
          type: 'info',
          text: 'Start adding tables to begin your database schema design!'
        }
      ]
    };
  }

  let score = 100;
  const suggestions: Suggestion[] = [];
  const tableNames = new Set(nodes.map(n => n.id.toLowerCase()));

  let missingPKCount = 0;
  let missingTimestampsCount = 0;
  let emptyTableCount = 0;
  let unlinkedIdCount = 0;

  nodes.forEach(node => {
    const tableName = node.id;
    const columns = node.data?.columns || [];

    // 1. Check if table has columns
    if (columns.length === 0) {
      emptyTableCount++;
      score -= 20;
      suggestions.push({
        type: 'error',
        text: `Table "${tableName}" has no columns defined.`
      });
      return;
    }

    // 2. Check if table has at least one Primary Key
    const hasPK = columns.some((c: any) => c.isPrimary);
    if (!hasPK) {
      missingPKCount++;
      score -= 15;
      suggestions.push({
        type: 'error',
        text: `Table "${tableName}" is missing a primary key constraint.`
      });
    }

    // 3. Check for audit timestamps (created_at or updated_at)
    const hasTimestamp = columns.some((c: any) => {
      const name = c.name.toLowerCase();
      return name === 'created_at' || name === 'updated_at' || name === 'createdat' || name === 'updatedat';
    });
    if (!hasTimestamp) {
      missingTimestampsCount++;
      score -= 3;
      suggestions.push({
        type: 'info',
        text: `Consider adding created_at/updated_at to table "${tableName}" for auditing.`
      });
    }

    // 4. Check for unlinked *_id columns (possible forgotten FKs)
    columns.forEach((col: any) => {
      const colName = col.name.toLowerCase();
      if (colName.endsWith('_id') && !col.isPrimary && !col.isForeignKey) {
        // Try to see if there is a target table matches prefix
        const prefix = colName.substring(0, colName.length - 3);
        const matchesTable = Array.from(tableNames).some(t => 
          t === prefix || t === prefix + 's' || t === prefix + 'es'
        );

        if (matchesTable) {
          unlinkedIdCount++;
          score -= 5;
          suggestions.push({
            type: 'warning',
            text: `Column "${col.name}" in table "${tableName}" looks like a foreign key but has no relationship configured.`
          });
        }
      }

      // Check if FK has invalid reference
      if (col.isForeignKey && (!col.references || !col.references.table)) {
        score -= 5;
        suggestions.push({
          type: 'error',
          text: `Foreign key "${col.name}" in table "${tableName}" is missing reference metadata.`
        });
      } else if (col.isForeignKey && col.references && col.references.table) {
        const targetTableExists = tableNames.has(col.references.table.toLowerCase());
        if (!targetTableExists) {
          score -= 8;
          suggestions.push({
            type: 'error',
            text: `Foreign key "${col.name}" in table "${tableName}" references non-existent table "${col.references.table}".`
          });
        }
      }
    });
  });

  // Bound the score between 0 and 100
  score = Math.max(0, Math.min(100, score));

  // Add general success suggestions if aspects are healthy
  if (missingPKCount === 0 && nodes.length > 0) {
    suggestions.push({
      type: 'success',
      text: 'All tables have valid primary key constraints.'
    });
  }

  if (unlinkedIdCount === 0 && edges.length > 0) {
    suggestions.push({
      type: 'success',
      text: 'All potential foreign key relationships are properly connected.'
    });
  }

  if (missingTimestampsCount === 0 && nodes.length > 0) {
    suggestions.push({
      type: 'success',
      text: 'Audit timestamps are defined across all tables.'
    });
  }

  // If score is high and we have few warnings, add positive enforcement
  if (score >= 90 && suggestions.filter(s => s.type === 'error' || s.type === 'warning').length === 0) {
    suggestions.push({
      type: 'success',
      text: 'Excellent! Your database schema design follows production-ready best practices.'
    });
  }

  // Sort suggestions so errors and warnings are always shown first
  const severityOrder = { error: 0, warning: 1, info: 2, success: 3 };
  suggestions.sort((a, b) => severityOrder[a.type] - severityOrder[b.type]);

  return {
    score,
    suggestions: suggestions.slice(0, 5) // Cap at top 5 suggestions to keep UI clean
  };
}
