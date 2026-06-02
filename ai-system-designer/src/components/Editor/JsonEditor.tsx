import { useEffect, useState } from 'react';

import Editor from '@monaco-editor/react';
import useStore from '../../store/useStore';
import { Code2, RefreshCcw } from 'lucide-react';

const JsonEditor = () => {
  const { jsonSchema, updateFromJSON } = useStore();
  const [localValue, setLocalValue] = useState(jsonSchema);

  // Update local value when store changes (Canvas -> Editor)
  useEffect(() => {
    setLocalValue(jsonSchema);
  }, [jsonSchema]);

  const handleEditorChange = (value: string | undefined) => {
    if (value) {
      setLocalValue(value);
      // We'll update the store with a small delay or validation
      try {
        JSON.parse(value);
        updateFromJSON(value);
      } catch (e) {
        // Invalid JSON, don't update store yet
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#1e1e24] border-r border-white/10">
      <div className="flex items-center justify-between px-4 py-3 bg-white/5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Code2 size={18} className="text-primary" />
          <span className="text-sm font-semibold text-white/80 uppercase tracking-wider">Schema Editor</span>
        </div>
        <button 
          onClick={() => updateFromJSON(localValue)}
          className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white/50 hover:text-white"
          title="Force Sync"
        >
          <RefreshCcw size={16} />
        </button>
      </div>
      
      <div className="flex-1 overflow-hidden">
        <Editor
          height="100%"
          defaultLanguage="json"
          theme="vs-dark"
          value={localValue}
          onChange={handleEditorChange}
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            padding: { top: 16 },
          }}

        />
      </div>
    </div>
  );
};

export default JsonEditor;
