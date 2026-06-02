/**
 * Parses SQL CREATE TABLE statements into the ERSchema format.
 * Uses a balanced-paren scanner so VARCHAR(50), DECIMAL(10,2) etc. don't break parsing.
 */
export const parseSQLToSchema = (sql: string): Record<string, any> | null => {
  const schema: Record<string, any> = {};
  const COL_HEIGHT_PX   = 34;
  const HEADER_HEIGHT_PX = 95;
  const PADDING_Y       = 60;
  const COL_SPACING_X   = 360;
  const gridColMaxY: number[] = [0, 0];
  let tableIndex = 0;

  // ── Step 1: Find every "CREATE TABLE name (" header ──────────────
  const headerRe = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["'`]?(\w+)["'`]?\s*\(/gi;
  let headerMatch: RegExpExecArray | null;

  while ((headerMatch = headerRe.exec(sql)) !== null) {
    const tableName   = headerMatch[1];
    const bodyStart   = headerMatch.index + headerMatch[0].length; // index right after the opening "("

    // ── Step 2: Walk forward to find the balanced closing ")" ─────
    let depth   = 1;
    let pos     = bodyStart;
    while (pos < sql.length && depth > 0) {
      if (sql[pos] === '(') depth++;
      else if (sql[pos] === ')') depth--;
      pos++;
    }
    // sql.slice(bodyStart, pos - 1) is the table body (without the outer parens)
    const body = sql.slice(bodyStart, pos - 1);

    // ── Step 3: Parse columns & table-level constraints ───────────
    const columns: any[] = [];
    const tableConstraints: string[] = [];
    const lines = splitByCommaRespectingParens(body);

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Skip table-level constraints for now and collect them for post-processing
      if (/^(PRIMARY\s+KEY|FOREIGN\s+KEY|UNIQUE|INDEX|KEY|CONSTRAINT)\b/i.test(trimmed)) {
        tableConstraints.push(trimmed);
        continue;
      }

      // columnName  TYPE[(size)]  [constraints...]
      // Allow digits in type names too (e.g. INT4, FLOAT8, CHAR varying)
      const colMatch = trimmed.match(
        /^["'`]?(\w+)["'`]?\s+([A-Z][A-Z0-9_]*(?:\s*\(\s*\d+(?:\s*,\s*\d+)?\s*\))?)(.*)/i
      );
      if (!colMatch) continue;

      const colName = colMatch[1];
      // Normalise type: collapse whitespace, uppercase, strip size for the key
      const colType = colMatch[2].replace(/\s+/g, '').toUpperCase();
      const rest    = colMatch[3] || '';

      const isPrimary   = /\bPRIMARY\s+KEY\b/i.test(rest);
      const isNotNull   = /\bNOT\s+NULL\b/i.test(rest) || isPrimary;
      const isUnique    = /\bUNIQUE\b/i.test(rest);

      const refMatch    = rest.match(/\bREFERENCES\s+["'`]?(\w+)["'`]?\s*\(\s*["'`]?(\w+)["'`]?\s*\)/i);
      const isFkByName  = !isPrimary && colName.toLowerCase().endsWith('_id');
      const isForeignKey = !isPrimary && (!!refMatch || isFkByName);
      const references  = refMatch ? { table: refMatch[1], column: refMatch[2] } : undefined;

      columns.push({
        name: colName,
        type: colType,
        isPrimary,
        isForeignKey,
        isNotNull,
        isUnique,
        ...(references ? { references } : {}),
      });
    }

    // Process table-level constraints inside CREATE TABLE
    for (const constraint of tableConstraints) {
      // 1. PRIMARY KEY (col1, col2, ...)
      const pkMatch = constraint.match(/PRIMARY\s+KEY\s*\(([^)]+)\)/i);
      if (pkMatch) {
        const pkCols = pkMatch[1].split(',').map(c => c.replace(/["'`]/g, '').trim());
        columns.forEach(col => {
          if (pkCols.includes(col.name)) {
            col.isPrimary = true;
            col.isNotNull = true;
          }
        });
      }

      // 2. FOREIGN KEY (col) REFERENCES target (col)
      const fkMatch = constraint.match(/FOREIGN\s+KEY\s*\(([^)]+)\)\s*REFERENCES\s+["'`]?(\w+)["'`]?\s*\(([^)]+)\)/i);
      if (fkMatch) {
        const srcColName = fkMatch[1].replace(/["'`]/g, '').trim();
        const targetTable = fkMatch[2];
        const targetCol = fkMatch[3].replace(/["'`]/g, '').trim();

        columns.forEach(col => {
          if (col.name === srcColName && !col.isPrimary) {
            col.isForeignKey = true;
            col.references = { table: targetTable, column: targetCol };
          }
        });
      }
    }

    if (columns.length === 0) continue;

    // ── Step 4: Dynamic Y positioning so tables never overlap ──────
    const gridCol        = tableIndex % 2;
    const tableHeightPx  = HEADER_HEIGHT_PX + columns.length * COL_HEIGHT_PX;
    const posY           = 80 + gridColMaxY[gridCol];

    schema[tableName] = {
      columns,
      position: {
        x: 80 + gridCol * COL_SPACING_X,
        y: posY,
      },
    };

    gridColMaxY[gridCol] += tableHeightPx + PADDING_Y;
    tableIndex++;

    // Advance headerRe past the table body so we don't re-parse
    headerRe.lastIndex = pos;
  }

  // ── Step 5: Parse ALTER TABLE ADD PRIMARY KEY ───────────────────
  const alterPkRe = /ALTER\s+TABLE\s+["'`]?(\w+)["'`]?\s+ADD\s+(?:CONSTRAINT\s+\w+\s+)?PRIMARY\s+KEY\s*\(([^)]+)\)/gi;
  let alterPkMatch: RegExpExecArray | null;
  while ((alterPkMatch = alterPkRe.exec(sql)) !== null) {
    const tableName = alterPkMatch[1];
    const pkCols = alterPkMatch[2].split(',').map(c => c.replace(/["'`]/g, '').trim());
    if (schema[tableName]) {
      schema[tableName].columns.forEach((col: any) => {
        if (pkCols.includes(col.name)) {
          col.isPrimary = true;
          col.isNotNull = true;
        }
      });
    }
  }

  // ── Step 6: Parse ALTER TABLE ADD FOREIGN KEY ───────────────────
  const alterFkRe = /ALTER\s+TABLE\s+["'`]?(\w+)["'`]?\s+ADD\s+(?:CONSTRAINT\s+\w+\s+)?FOREIGN\s+KEY\s*\(([^)]+)\)\s*REFERENCES\s+["'`]?(\w+)["'`]?\s*\(([^)]+)\)/gi;
  let alterFkMatch: RegExpExecArray | null;
  while ((alterFkMatch = alterFkRe.exec(sql)) !== null) {
    const tableName = alterFkMatch[1];
    const srcColName = alterFkMatch[2].replace(/["'`]/g, '').trim();
    const targetTable = alterFkMatch[3];
    const targetCol = alterFkMatch[4].replace(/["'`]/g, '').trim();

    if (schema[tableName]) {
      schema[tableName].columns.forEach((col: any) => {
        if (col.name === srcColName && !col.isPrimary) {
          col.isForeignKey = true;
          col.references = { table: targetTable, column: targetCol };
        }
      });
    }
  }

  return Object.keys(schema).length > 0 ? schema : null;
};

// ── Split comma-separated items respecting nested parens ────────────
function splitByCommaRespectingParens(str: string): string[] {
  const result: string[] = [];
  let depth   = 0;
  let current = '';
  for (const char of str) {
    if (char === '(') depth++;
    else if (char === ')') depth--;
    if (char === ',' && depth === 0) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  if (current.trim()) result.push(current);
  return result;
}
