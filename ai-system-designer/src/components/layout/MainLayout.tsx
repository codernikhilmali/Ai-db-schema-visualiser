import { useState, useRef, useEffect, useCallback } from 'react';
import SchemaEditor from '../Editor/SchemaEditor';
import FlowCanvas from '../FlowCanvas';
import {
  Database, Settings, BrainCircuit, Moon, Sun, Code2, Copy, X, Plus,
  Sparkles, Zap, LayoutGrid, Network, Activity,
  Shield, ScrollText, GitBranch, Braces, PanelLeftClose, PanelLeftOpen,
  ChevronDown, AlertTriangle, CheckCircle2, Lightbulb, Send, User, Bot,
  FolderPlus,
} from 'lucide-react';
import useStore from '../../store/useStore';
import { generateSchemaFromPrompt } from '../../services/aiService';
import { authService } from '../../services/authService';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/cn';
import { calculateSchemaHealth } from '../../utils/schemaHealth';
import { projectService } from '../../services/projectService';
import { parseERSchema } from '../../utils/erParser';

/* ═══════════════════════════════════════════════════════════════
   MAIN LAYOUT — Premium AI Architecture Workspace
   ═══════════════════════════════════════════════════════════════ */
interface AiMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  tables?: number;
  timestamp: Date;
}

const MainLayout = () => {
  const [aiInput, setAiInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiCodeResult, setAiCodeResult] = useState<{
    code: string;
    language: string;
  } | null>(null);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);
  const [activeLeftTab, setActiveLeftTab] = useState<'ai' | 'schema'>('ai');
  const [aiMessages, setAiMessages] = useState<AiMessage[]>([]);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const user = authService.getCurrentUser();

  const handleLogout = () => {
    authService.logout();
    window.location.reload();
  };

  const {
    theme, toggleTheme, jsonSchema, setJsonSchema, sqlSchema, setSqlSchema, updateFromJSON,
    projects, activeProjectId, addProject, switchProject,
    aiThinkingStep, setAiThinkingStep, nodes, edges,
    pendingPrompt, setPendingPrompt,
  } = useStore();

  const { score: healthScore, suggestions } = calculateSchemaHealth(nodes, edges);

  const isDark = theme === 'dark';
  const currentProject = projects.find((p) => p.id === activeProjectId);

  /* ── AI Submit ────────────────────────────────────────────── */
  const thinkingSteps = [
    'Analyzing requirements…',
    'Designing entities…',
    'Optimizing relationships…',
    'Generating SQL…',
    'Validating constraints…',
  ];

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiMessages]);

  const handleAiSubmit = async (override?: string) => {
    const input = override || aiInput;
    if (!input.trim() || isGenerating) return;
    setIsGenerating(true);
    setAiInput('');

    // Add user message
    const userMsg: AiMessage = { id: Date.now().toString(), role: 'user', content: input, timestamp: new Date() };
    setAiMessages(prev => [...prev, userMsg]);

    for (const step of thinkingSteps) {
      setAiThinkingStep(step);
      await new Promise((r) => setTimeout(r, 500 + Math.random() * 500));
    }

    try {
      const res = await generateSchemaFromPrompt(input, jsonSchema);
      let responseText = '';
      let tableCount = 0;
      if (res.type === 'schema_modification' && res.schemaData) {
        const str = JSON.stringify(res.schemaData, null, 2);
        setJsonSchema(str);
        updateFromJSON(str);
        const latestSql = res.sqlData || useStore.getState().sqlSchema;
        if (res.sqlData) setSqlSchema(res.sqlData);
        tableCount = Object.keys(res.schemaData).length;

        // Instantly save to the backend database to prevent any loss of AI progress on refresh
        if (currentProject && authService.isAuthenticated()) {
          projectService.saveProject({
            projectKey: currentProject.id,
            name: currentProject.name,
            description: currentProject.description,
            jsonSchema: str,
            sqlSchema: latestSql,
          });
        }
        // Show the AI's full conversational explanation
        if (res.explanation) {
          responseText = res.explanation;
        } else {
          const tableNames = Object.keys(res.schemaData);
          responseText = `I've designed a schema with ${tableCount} tables: ${tableNames.join(', ')}. All tables include proper primary keys and foreign key relationships.`;
        }
      } else if (res.type === 'code_generation' && res.code) {
        setAiCodeResult({ code: res.code, language: res.language || 'plaintext' });
        if (res.explanation) {
          responseText = res.explanation;
        } else {
          responseText = `Here's your generated ${res.language || 'code'}! Click the code panel to view and copy the full output.`;
        }
      }
      const assistantMsg: AiMessage = { id: (Date.now() + 1).toString(), role: 'assistant', content: responseText, tables: tableCount, timestamp: new Date() };
      setAiMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error(err);
      const errorText = err?.message || 'Failed to process request. Please try again.';
      const errMsg: AiMessage = { id: (Date.now() + 1).toString(), role: 'assistant', content: `⚠️ ${errorText}`, timestamp: new Date() };
      setAiMessages(prev => [...prev, errMsg]);
    } finally {
      setIsGenerating(false);
      setAiThinkingStep(null);
    }
  };

  useEffect(() => {
    if (pendingPrompt) {
      setActiveLeftTab('ai');
      handleAiSubmit(pendingPrompt);
      setPendingPrompt(null);
    }
  }, [pendingPrompt, setPendingPrompt]);

  /* ── Auto-Load projects from backend on mount ────────────── */
  const [hasLoaded, setHasLoaded] = useState(false);
  useEffect(() => {
    if (!authService.isAuthenticated() || hasLoaded) return;
    setHasLoaded(true);

    projectService.fetchProjects().then((savedProjects) => {
      if (savedProjects.length === 0) return;

      const loadedProjects = savedProjects.map((p) => {
        const { nodes: parsedNodes, edges: parsedEdges } = parseERSchema(p.jsonSchema || '{}');
        return {
          id: p.projectKey,
          name: p.name,
          description: p.description || '',
          nodes: parsedNodes,
          edges: parsedEdges,
          jsonSchema: p.jsonSchema || '{}',
          sqlSchema: p.sqlSchema || '',
        };
      });

      // Replace store projects with server data
      useStore.setState({
        projects: loadedProjects,
        activeProjectId: loadedProjects[0].id,
        nodes: loadedProjects[0].nodes,
        edges: loadedProjects[0].edges,
        jsonSchema: loadedProjects[0].jsonSchema,
        sqlSchema: loadedProjects[0].sqlSchema,
      });
    });
  }, [hasLoaded]);

  /* ── Auto-Save active project to backend (debounced) ─────── */
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const saveActiveProjectInstantly = useCallback(() => {
    if (!authService.isAuthenticated() || !hasLoaded || !currentProject) return;
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    projectService.saveProject({
      projectKey: currentProject.id,
      name: currentProject.name,
      description: currentProject.description,
      jsonSchema: jsonSchema,
      sqlSchema: sqlSchema,
    });
  }, [currentProject, jsonSchema, sqlSchema, hasLoaded]);

  useEffect(() => {
    if (!authService.isAuthenticated() || !hasLoaded) return;
    if (!currentProject) return;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      projectService.saveProject({
        projectKey: currentProject.id,
        name: currentProject.name,
        description: currentProject.description,
        jsonSchema: jsonSchema,
        sqlSchema: sqlSchema,
      });
    }, 2000);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [jsonSchema, sqlSchema, currentProject?.id, currentProject?.name, hasLoaded]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (saveTimerRef.current) {
        saveActiveProjectInstantly();
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [saveActiveProjectInstantly]);

  const handleCreateProject = () => {
    if (!newProjectName.trim()) return;
    addProject(newProjectName.trim(), newProjectDesc.trim());
    setNewProjectName('');
    setNewProjectDesc('');
    setShowProjectModal(false);
  };

  /* ── Color tokens ─────────────────────────────────────────── */
  const bg = isDark ? 'bg-[#0B1020]' : 'bg-[#F5F7FB]';
  const panel = isDark ? 'bg-[#111827]/75 backdrop-blur-xl' : 'bg-white/80 backdrop-blur-xl';
  const card = isDark ? 'bg-[#182134]/60 backdrop-blur-md' : 'bg-[#EEF2FF]/60 backdrop-blur-md';
  const border = isDark ? 'border-white/[0.05]' : 'border-[rgba(15,23,42,0.06)]';
  const textPrimary = isDark ? 'text-white/90' : 'text-slate-900';
  const textSecondary = isDark ? 'text-white/40' : 'text-slate-500';
  const textMuted = isDark ? 'text-white/20' : 'text-slate-300';

  return (
    <div className={cn('flex h-screen w-screen overflow-hidden font-sans', bg, textPrimary)}>

      {/* ═════════════════════════════════════════════════════════
          LEFT SIDEBAR
          ═════════════════════════════════════════════════════════ */}
      <motion.aside
        animate={{ width: leftCollapsed ? 0 : 380 }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        className={cn('flex-shrink-0 flex flex-col overflow-hidden border-r z-40', panel, border)}
      >
        {/* Workspace header */}
        <div className={cn('h-12 flex items-center justify-between px-4 border-b flex-shrink-0', border)}>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#7C5CFF]/15 flex items-center justify-center">
              <BrainCircuit size={15} className="text-[#7C5CFF]" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[13px] font-semibold tracking-tight">{currentProject?.name ?? 'Workspace'}</span>
              <ChevronDown size={12} className={textMuted} />
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setShowProjectModal(true)} className={cn('p-1.5 rounded-md transition-colors', isDark ? 'hover:bg-white/[0.04] text-white/30' : 'hover:bg-slate-100 text-slate-400')}>
              <Plus size={14} />
            </button>
            <button onClick={toggleTheme} className={cn('p-1.5 rounded-md transition-colors', isDark ? 'hover:bg-white/[0.04] text-white/30' : 'hover:bg-slate-100 text-slate-400')}>
              {isDark ? <Sun size={14} /> : <Moon size={14} />}
            </button>
            <button onClick={() => setLeftCollapsed(true)} className={cn('p-1.5 rounded-md transition-colors', isDark ? 'hover:bg-white/[0.04] text-white/30' : 'hover:bg-slate-100 text-slate-400')}>
              <PanelLeftClose size={14} />
            </button>
          </div>
        </div>

        {/* Project tabs */}
        {projects.length > 1 && (
          <div className={cn('flex items-center gap-1 px-3 py-2 border-b overflow-x-auto', border)}>
            {projects.map((p) => (
              <button
                key={p.id}
                onClick={() => switchProject(p.id)}
                className={cn(
                  'px-2.5 py-1 rounded-md text-[10px] font-medium transition-colors whitespace-nowrap',
                  p.id === activeProjectId
                    ? 'bg-[#7C5CFF]/15 text-[#7C5CFF]'
                    : cn(isDark ? 'text-white/30 hover:text-white/50' : 'text-slate-400 hover:text-slate-600')
                )}
              >
                {p.name}
              </button>
            ))}
          </div>
        )}

        {/* Tab switcher: AI / Schema */}
        <div className={cn('flex border-b flex-shrink-0', border)}>
          {([
            { id: 'ai' as const, label: 'AI Architect', icon: <Sparkles size={13} /> },
            { id: 'schema' as const, label: 'Schema', icon: <Braces size={13} /> },
          ]).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveLeftTab(tab.id)}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-2.5 text-[11px] font-medium transition-colors border-b-2',
                activeLeftTab === tab.id
                  ? 'text-[#7C5CFF] border-[#7C5CFF]'
                  : cn(textMuted, 'border-transparent hover:text-white/40')
              )}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {activeLeftTab === 'ai' ? (
            /* ── AI ARCHITECT TAB ─────────────────────────────── */
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Scrollable area: messages OR templates */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {aiMessages.length === 0 ? (
                  /* ── Empty state: Hero + Templates + Quick Actions ── */
                  <>
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#7C5CFF]/20 to-[#38BDF8]/10 flex items-center justify-center">
                          <Sparkles size={16} className="text-[#7C5CFF]" />
                        </div>
                        <h2 className="text-[15px] font-semibold tracking-tight">AI Architect</h2>
                      </div>
                      <p className={cn('text-[12px] leading-relaxed', textSecondary)}>
                        Describe your system and let AI generate scalable database schemas.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <span className={cn('text-[10px] font-medium uppercase tracking-wider', textMuted)}>Templates</span>
                      <div className="grid grid-cols-1 gap-1.5">
                        {[
                          { label: 'Multi-tenant SaaS with RBAC', icon: <Zap size={12} /> },
                          { label: 'E-commerce with Inventory', icon: <LayoutGrid size={12} /> },
                          { label: 'Social Network Graph', icon: <Network size={12} /> },
                        ].map((s) => (
                          <button key={s.label} onClick={() => handleAiSubmit(s.label)}
                            className={cn('flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-all group',
                              isDark ? 'bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] hover:border-white/[0.08]' : 'bg-slate-50 border border-slate-100 hover:bg-slate-100')}>
                            <span className="text-[#7C5CFF]/60 group-hover:text-[#7C5CFF] transition-colors">{s.icon}</span>
                            <span className={cn('text-[11px] font-medium', isDark ? 'text-white/50 group-hover:text-white/80' : 'text-slate-500 group-hover:text-slate-800')}>{s.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <span className={cn('text-[10px] font-medium uppercase tracking-wider', textMuted)}>Quick Actions</span>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { label: 'Add Auth', icon: <Shield size={10} /> },
                          { label: 'Add Audit Logs', icon: <ScrollText size={10} /> },
                          { label: 'Optimize Relations', icon: <GitBranch size={10} /> },
                        ].map((a) => (
                          <button key={a.label} onClick={() => handleAiSubmit(a.label)}
                            className={cn('flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[10px] font-medium transition-colors',
                              isDark ? 'bg-[#7C5CFF]/[0.06] border border-[#7C5CFF]/10 text-[#7C5CFF]/60 hover:text-[#7C5CFF] hover:bg-[#7C5CFF]/10' : 'bg-violet-50 border border-violet-100 text-violet-500 hover:bg-violet-100')}>
                            {a.icon} {a.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  /* ── Messages ── */
                  <>
                    {aiMessages.map((msg) => (
                      <div key={msg.id} className={cn('flex gap-2.5', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                        {msg.role === 'assistant' && (
                          <div className="w-6 h-6 rounded-lg bg-[#7C5CFF]/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Bot size={12} className="text-[#7C5CFF]" />
                          </div>
                        )}
                        <div className={cn('rounded-xl px-3 py-2.5 text-[12px] leading-relaxed',
                          msg.role === 'user'
                            ? 'max-w-[85%] bg-[#7C5CFF] text-white rounded-br-sm'
                            : cn('max-w-[92%]', card, 'border rounded-bl-sm', border, isDark ? 'text-white/70' : 'text-slate-600')
                        )}>
                          {msg.role === 'assistant' ? (
                            <div className="ai-response-content space-y-2">
                              {msg.content.split('\n').map((line, i) => {
                                if (!line.trim()) return <div key={i} className="h-1" />;
                                
                                // Render inline bold text: **text** → <strong>
                                const renderInline = (text: string) => {
                                  const parts = text.split(/\*\*(.*?)\*\*/);
                                  return parts.map((part, j) => 
                                    j % 2 === 1 
                                      ? <strong key={j} className={isDark ? 'text-white/95 font-semibold' : 'text-slate-800 font-semibold'}>{part}</strong> 
                                      : <span key={j}>{part}</span>
                                  );
                                };
                                
                                const trimmed = line.trim();
                                
                                // Bullet point lines (• character or - prefix)
                                if (trimmed.startsWith('•') || trimmed.startsWith('- ')) {
                                  const bulletText = trimmed.startsWith('•') ? trimmed.slice(1).trim() : trimmed.slice(2).trim();
                                  return (
                                    <div key={i} className="flex gap-2 pl-1 py-0.5">
                                      <span className="text-[#7C5CFF] mt-[2px] flex-shrink-0 text-[8px]">●</span>
                                      <span className={cn('text-[11.5px] leading-relaxed', isDark ? 'text-white/65' : 'text-slate-600')}>
                                        {renderInline(bulletText)}
                                      </span>
                                    </div>
                                  );
                                }
                                
                                // Emoji-prefixed lines (status indicators)
                                const hasEmoji = /^[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u.test(trimmed);
                                if (hasEmoji) {
                                  return (
                                    <p key={i} className={cn('text-[11.5px] leading-relaxed mt-1', isDark ? 'text-white/50' : 'text-slate-500')}>
                                      {renderInline(line)}
                                    </p>
                                  );
                                }
                                
                                // Regular paragraphs
                                return (
                                  <p key={i} className={cn('text-[12px] leading-[1.7]', isDark ? 'text-white/65' : 'text-slate-600')}>
                                    {renderInline(line)}
                                  </p>
                                );
                              })}
                            </div>
                          ) : (
                            msg.content
                          )}
                        </div>
                        {msg.role === 'user' && (
                          <div className="w-6 h-6 rounded-lg bg-white/[0.06] flex items-center justify-center flex-shrink-0 mt-0.5">
                            <User size={12} className={textMuted} />
                          </div>
                        )}
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* ── Fixed input at bottom ── */}
              <div className={cn('flex-shrink-0 border-t p-3', border)}>
                <div className={cn('rounded-xl border p-2.5', card, border)}>
                  <textarea
                    value={aiInput}
                    onChange={(e) => setAiInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAiSubmit(); } }}
                    placeholder={aiMessages.length > 0 ? 'Ask a follow-up or modify the schema…' : 'Describe your database system…'}
                    rows={2}
                    className={cn('w-full bg-transparent border-none outline-none resize-none text-[12px] leading-relaxed',
                      isDark ? 'placeholder:text-white/15 text-white/80' : 'placeholder:text-slate-300 text-slate-800')}
                  />
                  <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-white/[0.04]">
                    <span className={cn('text-[9px] font-medium', textMuted)}>⏎ Send · ⇧⏎ New line</span>
                    <button
                      onClick={() => handleAiSubmit()}
                      disabled={isGenerating || !aiInput.trim()}
                      className={cn('p-1.5 rounded-lg transition-all',
                        aiInput.trim() ? 'bg-[#7C5CFF] text-white hover:bg-[#6B4FE0]' : 'bg-white/[0.04] text-white/20 cursor-not-allowed')}
                    >
                      <Send size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* ── SCHEMA TAB ───────────────────────────────────── */
            <div className="flex-1 overflow-hidden">
              <SchemaEditor />
            </div>
          )}
        </div>
      </motion.aside>

      {/* ═════════════════════════════════════════════════════════
          CENTER CANVAS
          ═════════════════════════════════════════════════════════ */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Top toolbar */}
        <div className={cn(
          'h-11 flex items-center justify-between px-4 border-b flex-shrink-0 z-30',
          panel, border
        )}>
          {/* Left */}
          <div className="flex items-center gap-3">
            {leftCollapsed && (
              <button onClick={() => setLeftCollapsed(false)} className={cn('p-1.5 rounded-md transition-colors', isDark ? 'hover:bg-white/[0.04] text-white/30' : 'hover:bg-slate-100 text-slate-400')}>
                <PanelLeftOpen size={14} />
              </button>
            )}
            <div className="flex items-center gap-2">
              <Database size={13} className="text-[#7C5CFF]" />
              <span className="text-[12px] font-semibold">{currentProject?.name}</span>
            </div>
            <div className={cn('h-4 w-px', isDark ? 'bg-white/[0.06]' : 'bg-slate-200')} />
            <span className={cn('text-[10px] font-medium', textMuted)}>
              {nodes.length} {nodes.length === 1 ? 'table' : 'tables'}
            </span>
          </div>

          {/* Centered Tip Badge */}
          <div className={cn(
            "hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-medium shadow-sm animate-pulse",
            isDark 
              ? "bg-[#7C5CFF]/[0.08] border-[#7C5CFF]/20 text-[#9F85FF]" 
              : "bg-violet-50 border-violet-100 text-violet-600"
          )}>
            <Sparkles size={11} className={isDark ? "text-[#7C5CFF]" : "text-violet-500"} />
            <span>Click on a key (🔑) to check and highlight routes</span>
          </div>

          {/* Right */}
          <div className="flex items-center gap-2">
            {/* Health badge */}
            <div className={cn(
              'flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-semibold transition-all duration-300',
              healthScore >= 80
                ? isDark ? 'bg-[#10B981]/15 text-[#10B981]' : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                : healthScore >= 50
                  ? isDark ? 'bg-amber-500/15 text-amber-400' : 'bg-amber-50 text-amber-600 border border-amber-200'
                  : isDark ? 'bg-rose-500/15 text-rose-400' : 'bg-rose-50 text-rose-600 border border-rose-200'
            )}>
              <Activity size={10} className={cn(healthScore < 90 && 'animate-pulse')} />
              <span>{healthScore}% Health</span>
            </div>
            {/* Insights toggle */}
            <button
              onClick={() => setRightOpen(!rightOpen)}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-medium transition-colors',
                rightOpen
                  ? 'bg-[#7C5CFF]/15 text-[#7C5CFF]'
                  : cn(isDark ? 'text-white/30 hover:text-white/50 hover:bg-white/[0.04]' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50')
              )}
            >
              <Lightbulb size={11} /> Insights
            </button>
            <button className={cn('p-1.5 rounded-md transition-colors', isDark ? 'hover:bg-white/[0.04] text-white/30' : 'hover:bg-slate-100 text-slate-400')}>
              <Settings size={13} />
            </button>

            {/* User Dropdown */}
            {user && (
              <div className="relative">
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className={cn(
                    "flex items-center gap-2 p-1 px-2.5 rounded-full border transition-all cursor-pointer",
                    isDark 
                      ? "bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.06] text-white" 
                      : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-800"
                  )}
                >
                  <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center text-[10px] font-bold text-white uppercase">
                    {user.email.charAt(0)}
                  </div>
                  <span className="text-[10px] font-semibold hidden md:inline max-w-[80px] truncate">
                    {user.email.split('@')[0]}
                  </span>
                  <ChevronDown size={10} className={textSecondary} />
                </button>

                <AnimatePresence>
                  {userDropdownOpen && (
                    <>
                      {/* Invisible backdrop to close on click outside */}
                      <div className="fixed inset-0 z-40" onClick={() => setUserDropdownOpen(false)} />
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className={cn(
                          "absolute right-0 mt-1.5 w-48 rounded-xl border p-1 z-50 shadow-xl",
                          panel, border
                        )}
                      >
                        <div className="px-2.5 py-2 border-b border-white/[0.04] mb-1">
                          <p className="text-[9px] font-semibold uppercase tracking-wider text-white/30">Signed in as</p>
                          <p className="text-[11px] font-medium truncate text-white/80 mt-0.5">{user.email}</p>
                        </div>
                        <button
                          onClick={handleLogout}
                          className="w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-2 cursor-pointer"
                        >
                          Log Out
                        </button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

        {/* Canvas + right panel */}
        <div className="flex-1 flex overflow-hidden">
          {/* Canvas area */}
          <div className={cn('flex-1 relative overflow-hidden', bg)}>
            {/* Ambient Glowing Orbs */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden z-10 opacity-30">
              <div className="absolute top-[20%] left-[20%] w-[350px] h-[350px] bg-indigo-600/15 blur-[120px] rounded-full animate-float-1" />
              <div className="absolute bottom-[30%] right-[15%] w-[400px] h-[400px] bg-purple-600/10 blur-[130px] rounded-full animate-float-2" />
              <div className="absolute top-[40%] right-[40%] w-[300px] h-[300px] bg-sky-600/10 blur-[110px] rounded-full animate-float-3" />
            </div>
            <FlowCanvas />

            {/* AI thinking overlay */}
            <AnimatePresence>
              {aiThinkingStep && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-50 flex items-center justify-center bg-[#0B1020]/70 backdrop-blur-[3px]"
                >
                  <div className="flex flex-col items-center gap-5">
                    <div className="relative w-16 h-16">
                      <div className="absolute inset-0 rounded-full border border-[#7C5CFF]/20" />
                      <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#7C5CFF] animate-spin-slow" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Sparkles size={22} className="text-[#7C5CFF] animate-subtle-pulse" />
                      </div>
                    </div>
                    <div className="text-center space-y-1">
                      <p className="text-[14px] font-semibold text-white/80">{aiThinkingStep}</p>
                      <p className="text-[10px] font-medium text-white/20 uppercase tracking-widest">Processing</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ═══════════════════════════════════════════════════════
              RIGHT INSIGHTS PANEL
              ═══════════════════════════════════════════════════════ */}
          <AnimatePresence>
            {rightOpen && (
              <motion.aside
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 280, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                className={cn('flex-shrink-0 flex flex-col overflow-hidden border-l', panel, border)}
              >
                {/* Header */}
                <div className={cn('h-11 flex items-center justify-between px-4 border-b flex-shrink-0', border)}>
                  <span className="text-[11px] font-semibold">AI Insights</span>
                  <button onClick={() => setRightOpen(false)} className={cn('p-1 rounded-md', isDark ? 'text-white/30 hover:text-white/50' : 'text-slate-400 hover:text-slate-600')}>
                    <X size={13} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {/* Health score */}
                  <div className={cn('p-3 rounded-lg border transition-all duration-300', card, border)}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={cn('text-[10px] font-medium uppercase tracking-wider', textMuted)}>Schema Health</span>
                      <span className={cn('text-[18px] font-bold transition-colors duration-300', 
                        healthScore >= 80 ? 'text-[#10B981]' : healthScore >= 50 ? 'text-amber-400' : 'text-rose-400'
                      )}>{healthScore}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
                      <div className={cn('h-full rounded-full transition-all duration-500 ease-out',
                        healthScore >= 80 ? 'bg-[#10B981] shadow-[0_0_8px_rgba(16,185,129,0.5)]' : healthScore >= 50 ? 'bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'bg-rose-400 shadow-[0_0_8px_rgba(239,68,68,0.5)]'
                      )} style={{ width: `${healthScore}%` }} />
                    </div>
                  </div>

                  {/* Suggestions */}
                  <div className="space-y-2">
                    <span className={cn('text-[10px] font-medium uppercase tracking-wider', textMuted)}>Suggestions</span>
                    {suggestions.map((s, i) => {
                      let icon = <Lightbulb size={12} />;
                      let color = 'text-[#38BDF8]';
                      if (s.type === 'error') {
                        icon = <AlertTriangle size={12} />;
                        color = 'text-rose-400';
                      } else if (s.type === 'warning') {
                        icon = <AlertTriangle size={12} />;
                        color = 'text-amber-400';
                      } else if (s.type === 'success') {
                        icon = <CheckCircle2 size={12} />;
                        color = 'text-[#10B981]';
                      }
                      
                      return (
                        <div key={i} className={cn('flex items-start gap-2.5 p-2.5 rounded-lg border border-transparent transition-all', 
                          isDark ? 'bg-white/[0.02] hover:bg-white/[0.04]' : 'bg-slate-50 hover:bg-slate-100/80')}>
                          <span className={cn('mt-0.5 flex-shrink-0', color)}>{icon}</span>
                          <span className={cn('text-[11.5px] leading-relaxed font-medium', textSecondary)}>{s.text}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Stats */}
                  <div className="space-y-2">
                    <span className={cn('text-[10px] font-medium uppercase tracking-wider', textMuted)}>Statistics</span>
                    <div className={cn('grid grid-cols-2 gap-2')}>
                      {[
                        { label: 'Tables', value: nodes.length },
                        { label: 'Relations', value: useStore.getState().edges.length },
                        { label: 'Columns', value: nodes.reduce((a, n) => a + (n.data?.columns?.length || 0), 0) },
                        { label: 'PKs', value: nodes.reduce((a, n) => a + (n.data?.columns?.filter((c: { isPrimary?: boolean }) => c.isPrimary)?.length || 0), 0) },
                      ].map((s) => (
                        <div key={s.label} className={cn('p-2.5 rounded-lg text-center', card)}>
                          <div className="text-[16px] font-bold">{s.value}</div>
                          <div className={cn('text-[9px] font-medium uppercase tracking-wider', textMuted)}>{s.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.aside>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* ═════════════════════════════════════════════════════════
          CODE OUTPUT MODAL
          ═════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {aiCodeResult && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-8">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setAiCodeResult(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 20 }}
              className={cn('relative w-full max-w-4xl h-[80vh] rounded-2xl overflow-hidden border flex flex-col', panel, border)}
            >
              <div className={cn('h-12 flex items-center justify-between px-5 border-b flex-shrink-0', border)}>
                <div className="flex items-center gap-2.5">
                  <Code2 size={15} className="text-[#7C5CFF]" />
                  <span className="text-[13px] font-semibold">Generated Code</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigator.clipboard.writeText(aiCodeResult.code)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#7C5CFF] text-white text-[11px] font-medium hover:bg-[#6B4FE0] transition-colors"
                  >
                    <Copy size={12} /> Copy
                  </button>
                  <button onClick={() => setAiCodeResult(null)} className={cn('p-1.5 rounded-md', isDark ? 'text-white/30 hover:text-white/50' : 'text-slate-400')}>
                    <X size={16} />
                  </button>
                </div>
              </div>
              <div className={cn('flex-1 p-6 overflow-auto font-mono text-[12px] leading-relaxed', bg, isDark ? 'text-white/60' : 'text-slate-700')}>
                <pre className="whitespace-pre-wrap">{aiCodeResult.code}</pre>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ═════════════════════════════════════════════════════════
          PROJECT CREATION MODAL
          ═════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showProjectModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-8">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowProjectModal(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={cn('relative w-full max-w-md rounded-2xl overflow-hidden border flex flex-col', panel, border)}
            >
              <div className={cn('px-5 py-4 border-b flex items-center gap-3', border)}>
                <div className="w-8 h-8 rounded-lg bg-[#7C5CFF]/15 flex items-center justify-center">
                  <FolderPlus size={16} className="text-[#7C5CFF]" />
                </div>
                <div>
                  <h3 className="text-[14px] font-semibold">New Project</h3>
                  <p className={cn('text-[11px]', textMuted)}>Create a new database workspace</p>
                </div>
              </div>
              <div className="p-5 space-y-4">
                <div className="space-y-1.5">
                  <label className={cn('text-[11px] font-medium', textSecondary)}>Project Name *</label>
                  <input
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleCreateProject(); }}
                    placeholder="My SaaS App"
                    autoFocus
                    className={cn('w-full px-3 py-2.5 rounded-lg border text-[13px] outline-none transition-colors',
                      isDark
                        ? 'bg-white/[0.03] border-white/[0.08] text-white placeholder:text-white/20 focus:border-[#7C5CFF]/40'
                        : 'bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-300 focus:border-[#7C5CFF]')}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className={cn('text-[11px] font-medium', textSecondary)}>Description <span className={textMuted}>(optional)</span></label>
                  <textarea
                    value={newProjectDesc}
                    onChange={(e) => setNewProjectDesc(e.target.value)}
                    placeholder="Brief description of what this project is about…"
                    rows={2}
                    className={cn('w-full px-3 py-2.5 rounded-lg border text-[12px] outline-none resize-none transition-colors',
                      isDark
                        ? 'bg-white/[0.03] border-white/[0.08] text-white placeholder:text-white/20 focus:border-[#7C5CFF]/40'
                        : 'bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-300 focus:border-[#7C5CFF]')}
                  />
                </div>
              </div>
              <div className={cn('px-5 py-3 border-t flex items-center justify-end gap-2', border)}>
                <button
                  onClick={() => setShowProjectModal(false)}
                  className={cn('px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors',
                    isDark ? 'text-white/40 hover:text-white/60 hover:bg-white/[0.04]' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50')}
                >Cancel</button>
                <button
                  onClick={handleCreateProject}
                  disabled={!newProjectName.trim()}
                  className={cn('px-4 py-1.5 rounded-lg text-[12px] font-semibold transition-all',
                    newProjectName.trim()
                      ? 'bg-[#7C5CFF] text-white hover:bg-[#6B4FE0]'
                      : 'bg-white/[0.04] text-white/20 cursor-not-allowed')}
                >Create Project</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MainLayout;
