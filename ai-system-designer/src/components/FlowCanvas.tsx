import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import ReactFlow, {
  Background, Panel, useReactFlow, ReactFlowProvider,
  type NodeTypes, type Node, type Edge,
} from 'reactflow';
import 'reactflow/dist/style.css';
import useStore from '../store/useStore';
import {
  Share2, Image as ImageIcon, FileText, Loader2, ChevronDown,
  ZoomIn, ZoomOut, Maximize, Lock, LayoutDashboard,
  Sparkles,
} from 'lucide-react';
import TableNode from './nodes/TableNode';
import { toPng } from 'html-to-image';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/cn';

const nodeTypes: NodeTypes = { table: TableNode };

const CustomControls = () => {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const [locked, setLocked] = useState(false);
  const autoLayout = useStore((s) => s.autoLayout);
  const [laying, setLaying] = useState(false);

  const handleAutoLayout = async () => {
    setLaying(true);
    await autoLayout();
    setTimeout(() => fitView({ padding: 0.15, duration: 600 }), 100);
    setLaying(false);
  };

  return (
    <div className="flex flex-col gap-1 bg-[#182134]/85 border border-white/[0.06] backdrop-blur-md rounded-lg p-1 shadow-xl">
      <button onClick={() => zoomIn()} title="Zoom In"
        className="w-8 h-8 flex items-center justify-center rounded-md text-white/40 hover:text-white hover:bg-white/[0.06] transition-colors">
        <ZoomIn size={15} />
      </button>
      <button onClick={() => zoomOut()} title="Zoom Out"
        className="w-8 h-8 flex items-center justify-center rounded-md text-white/40 hover:text-white hover:bg-white/[0.06] transition-colors">
        <ZoomOut size={15} />
      </button>
      <div className="h-px bg-white/[0.06] mx-1" />
      <button onClick={() => fitView({ padding: 0.15, duration: 600 })} title="Fit View"
        className="w-8 h-8 flex items-center justify-center rounded-md text-white/40 hover:text-white hover:bg-white/[0.06] transition-colors">
        <Maximize size={14} />
      </button>
      <button onClick={() => setLocked(!locked)} title={locked ? 'Unlock' : 'Lock'}
        className={cn('w-8 h-8 flex items-center justify-center rounded-md transition-colors',
          locked ? 'text-[#7C5CFF] bg-[#7C5CFF]/10' : 'text-white/40 hover:text-white hover:bg-white/[0.06]')}>
        <Lock size={14} />
      </button>
      <div className="h-px bg-white/[0.06] mx-1" />
      <button onClick={handleAutoLayout} title="Auto Arrange" disabled={laying}
        className={cn('w-8 h-8 flex items-center justify-center rounded-md transition-colors',
          laying ? 'text-[#7C5CFF] animate-spin-slow' : 'text-white/40 hover:text-white hover:bg-white/[0.06]')}>
        <LayoutDashboard size={14} />
      </button>
    </div>
  );
};

const FlowInner = () => {
  const {
    nodes, edges, focusedColumn, setFocusedColumn,
    focusedEdge, setFocusedEdge,
    onNodesChange, onEdgesChange, onConnect, layoutVersion,
    setPendingPrompt,
  } = useStore();
  const { fitView } = useReactFlow();
  const prevLayout = useRef(layoutVersion);

  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Auto fitView when layout changes
  useEffect(() => {
    if (layoutVersion !== prevLayout.current) {
      prevLayout.current = layoutVersion;
      setTimeout(() => fitView({ padding: 0.15, duration: 600 }), 150);
    }
  }, [layoutVersion, fitView]);

  const handlePaneClick = useCallback(() => {
    setFocusedColumn(null); setFocusedEdge(null); setExportOpen(false);
  }, [setFocusedColumn, setFocusedEdge]);

  const selectedEdgeObj = useMemo(() => edges.find(e => e.id === focusedEdge), [edges, focusedEdge]);

  const handleGenerateJoinQuery = useCallback(() => {
    if (!selectedEdgeObj) return;
    const sourceTable = selectedEdgeObj.source;
    const targetTable = selectedEdgeObj.target;
    const sourceCol = selectedEdgeObj.sourceHandle?.split('-')[0] || 'id';
    const targetCol = selectedEdgeObj.targetHandle?.split('-')[0] || 'id';

    const promptText = `Generate a highly optimized SQL JOIN query between table "${sourceTable}" and table "${targetTable}" using their connected columns: "${sourceTable}.${sourceCol}" and "${targetTable}.${targetCol}". 
Additionally, provide the equivalent backend model entities (Spring Boot JPA Entities and Lombok annotations if they don't exist, and SQLAlchemy/SQLModel representations for Python) and ORM query code (like Spring Data JPQL or Python SQLAlchemy Joins) representing this query.`;

    setPendingPrompt(promptText);
  }, [selectedEdgeObj, setPendingPrompt]);

  const handleEdgeClick = useCallback(
    (_: React.MouseEvent, edge: Edge) => setFocusedEdge(edge.id), [setFocusedEdge]
  );

  const displayEdges: Edge[] = useMemo(() => {
    const anyFocus = focusedColumn || focusedEdge;
    return edges.map((e) => {
      const isFocused = e.id === focusedEdge;
      const isRelated = focusedColumn && (
        (e.source === focusedColumn.nodeId && e.sourceHandle?.startsWith(focusedColumn.colName + '-')) ||
        (e.target === focusedColumn.nodeId && e.targetHandle?.startsWith(focusedColumn.colName + '-'))
      );
      const active = isFocused || !!isRelated;
      return {
        ...e, type: 'smoothstep', animated: active,
        style: {
          stroke: active ? '#7C5CFF' : anyFocus ? 'rgba(255,255,255,0.02)' : 'rgba(124,92,255,0.15)',
          strokeWidth: active ? 2.5 : 1.5,
          filter: active ? 'drop-shadow(0 0 4px rgba(124,92,255,0.6))' : 'none',
          transition: 'all 0.3s ease',
        },
      };
    });
  }, [edges, focusedColumn, focusedEdge]);

  const displayNodes: Node[] = useMemo(() => {
    if (!focusedColumn && !focusedEdge) return nodes;
    const related = new Set<string>();
    if (focusedEdge) {
      const edge = edges.find((e) => e.id === focusedEdge);
      if (edge) { related.add(edge.source); related.add(edge.target); }
    } else if (focusedColumn) {
      related.add(focusedColumn.nodeId);
      edges.forEach((e) => {
        if (e.source === focusedColumn.nodeId && e.sourceHandle?.startsWith(focusedColumn.colName + '-')) related.add(e.target);
        if (e.target === focusedColumn.nodeId && e.targetHandle?.startsWith(focusedColumn.colName + '-')) related.add(e.source);
      });
    }
    return nodes.map((n) => ({
      ...n, style: { ...n.style, opacity: related.has(n.id) ? 1 : 0.15, transition: 'opacity 0.4s ease' },
    }));
  }, [nodes, edges, focusedColumn, focusedEdge]);

  const handleExportPNG = useCallback(() => {
    setExportOpen(false); setExporting(true);
    setTimeout(() => {
      const el = document.querySelector('.react-flow') as HTMLElement;
      if (!el) { setExporting(false); return; }
      toPng(el, { backgroundColor: '#0B1020', quality: 1, pixelRatio: 2 }).then((url) => {
        const a = document.createElement('a'); a.download = 'schema.png'; a.href = url; a.click(); setExporting(false);
      });
    }, 200);
  }, []);

  const defaultEdgeOptions = useMemo(() => ({
    type: 'smoothstep', style: { stroke: 'rgba(124,92,255,0.15)', strokeWidth: 1.5 },
  }), []);

  return (
    <ReactFlow
      nodes={displayNodes} edges={displayEdges}
      onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect}
      onPaneClick={handlePaneClick} onEdgeClick={handleEdgeClick}
      nodeTypes={nodeTypes} fitView snapToGrid snapGrid={[20, 20]}
      className="bg-[#0B1020]" defaultEdgeOptions={defaultEdgeOptions}
      minZoom={0.05} maxZoom={2.5} proOptions={{ hideAttribution: true }}
    >
      <Background color="rgba(255,255,255,0.03)" gap={32} size={1} />
      {focusedEdge && selectedEdgeObj && (
        <Panel position="top-center" className="p-3 z-50">
          <motion.div 
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="flex items-center gap-4 bg-[#182134]/95 border border-[#7C5CFF]/30 backdrop-blur-xl px-4 py-2.5 rounded-xl shadow-[0_15px_30px_rgba(0,0,0,0.5),_0_0_15px_rgba(124,92,255,0.15)]"
          >
            <div className="w-2.5 h-2.5 rounded-full bg-[#7C5CFF] animate-pulse" />
            <div className="flex flex-col">
              <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider">Active Relationship</span>
              <span className="text-[12px] font-semibold text-slate-100 mt-0.5">
                <strong className="text-indigo-300 font-bold">{selectedEdgeObj.source}</strong> ➔ <strong className="text-sky-300 font-bold">{selectedEdgeObj.target}</strong>
              </span>
            </div>
            <button
              onClick={handleGenerateJoinQuery}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#7C5CFF] to-[#38BDF8] hover:from-[#6B4FE0] hover:to-[#0EA5E9] text-white text-[11px] font-bold transition-all shadow-[0_0_12px_rgba(124,92,255,0.4)] cursor-pointer active:scale-95"
            >
              <Sparkles size={12} className="animate-subtle-pulse" /> Generate Join Query
            </button>
          </motion.div>
        </Panel>
      )}
      <Panel position="bottom-left" className="p-3"><CustomControls /></Panel>
      <Panel position="top-right" className="p-3">
        <div className="relative">
          <button onClick={() => setExportOpen(!exportOpen)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#182134]/90 border border-white/[0.06] backdrop-blur-lg text-[11px] font-medium text-white/50 hover:text-white/80 transition-colors">
            {exporting ? <Loader2 size={13} className="animate-spin" /> : <Share2 size={13} />}
            Export <ChevronDown size={10} className="opacity-40" />
          </button>
          <AnimatePresence>
            {exportOpen && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}
                className="absolute top-full right-0 mt-2 p-1.5 min-w-[160px] bg-[#182134]/90 border border-white/[0.08] backdrop-blur-md rounded-lg shadow-2xl z-50">
                <button onClick={handleExportPNG} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-[11px] font-medium text-white/50 hover:text-white hover:bg-white/[0.04] transition-colors text-left">
                  <ImageIcon size={13} className="text-[#7C5CFF]" /> PNG
                </button>
                <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-[11px] font-medium text-white/50 hover:text-white hover:bg-white/[0.04] transition-colors text-left">
                  <FileText size={13} className="text-[#38BDF8]" /> PDF
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Panel>
      <Panel position="bottom-right" className="p-3">
        <span className="text-[9px] font-medium text-white/10 tracking-wider uppercase">
          Scroll to zoom · Drag to pan
        </span>
      </Panel>
    </ReactFlow>
  );
};

const FlowCanvas = () => (
  <div className="w-full h-full">
    <ReactFlowProvider><FlowInner /></ReactFlowProvider>
  </div>
);

export default FlowCanvas;
