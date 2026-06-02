import { memo } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { Key, Link2, Hash, Type, Calendar, ToggleLeft, Minus } from 'lucide-react';
import useStore from '../../store/useStore';
import { cn } from '../../utils/cn';

/* ── Public Types ─────────────────────────────────────────────── */
export interface ColumnData {
  name: string;
  type: string;
  isPrimary?: boolean;
  isForeignKey?: boolean;
  isNotNull?: boolean;
  isUnique?: boolean;
  references?: { table: string; column: string };
}

export interface TableNodeData {
  label: string;
  columns: ColumnData[];
}

/* ── Helpers ──────────────────────────────────────────────────── */
const typeIcon = (raw?: string) => {
  const t = (raw || 'UNKNOWN').split('(')[0].toUpperCase();
  if (['INT', 'INTEGER', 'BIGINT', 'SERIAL'].includes(t))
    return { Icon: Hash, color: 'text-sky-400' };
  if (['VARCHAR', 'TEXT', 'CHAR', 'STRING'].includes(t))
    return { Icon: Type, color: 'text-emerald-400' };
  if (['BOOLEAN', 'BOOL'].includes(t))
    return { Icon: ToggleLeft, color: 'text-amber-400' };
  if (['TIMESTAMP', 'DATETIME', 'DATE'].includes(t))
    return { Icon: Calendar, color: 'text-rose-400' };
  return { Icon: Minus, color: 'text-slate-400' };
};

/* ── Column Row ───────────────────────────────────────────────── */
const ColumnRow = ({ col, nodeId }: { col: ColumnData; nodeId: string }) => {
  const { focusedColumn, setFocusedColumn, edges, focusedEdge } = useStore();

  const isFocused =
    focusedColumn?.nodeId === nodeId && focusedColumn?.colName === col.name;

  const isRelated = focusedEdge
    ? edges.some(
        (e) =>
          e.id === focusedEdge &&
          ((e.source === nodeId &&
            e.sourceHandle?.startsWith(`${col.name}-`)) ||
            (e.target === nodeId &&
              e.targetHandle?.startsWith(`${col.name}-`)))
      )
    : focusedColumn
      ? edges.some((e) => {
          const srcMatch =
            e.source === focusedColumn.nodeId &&
            e.sourceHandle?.startsWith(`${focusedColumn.colName}-`);
          const tgtMatch =
            e.target === focusedColumn.nodeId &&
            e.targetHandle?.startsWith(`${focusedColumn.colName}-`);
          return (
            (srcMatch &&
              e.target === nodeId &&
              e.targetHandle?.startsWith(`${col.name}-`)) ||
            (tgtMatch &&
              e.source === nodeId &&
              e.sourceHandle?.startsWith(`${col.name}-`))
          );
        })
      : false;

  const isActive = isFocused || isRelated;
  const isDimmed =
    (focusedColumn !== null || focusedEdge !== null) && !isActive;
  const isClickable = col.isPrimary || col.isForeignKey;
  const isDualKey = col.isPrimary && col.isForeignKey;
  const { Icon: TIcon, color: tColor } = typeIcon(col.type);

  // Determine glow color
  const glowColor = col.isPrimary ? 'rgba(124,92,255,' : 'rgba(56,189,248,';

  return (
    <div
      onClick={() =>
        isClickable &&
        setFocusedColumn(isFocused ? null : { nodeId, colName: col.name })
      }
      className={cn(
        'group relative flex items-center gap-3 px-4 py-[7px] transition-all duration-200',
        isClickable ? 'cursor-pointer' : 'cursor-default',
        isDimmed && 'opacity-20',
        !isDimmed && !isActive && 'hover:bg-white/[0.03]'
      )}
      style={isActive ? {
        background: `linear-gradient(90deg, ${glowColor}0.08) 0%, ${glowColor}0.02) 100%)`,
        boxShadow: `inset 0 0 20px ${glowColor}0.06)`,
      } : undefined}
    >
      {/* ── Handles ─────────────────────────────────────────── */}
      {/* PK-only columns: target handles (edges point TO primary keys) */}
      {col.isPrimary && !col.isForeignKey && (
        <>
          <Handle type="target" position={Position.Left} id={`${col.name}-target-left`}
            className={cn('!border-[#182134] !w-[7px] !h-[7px] !-left-[3px]',
              isActive ? '!bg-[#7C5CFF] !shadow-[0_0_8px_rgba(124,92,255,0.6)]' : '!bg-[#7C5CFF]')} />
          <Handle type="target" position={Position.Right} id={`${col.name}-target-right`}
            className={cn('!border-[#182134] !w-[7px] !h-[7px] !-right-[3px]',
              isActive ? '!bg-[#7C5CFF] !shadow-[0_0_8px_rgba(124,92,255,0.6)]' : '!bg-[#7C5CFF]')} />
        </>
      )}

      {/* FK-only columns: source handles (edges go FROM foreign keys) */}
      {col.isForeignKey && !col.isPrimary && (
        <>
          <Handle type="source" position={Position.Left} id={`${col.name}-source-left`}
            className={cn('!border-[#182134] !w-[7px] !h-[7px] !-left-[3px]',
              isActive ? '!bg-[#38BDF8] !shadow-[0_0_8px_rgba(56,189,248,0.6)]' : '!bg-[#38BDF8]')} />
          <Handle type="source" position={Position.Right} id={`${col.name}-source-right`}
            className={cn('!border-[#182134] !w-[7px] !h-[7px] !-right-[3px]',
              isActive ? '!bg-[#38BDF8] !shadow-[0_0_8px_rgba(56,189,248,0.6)]' : '!bg-[#38BDF8]')} />
        </>
      )}

      {/* Dual PK+FK columns (junction tables): BOTH source AND target handles */}
      {isDualKey && (
        <>
          <Handle type="source" position={Position.Left} id={`${col.name}-source-left`}
            className={cn('!border-[#182134] !w-[7px] !h-[7px] !-left-[3px]',
              isActive ? '!bg-[#A78BFA] !shadow-[0_0_8px_rgba(167,139,250,0.6)]' : '!bg-[#A78BFA]')} />
          <Handle type="source" position={Position.Right} id={`${col.name}-source-right`}
            className={cn('!border-[#182134] !w-[7px] !h-[7px] !-right-[3px]',
              isActive ? '!bg-[#A78BFA] !shadow-[0_0_8px_rgba(167,139,250,0.6)]' : '!bg-[#A78BFA]')} />
          <Handle type="target" position={Position.Left} id={`${col.name}-target-left`}
            className="!bg-transparent !border-none !w-0 !h-0 !-left-[3px]" />
          <Handle type="target" position={Position.Right} id={`${col.name}-target-right`}
            className="!bg-transparent !border-none !w-0 !h-0 !-right-[3px]" />
        </>
      )}

      {/* Left glow indicator */}
      {isFocused && (
        <div className="absolute left-0 top-0 bottom-0 w-[2px] rounded-full"
          style={{
            background: col.isPrimary ? '#7C5CFF' : '#38BDF8',
            boxShadow: `0 0 10px ${col.isPrimary ? 'rgba(124,92,255,0.5)' : 'rgba(56,189,248,0.5)'}`,
          }} />
      )}

      {/* Icon with glow */}
      <div className={cn('w-4 flex-shrink-0 flex items-center justify-center transition-all duration-200',
        isActive && 'drop-shadow-[0_0_6px_rgba(124,92,255,0.5)]'
      )}>
        {isDualKey ? (
          <Key size={13} className={cn(isActive ? 'text-[#A78BFA]' : 'text-[#A78BFA]/90')} />
        ) : col.isPrimary ? (
          <Key size={13} className={cn(isActive ? 'text-[#7C5CFF]' : 'text-[#7C5CFF]/90')} />
        ) : col.isForeignKey ? (
          <Link2 size={13} className={cn(isActive ? 'text-[#38BDF8]' : 'text-[#38BDF8]/90')} />
        ) : (
          <TIcon size={11} className={cn('opacity-80', tColor)} />
        )}
      </div>

      {/* Name */}
      <span
        className={cn(
          'flex-1 text-[13px] font-mono font-semibold truncate transition-all duration-200',
          isActive
            ? 'text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]'
            : isDualKey
              ? 'text-[#D8B4FE]'
              : col.isPrimary
                ? 'text-[#C7D2FE]'
                : col.isForeignKey
                  ? 'text-[#38BDF8]'
                  : 'text-slate-100'
        )}
      >
        {col.name}
      </span>

      {/* Constraint badges */}
      <div className="flex items-center gap-1">
        {isDualKey && (
          <span className={cn('text-[7px] font-extrabold uppercase px-1 py-px rounded border',
            isActive 
              ? 'bg-[#A78BFA]/30 text-white border-[#A78BFA]/50 shadow-[0_0_6px_rgba(167,139,250,0.3)]' 
              : 'bg-[#A78BFA]/10 text-[#C4B5FD] border-[#A78BFA]/20'
          )}>PK·FK</span>
        )}
        {col.isNotNull && (
          <span className="text-[7px] font-extrabold text-rose-300 bg-rose-500/10 border border-rose-500/20 px-1 py-px rounded uppercase">NN</span>
        )}
        {col.isUnique && (
          <span className="text-[7px] font-extrabold text-amber-300 bg-amber-500/10 border border-amber-500/20 px-1 py-px rounded uppercase">UQ</span>
        )}
      </div>

      {/* Type badge */}
      <span
        className={cn(
          'text-[10px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded transition-all duration-200 border',
          isActive
            ? col.isPrimary
              ? 'bg-[#7C5CFF]/40 text-white border-[#7C5CFF]/50 shadow-[0_0_8px_rgba(124,92,255,0.4)]'
              : 'bg-[#38BDF8]/40 text-white border-[#38BDF8]/50 shadow-[0_0_8px_rgba(56,189,248,0.4)]'
            : 'bg-white/[0.08] text-slate-200 border-white/[0.12]'
        )}
      >
        {(col.type || 'UNKNOWN').split('(')[0]}
      </span>
    </div>
  );
};

/* ── Section Divider ──────────────────────────────────────────── */
const SectionLabel = ({ label }: { label: string }) => (
  <div className="px-4 py-2 border-t border-white/[0.04] flex items-center">
    <span className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-[#818CF8] bg-[#818CF8]/10 px-2 py-0.5 rounded border border-[#818CF8]/25 shadow-sm">
      {label}
    </span>
  </div>
);

/* ── Table Node ───────────────────────────────────────────────── */
const TableNode = ({ id, data, selected }: NodeProps<TableNodeData>) => {
  const focusedColumn = useStore((s) => s.focusedColumn);
  const focusedEdge = useStore((s) => s.focusedEdge);
  const anyEdges = useStore((s) => s.edges);

  // Check if any column in THIS node is actively focused/related
  const hasActiveCol = focusedColumn?.nodeId === id ||
    (focusedEdge && anyEdges.some(e =>
      e.id === focusedEdge && (e.source === id || e.target === id)
    )) ||
    (focusedColumn && anyEdges.some(e => {
      const srcMatch = e.source === focusedColumn.nodeId && e.sourceHandle?.startsWith(focusedColumn.colName + '-');
      const tgtMatch = e.target === focusedColumn.nodeId && e.targetHandle?.startsWith(focusedColumn.colName + '-');
      return (srcMatch && e.target === id) || (tgtMatch && e.source === id);
    }));

  const pkCols = data.columns.filter((c) => c.isPrimary && !c.isForeignKey);
  const dualCols = data.columns.filter((c) => c.isPrimary && c.isForeignKey);
  const fkCols = data.columns.filter((c) => c.isForeignKey && !c.isPrimary);
  const regCols = data.columns.filter((c) => !c.isPrimary && !c.isForeignKey);

  return (
    <div
      className={cn(
        'rounded-xl min-w-[240px] max-w-[300px] overflow-hidden transition-all duration-300',
        'border bg-gradient-to-br from-[#1d2943]/95 to-[#121927]/95 backdrop-blur-md',
        hasActiveCol
          ? 'shadow-[0_0_40px_rgba(124,92,255,0.25)] animate-shimmer-border border-indigo-500/60'
          : selected
            ? 'border-[#7C5CFF]/50 shadow-[0_0_25px_rgba(124,92,255,0.15)]'
            : 'border-white/[0.08] shadow-[0_10px_35px_rgba(0,0,0,0.55),_inset_0_1px_1px_rgba(255,255,255,0.05)] hover:border-white/[0.15] transition-colors'
      )}
    >
      {/* Header */}
      <div
        className={cn(
          'px-4 py-3 border-b flex items-center gap-3',
          hasActiveCol
            ? 'border-[#7C5CFF]/20 bg-gradient-to-r from-[#7C5CFF]/20 via-[#38BDF8]/8 to-transparent'
            : selected
              ? 'border-[#7C5CFF]/15 bg-gradient-to-r from-[#7C5CFF]/15 to-transparent'
              : 'border-white/[0.05] bg-gradient-to-r from-white/[0.03] to-transparent'
        )}
      >
        <div
          className={cn(
            'w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold transition-all duration-300 border',
            hasActiveCol
              ? 'bg-[#7C5CFF]/25 text-white border-indigo-400/40 shadow-[0_0_12px_rgba(124,92,255,0.5)]'
              : selected
                ? 'bg-[#7C5CFF]/20 text-[#a394ff] border-indigo-400/30'
                : 'bg-white/[0.04] text-indigo-300 border-indigo-500/20 shadow-[0_0_8px_rgba(99,102,241,0.15)]'
          )}
        >
          {data.label.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-[15px] font-black text-white tracking-wide truncate drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">
            {data.label}
          </h3>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            {data.columns.length} fields
          </span>
        </div>
      </div>

      {/* Columns */}
      <div className="py-0.5">
        {pkCols.length > 0 && (
          <>
            <SectionLabel label="Primary Keys" />
            {pkCols.map((col) => (
              <ColumnRow key={col.name} col={col} nodeId={id} />
            ))}
          </>
        )}
        {dualCols.length > 0 && (
          <>
            <SectionLabel label="Composite Keys" />
            {dualCols.map((col) => (
              <ColumnRow key={col.name} col={col} nodeId={id} />
            ))}
          </>
        )}
        {fkCols.length > 0 && (
          <>
            <SectionLabel label="Foreign Keys" />
            {fkCols.map((col) => (
              <ColumnRow key={col.name} col={col} nodeId={id} />
            ))}
          </>
        )}
        {regCols.length > 0 && (
          <>
            <SectionLabel label="Columns" />
            {regCols.map((col) => (
              <ColumnRow key={col.name} col={col} nodeId={id} />
            ))}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-white/[0.04] flex items-center gap-2">
        <div className={cn('w-[5px] h-[5px] rounded-full',
          hasActiveCol ? 'bg-[#7C5CFF] shadow-[0_0_6px_rgba(124,92,255,0.5)]' : 'bg-[#10B981]')} />
        <span className="text-[8px] font-medium text-white/20 uppercase tracking-wider">
          {pkCols.length + dualCols.length} pk · {fkCols.length + dualCols.length} fk · {regCols.length} col
        </span>
      </div>
    </div>
  );
};

export default memo(TableNode);
