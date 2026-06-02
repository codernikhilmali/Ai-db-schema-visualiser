import axios from 'axios';
import { authService } from './authService';

export interface AiResponse {
  type: 'schema_modification' | 'code_generation';
  schemaData?: any;
  sqlData?: string;
  explanation?: string;
  language?: string;
  code?: string;
  error?: string;
}

/**
 * Post-process the AI's schema to ensure all foreign keys have proper
 * references and isForeignKey flags, and positions are well-spaced.
 */
function validateAndFixSchema(schema: any): any {
  const tableNames = Object.keys(schema);
  
  // Grid positions with generous spacing
  const GRID_START_X = 80;
  const GRID_START_Y = 80;
  const COL_SPACING = 570;
  const ROW_SPACING = 470;
  const COLS = Math.min(3, Math.max(2, Math.ceil(Math.sqrt(tableNames.length))));
  
  let colIdx = 0;
  let rowIdx = 0;
  
  for (const tableName of tableNames) {
    const table = schema[tableName];
    
    // Ensure position exists — always override with well-spaced grid
    const gridX = GRID_START_X + colIdx * COL_SPACING;
    const gridY = GRID_START_Y + rowIdx * ROW_SPACING;
    
    if (table.position) {
      const hasGoodSpacing = table.position.x >= 50 && table.position.y >= 50;
      if (!hasGoodSpacing) {
        table.position = { x: gridX, y: gridY };
      }
    } else {
      table.position = { x: gridX, y: gridY };
    }
    
    colIdx++;
    if (colIdx >= COLS) {
      colIdx = 0;
      rowIdx++;
    }
    
    // Ensure columns is an array
    if (!Array.isArray(table.columns)) {
      table.columns = [];
    }
    
    // Check if table has a primary key, add one if missing
    const hasPK = table.columns.some((c: any) => c.isPrimary === true);
    if (!hasPK && table.columns.length > 0) {
      const idCol = table.columns.find((c: any) => c.name === 'id');
      if (idCol) {
        idCol.isPrimary = true;
      }
    }
    
    // Fix foreign key references
    for (const col of table.columns) {
      if (col.isPrimary === undefined) col.isPrimary = false;
      if (col.isForeignKey === undefined) col.isForeignKey = false;
      
      // If column has references, ensure isForeignKey is true
      if (col.references && col.references.table) {
        col.isForeignKey = true;
        if (!schema[col.references.table]) {
          const match = tableNames.find(t => 
            t.toLowerCase() === col.references.table.toLowerCase()
          );
          if (match) {
            col.references.table = match;
          }
        }
        if (!col.references.column) {
          col.references.column = 'id';
        }
      }
      
      // Auto-detect FK by _id naming convention
      if (col.name.endsWith('_id') && !col.isPrimary && !col.isForeignKey) {
        const prefix = col.name.replace(/_id$/, '');
        const targetTable = tableNames.find(t => {
          const tLower = t.toLowerCase();
          const pLower = prefix.toLowerCase();
          return tLower === pLower || tLower === pLower + 's' || tLower === pLower + 'es';
        });
        if (targetTable) {
          col.isForeignKey = true;
          col.references = { table: targetTable, column: 'id' };
        }
      }
    }
  }
  
  // Post-processing: check that positions don't overlap
  const positions = tableNames.map(t => schema[t].position);
  const hasDuplicates = positions.some((p, i) => 
    positions.some((q, j) => i !== j && Math.abs(p.x - q.x) < 200 && Math.abs(p.y - q.y) < 200)
  );
  
  if (hasDuplicates) {
    let ci = 0, ri = 0;
    for (const tableName of tableNames) {
      schema[tableName].position = {
        x: GRID_START_X + ci * COL_SPACING,
        y: GRID_START_Y + ri * ROW_SPACING,
      };
      ci++;
      if (ci >= COLS) { ci = 0; ri++; }
    }
  }
  
  return schema;
}

function cleanAndParseJSON(rawStr: string): any {
  let cleaned = rawStr.trim();
  
  // Strip markdown code block if present
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.substring(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.substring(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.substring(0, cleaned.length - 3);
  }
  
  cleaned = cleaned.trim();
  
  try {
    return JSON.parse(cleaned);
  } catch (err: any) {
    console.error('Failed to parse clean JSON:', err);
    console.error('Raw string length:', rawStr.length);
    console.error('Raw string preview (first 500 chars):', rawStr.substring(0, 500));
    console.error('Raw string preview (last 500 chars):', rawStr.substring(Math.max(0, rawStr.length - 500)));
    throw new Error(`JSON parsing error: ${err.message}. The response might have been truncated or malformed.`);
  }
}

export const generateSchemaFromPrompt = async (prompt: string, currentSchema: string): Promise<AiResponse> => {
  if (!authService.isAuthenticated()) {
    throw new Error("You must be logged in to use the AI Architect features.");
  }

  const response = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/api/ai/generate`, {
    prompt,
    currentSchema
  }, {
    headers: authService.getAuthHeaders()
  });

  const parsed = typeof response.data === 'string' ? cleanAndParseJSON(response.data) : response.data;

  // Validate and fix the schema if it's a schema_modification
  if (parsed.type === 'schema_modification' && parsed.schemaData) {
    parsed.schemaData = validateAndFixSchema(parsed.schemaData);
  }

  return parsed as AiResponse;
};
