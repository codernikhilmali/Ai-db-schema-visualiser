import { useEffect, useState, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import useStore from '../../store/useStore';
import { RefreshCcw, AlertCircle } from 'lucide-react';
import { parseSQLToSchema } from '../../utils/sqlParser';
import { cn } from '../../utils/cn';

type InputMode = 'sql' | 'json';

const SchemaEditor = () => {
  const { jsonSchema, sqlSchema, setSqlSchema, updateFromJSON, theme } = useStore();
  const isDark = theme === 'dark';
  const [mode, setMode] = useState<InputMode>('sql');
  const [jsonValue, setJsonValue] = useState(jsonSchema);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (mode === 'json') setJsonValue(jsonSchema);
  }, [jsonSchema, mode]);

  const applySQL = useCallback((value: string) => {
    const result = parseSQLToSchema(value);
    if (result) { setError(null); updateFromJSON(JSON.stringify(result, null, 2)); }
    else setError('No valid CREATE TABLE statements found.');
  }, [updateFromJSON]);

  const applyJSON = useCallback((value: string) => {
    try { JSON.parse(value); setError(null); updateFromJSON(value); }
    catch { setError('Invalid JSON syntax.'); }
  }, [updateFromJSON]);

  useEffect(() => { applySQL(sqlSchema); }, []);

  const handleEditorChange = (value: string | undefined) => {
    if (!value) return;
    if (mode === 'sql') { setSqlSchema(value); applySQL(value); }
    else { setJsonValue(value); applyJSON(value); }
  };

  return (
    <div className={cn('flex flex-col h-full', isDark ? 'bg-[#0B1020]' : 'bg-white')}>
      {/* Header */}
      <div className={cn(
        'h-10 flex items-center justify-between px-3 border-b',
        isDark ? 'border-white/[0.04] bg-[#111827]' : 'border-slate-100 bg-slate-50/50'
      )}>
        {/* Mode toggle */}
        <div className={cn(
          'flex p-0.5 rounded-md border',
          isDark ? 'bg-white/[0.03] border-white/[0.06]' : 'bg-white border-slate-200'
        )}>
          {(['sql', 'json'] as InputMode[]).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(null); }}
              className={cn(
                'px-2.5 py-1 rounded text-[10px] font-semibold uppercase tracking-wide transition-colors',
                mode === m
                  ? 'bg-[#7C5CFF] text-white'
                  : isDark ? 'text-white/30 hover:text-white/50' : 'text-slate-400 hover:text-slate-600'
              )}
            >
              {m}
            </button>
          ))}
        </div>

        <button
          onClick={() => (mode === 'sql' ? applySQL(sqlSchema) : applyJSON(jsonValue))}
          className={cn(
            'p-1.5 rounded-md transition-colors',
            isDark ? 'text-white/20 hover:text-white/50 hover:bg-white/[0.04]' : 'text-slate-300 hover:text-slate-700'
          )}
        >
          <RefreshCcw size={12} />
        </button>
      </div>

      {/* Editor */}
      <div className="flex-1 relative overflow-hidden">
        <Editor
          height="100%"
          language={mode === 'sql' ? 'sql' : 'json'}
          theme={isDark ? 'vs-dark' : 'vs'}
          value={mode === 'sql' ? sqlSchema : jsonValue}
          onChange={handleEditorChange}
          options={{
            minimap: { enabled: false },
            fontSize: 12,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            padding: { top: 12 },
            wordWrap: 'on',
            lineHeight: 20,
            fontFamily: '"Fira Code", "JetBrains Mono", monospace',
            fontLigatures: true,
            renderLineHighlight: 'none',
            hideCursorInOverviewRuler: true,
            scrollbar: { vertical: 'hidden', horizontal: 'hidden' },
          }}
        />
      </div>

      {/* Error bar */}
      {error && (
        <div className="px-3 py-1.5 bg-red-500/10 border-t border-red-500/20 flex items-center gap-2">
          <AlertCircle size={12} className="text-red-400" />
          <span className="text-[10px] font-medium text-red-400/80">{error}</span>
        </div>
      )}
    </div>
  );
};

export default SchemaEditor;
