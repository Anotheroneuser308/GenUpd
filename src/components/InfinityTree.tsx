import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GameState } from '../types/game';
import { INFINITY_TREE_NODES, BRANCH_CONFIG, InfinityTreeNodeDef } from '../constants/infinityTree';
import { isInfinityMilestoneUnlocked } from '../utils/infinityMilestones';
import {
  Layers,
  CheckCircle2,
  Lock,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sparkles,
  Move,
  Info,
} from 'lucide-react';

interface InfinityTreeProps {
  state: GameState;
  onBuyInfinityTreeNode: (nodeId: string) => void;
}

interface NodeCoords {
  x: number;
  y: number;
}

// 2D Spatial Layout: Nexus (root) in center (0, 0)
const NODE_POSITIONS: Record<string, NodeCoords> = {
  // Center
  root: { x: 0, y: 0 },

  // Pre-Infinity (West)
  pre_1: { x: -150, y: -50 },
  pre_2: { x: -280, y: -90 },
  pre_3: { x: -410, y: -130 },
  pre_4: { x: -540, y: -170 },

  // Automation (North)
  auto_1: { x: 0, y: -130 },
  auto_2: { x: 0, y: -230 },
  auto_3: { x: 0, y: -330 },
  auto_4: { x: 0, y: -430 },
  auto_5: { x: -90, y: -530 },
  auto_6: { x: -90, y: -630 },
  auto_8: { x: -90, y: -730 }, // Auto PE Upgrades
  auto_9: { x: -90, y: -830 }, // Free Automation Matrix
  auto_7: { x: 90, y: -630 },  // Auto Infinity

  // New Features (East)
  feat_1: { x: 150, y: -50 },
  feat_2: { x: 280, y: -90 },
  feat_3: { x: 410, y: -130 },
  feat_4: { x: 540, y: -170 }, // Break Infinity

  // Post-Infinity (South-East extending from feat_4)
  post_1: { x: 670, y: -130 },
  post_2: { x: 780, y: -60 },
  post_3: { x: 860, y: 40 },
  post_4: { x: 910, y: 160 },
};

// Tree Graph Connections (Parent -> Child)
const NODE_CONNECTIONS: [string, string][] = [
  ['root', 'pre_1'],
  ['pre_1', 'pre_2'],
  ['pre_2', 'pre_3'],
  ['pre_3', 'pre_4'],

  ['root', 'auto_1'],
  ['auto_1', 'auto_2'],
  ['auto_2', 'auto_3'],
  ['auto_3', 'auto_4'],
  ['auto_4', 'auto_5'],
  ['auto_5', 'auto_6'],
  ['auto_6', 'auto_8'],
  ['auto_8', 'auto_9'],
  ['auto_6', 'auto_7'],

  ['root', 'feat_1'],
  ['feat_1', 'feat_2'],
  ['feat_2', 'feat_3'],
  ['feat_3', 'feat_4'],

  ['feat_4', 'post_1'],
  ['post_1', 'post_2'],
  ['post_2', 'post_3'],
  ['post_3', 'post_4'],
];

export const InfinityTree: React.FC<InfinityTreeProps> = ({
  state,
  onBuyInfinityTreeNode,
}) => {
  const currentSP = state.infinity?.skillPoints ?? 0;
  const tree = state.infinityTree || {};

  // Selected Node State - defaults to 'root' or first unbought node
  const [selectedNodeId, setSelectedNodeId] = useState<string>('root');

  // Map Navigation State (Pan & Zoom)
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 300, y: 280 });
  const [zoom, setZoom] = useState<number>(0.9);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const panStartRef = useRef<{ x: number; y: number }>({ x: 300, y: 280 });
  const hasMovedRef = useRef<boolean>(false);

  // Center on Nexus (0, 0) on mount
  useEffect(() => {
    if (mapContainerRef.current) {
      const rect = mapContainerRef.current.getBoundingClientRect();
      setPan({
        x: rect.width / 2,
        y: rect.height / 2 + 50,
      });
    }
  }, []);

  const selectedDef: InfinityTreeNodeDef =
    INFINITY_TREE_NODES[selectedNodeId] || INFINITY_TREE_NODES['root'];

  // Check node requirements and status
  const getNodeStatus = useCallback(
    (def: InfinityTreeNodeDef) => {
      const isBought = !!tree[def.id];
      const hasParent = def.req === 'none' || !!tree[def.req];
      const hasUpgradeReq =
        !def.reqUpgrade ||
        (def.reqUpgrade === 'automationExpand' && !!state.infinity?.automationExpand);
      const hasMilestoneReq =
        !def.reqMilestone || isInfinityMilestoneUnlocked(state, def.reqMilestone as any);
      const canAfford = currentSP >= def.cost;
      const canBuy = !isBought && hasParent && hasUpgradeReq && hasMilestoneReq && canAfford;
      const isAvailable = !isBought && hasParent && hasUpgradeReq && hasMilestoneReq;

      return {
        isBought,
        hasParent,
        hasUpgradeReq,
        hasMilestoneReq,
        canAfford,
        canBuy,
        isAvailable,
      };
    },
    [tree, currentSP, state]
  );

  const selectedStatus = getNodeStatus(selectedDef);

  // Mouse pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only drag with primary mouse button
    if (e.button !== 0) return;
    setIsDragging(true);
    hasMovedRef.current = false;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    panStartRef.current = { ...pan };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      hasMovedRef.current = true;
    }
    setPan({
      x: panStartRef.current.x + dx,
      y: panStartRef.current.y + dy,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch pan handlers for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      hasMovedRef.current = false;
      dragStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      panStartRef.current = { ...pan };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - dragStartRef.current.x;
    const dy = e.touches[0].clientY - dragStartRef.current.y;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      hasMovedRef.current = true;
    }
    setPan({
      x: panStartRef.current.x + dx,
      y: panStartRef.current.y + dy,
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Zoom handlers
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
    setZoom((prev) => Math.max(0.4, Math.min(2.0, prev * zoomFactor)));
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(2.0, prev * 1.2));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(0.4, prev / 1.2));
  };

  const handleCenter = (targetX = 0, targetY = 0) => {
    if (mapContainerRef.current) {
      const rect = mapContainerRef.current.getBoundingClientRect();
      setPan({
        x: rect.width / 2 - targetX * zoom,
        y: rect.height / 2 - targetY * zoom,
      });
    }
  };

  const handleResetView = () => {
    setZoom(0.9);
    handleCenter(0, 0);
  };

  // Jump to cluster
  const handleJumpToCluster = (clusterKey: 'root' | 'pre' | 'auto' | 'feat' | 'post') => {
    if (clusterKey === 'root') handleCenter(0, 0);
    else if (clusterKey === 'pre') handleCenter(-300, -100);
    else if (clusterKey === 'auto') handleCenter(0, -450);
    else if (clusterKey === 'feat') handleCenter(300, -100);
    else if (clusterKey === 'post') handleCenter(750, 0);
  };

  // Node Click
  const handleNodeClick = (nodeId: string, e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    if (!hasMovedRef.current) {
      setSelectedNodeId(nodeId);
    }
  };

  const getBranchColor = (branch: string) => {
    switch (branch) {
      case 'pre':
        return { stroke: '#06b6d4', glow: 'rgba(6, 182, 212, 0.5)', fill: 'bg-cyan-950/80', border: 'border-cyan-400' };
      case 'auto':
        return { stroke: '#10b981', glow: 'rgba(16, 185, 129, 0.5)', fill: 'bg-emerald-950/80', border: 'border-emerald-400' };
      case 'feat':
        return { stroke: '#a855f7', glow: 'rgba(168, 85, 247, 0.5)', fill: 'bg-purple-950/80', border: 'border-purple-400' };
      case 'post':
        return { stroke: '#f43f5e', glow: 'rgba(244, 63, 94, 0.5)', fill: 'bg-rose-950/80', border: 'border-rose-400' };
      default:
        return { stroke: '#f59e0b', glow: 'rgba(245, 158, 11, 0.6)', fill: 'bg-amber-950/90', border: 'border-amber-400' };
    }
  };

  return (
    <div className="space-y-4 select-none">
      {/* Top Header & Map Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-amber-400" />
          <h3 className="text-base sm:text-lg font-bold text-white tracking-wide">
            Infinity Skill Tree Map
          </h3>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-900 text-slate-400 border border-slate-800">
            Interactive Map
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="bg-slate-950 border border-amber-500/40 px-3.5 py-1.5 rounded-xl font-mono text-xs flex items-center gap-2 shadow-sm">
            <span className="text-slate-400">Skill Points:</span>
            <span className="text-amber-400 font-bold text-sm tracking-wide">
              {currentSP} SP
            </span>
          </div>

          {/* Quick cluster buttons */}
          <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 p-1 rounded-xl text-[11px] font-mono">
            <button
              type="button"
              onClick={() => handleJumpToCluster('root')}
              className="px-2 py-1 rounded hover:bg-slate-800 text-amber-300 transition-colors cursor-pointer"
            >
              Nexus
            </button>
            <button
              type="button"
              onClick={() => handleJumpToCluster('pre')}
              className="px-2 py-1 rounded hover:bg-slate-800 text-cyan-300 transition-colors cursor-pointer"
            >
              Pre-Inf
            </button>
            <button
              type="button"
              onClick={() => handleJumpToCluster('auto')}
              className="px-2 py-1 rounded hover:bg-slate-800 text-emerald-300 transition-colors cursor-pointer"
            >
              Auto
            </button>
            <button
              type="button"
              onClick={() => handleJumpToCluster('feat')}
              className="px-2 py-1 rounded hover:bg-slate-800 text-purple-300 transition-colors cursor-pointer"
            >
              Features
            </button>
            <button
              type="button"
              onClick={() => handleJumpToCluster('post')}
              className="px-2 py-1 rounded hover:bg-slate-800 text-rose-300 transition-colors cursor-pointer"
            >
              Post-Inf
            </button>
          </div>
        </div>
      </div>

      {/* NODE INFORMATION & PURCHASE PANEL (Always positioned directly above the map) */}
      <div className="bg-slate-900 border-2 border-slate-800 rounded-2xl p-5 shadow-xl transition-all duration-200">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
          {/* Node Meta & Description */}
          <div className="flex items-start gap-4 flex-1">
            <div
              className={`w-14 h-14 rounded-2xl shrink-0 flex items-center justify-center text-2xl border-2 shadow-lg ${
                selectedStatus.isBought
                  ? 'bg-emerald-950/80 border-emerald-400 text-emerald-300 shadow-emerald-950/50'
                  : selectedStatus.isAvailable
                  ? 'bg-amber-950/80 border-amber-400 text-amber-300 shadow-amber-950/50'
                  : 'bg-slate-950 border-slate-700 text-slate-500'
              }`}
            >
              {selectedDef.icon || '⚡'}
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="text-lg font-black text-white tracking-wide">
                  {selectedDef.title}
                </h4>
                <span className="font-mono text-[11px] px-2 py-0.5 rounded-full bg-slate-950 border border-slate-800 text-slate-400">
                  ID: {selectedDef.id}
                </span>
                <span
                  className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                    selectedDef.branch === 'root'
                      ? 'border-amber-500/40 text-amber-300 bg-amber-950/40'
                      : BRANCH_CONFIG[selectedDef.branch as keyof typeof BRANCH_CONFIG]?.badge || 'border-slate-700'
                  }`}
                >
                  {selectedDef.branch === 'root'
                    ? 'Root Nexus'
                    : BRANCH_CONFIG[selectedDef.branch as keyof typeof BRANCH_CONFIG]?.name || selectedDef.branch}
                </span>

                {selectedStatus.isBought && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3 h-3" /> ACTIVE
                  </span>
                )}
              </div>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl">
                {selectedDef.desc}
              </p>

              {/* Requirements row */}
              <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] font-mono text-slate-400">
                <span>
                  Cost: <strong className="text-amber-400 font-bold">{selectedDef.cost} SP</strong>
                </span>

                {selectedDef.req !== 'none' && (
                  <span className="flex items-center gap-1">
                    · Req:{' '}
                    <strong className={tree[selectedDef.req] ? 'text-emerald-400' : 'text-rose-400'}>
                      {INFINITY_TREE_NODES[selectedDef.req]?.title || selectedDef.req}
                      {tree[selectedDef.req] ? ' ✓' : ' 🔒'}
                    </strong>
                  </span>
                )}

                {selectedDef.reqMilestone && (
                  <span className="flex items-center gap-1">
                    · Milestone:{' '}
                    <strong
                      className={
                        isInfinityMilestoneUnlocked(state, selectedDef.reqMilestone as any)
                          ? 'text-emerald-400'
                          : 'text-amber-400'
                      }
                    >
                      {selectedDef.reqMilestone.replace(/_/g, ' ')}
                      {isInfinityMilestoneUnlocked(state, selectedDef.reqMilestone as any) ? ' ✓' : ' 🔒'}
                    </strong>
                  </span>
                )}

                {selectedDef.reqUpgrade && (
                  <span className="flex items-center gap-1">
                    · Matrix:{' '}
                    <strong className={state.infinity?.automationExpand ? 'text-emerald-400' : 'text-purple-400'}>
                      {selectedDef.reqUpgrade}
                      {state.infinity?.automationExpand ? ' ✓' : ' 🔒'}
                    </strong>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action / Buy Button */}
          <div className="shrink-0 w-full lg:w-auto">
            {selectedStatus.isBought ? (
              <div className="px-6 py-3 bg-emerald-950/40 border border-emerald-500/50 text-emerald-300 font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Узел активирован (Purchased)</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => onBuyInfinityTreeNode(selectedDef.id)}
                disabled={!selectedStatus.canBuy}
                className={`w-full lg:w-auto px-7 py-3 rounded-xl font-black text-sm uppercase tracking-wider transition-all transform flex items-center justify-center gap-2 shadow-lg cursor-pointer ${
                  selectedStatus.canBuy
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 shadow-amber-500/30 hover:scale-105 active:scale-95'
                    : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed shadow-none'
                }`}
              >
                {!selectedStatus.hasParent ? (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Требуется предыдущий узел</span>
                  </>
                ) : !selectedStatus.hasMilestoneReq ? (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Требуется майлстоун</span>
                  </>
                ) : !selectedStatus.hasUpgradeReq ? (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Требуется апгрейд матрицы</span>
                  </>
                ) : !selectedStatus.canAfford ? (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Нужно {selectedDef.cost} SP (Не хватает {selectedDef.cost - currentSP} SP)</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Купить за {selectedDef.cost} SP</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* THE INTERACTIVE 2D MAP VIEWPORT */}
      <div
        ref={mapContainerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
        className="relative w-full h-[540px] md:h-[620px] rounded-2xl border-2 border-slate-800 bg-[#030712] overflow-hidden cursor-grab active:cursor-grabbing shadow-inner"
        style={{ touchAction: 'none' }}
      >
        {/* Subtle Map Space Grid Pattern */}
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage: `radial-gradient(circle, #38bdf8 1px, transparent 1px)`,
            backgroundSize: `${32 * zoom}px ${32 * zoom}px`,
            backgroundPosition: `${pan.x}px ${pan.y}px`,
          }}
        />

        {/* Ambient Cosmic Vignette */}
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-950/20 via-transparent to-slate-950/90" />

        {/* Floating Controls Overlay */}
        <div className="absolute top-4 right-4 z-20 flex flex-col items-center gap-1.5 bg-slate-900/90 border border-slate-800 p-1.5 rounded-xl backdrop-blur-md shadow-lg">
          <button
            type="button"
            onClick={handleZoomIn}
            title="Zoom In"
            className="p-2 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            title="Zoom Out"
            className="p-2 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleResetView}
            title="Center and Reset Zoom"
            className="p-2 hover:bg-slate-800 text-amber-400 hover:text-amber-300 rounded-lg transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Helper Drag Overlay Hint */}
        <div className="absolute bottom-4 left-4 z-20 pointer-events-none flex items-center gap-2 bg-slate-950/80 border border-slate-800/80 px-3 py-1.5 rounded-xl text-[11px] font-mono text-slate-400 backdrop-blur-sm">
          <Move className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
          <span>Перетаскивайте карту • Нажмите на кружок для выбора</span>
        </div>

        {/* Transformed Map Canvas */}
        <div
          className="absolute inset-0 origin-top-left transition-transform duration-75 ease-out"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          }}
        >
          {/* SVG Connection Lines */}
          <svg className="absolute overflow-visible pointer-events-none" style={{ left: 0, top: 0 }}>
            {NODE_CONNECTIONS.map(([parentId, childId]) => {
              const from = NODE_POSITIONS[parentId];
              const to = NODE_POSITIONS[childId];
              if (!from || !to) return null;

              const isParentBought = !!tree[parentId];
              const isChildBought = !!tree[childId];
              const isChildDef = INFINITY_TREE_NODES[childId];
              const branchColors = getBranchColor(isChildDef?.branch || 'root');
              const isLineActive = isParentBought && isChildBought;

              return (
                <g key={`edge-${parentId}-${childId}`}>
                  {/* Outer Glow Line */}
                  {isLineActive && (
                    <line
                      x1={from.x}
                      y1={from.y}
                      x2={to.x}
                      y2={to.y}
                      stroke={branchColors.stroke}
                      strokeWidth={6}
                      strokeOpacity={0.3}
                      strokeLinecap="round"
                    />
                  )}
                  {/* Core Line */}
                  <line
                    x1={from.x}
                    y1={from.y}
                    x2={to.x}
                    y2={to.y}
                    stroke={isLineActive ? branchColors.stroke : isParentBought ? '#64748b' : '#334155'}
                    strokeWidth={isLineActive ? 3 : 2}
                    strokeDasharray={isLineActive ? undefined : '5,5'}
                    strokeOpacity={isLineActive ? 1 : isParentBought ? 0.7 : 0.4}
                    strokeLinecap="round"
                  />
                </g>
              );
            })}
          </svg>

          {/* Node Circles */}
          {Object.entries(INFINITY_TREE_NODES).map(([nodeId, def]) => {
            const pos = NODE_POSITIONS[nodeId];
            if (!pos) return null;

            const status = getNodeStatus(def);
            const isSelected = selectedNodeId === nodeId;
            const branchColors = getBranchColor(def.branch);
            const isRoot = nodeId === 'root';
            const radius = isRoot ? 28 : 22; // Small circles

            return (
              <div
                key={nodeId}
                onClick={(e) => handleNodeClick(nodeId, e)}
                className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer group select-none"
                style={{
                  left: pos.x,
                  top: pos.y,
                  width: radius * 2,
                  height: radius * 2,
                }}
              >
                {/* Selection Halo Ring */}
                {isSelected && (
                  <div
                    className="absolute -inset-2 rounded-full border-2 border-white animate-pulse shadow-lg pointer-events-none"
                    style={{
                      boxShadow: `0 0 20px ${branchColors.stroke}`,
                    }}
                  />
                )}

                {/* Available Pulsing Glow Ring */}
                {!status.isBought && status.canBuy && !isSelected && (
                  <div
                    className="absolute -inset-1 rounded-full border border-amber-400/80 animate-ping opacity-60 pointer-events-none"
                  />
                )}

                {/* Node Circle Body */}
                <div
                  className={`w-full h-full rounded-full flex items-center justify-center transition-all transform group-hover:scale-110 shadow-lg ${
                    status.isBought
                      ? 'bg-slate-950 border-2 border-emerald-400 text-emerald-300 shadow-emerald-500/20'
                      : status.isAvailable
                      ? 'bg-slate-900 border-2 border-amber-400 text-amber-200 shadow-amber-500/30'
                      : 'bg-slate-950/90 border border-slate-700/80 text-slate-500'
                  }`}
                  style={{
                    backgroundColor: status.isBought
                      ? '#022c22'
                      : status.isAvailable
                      ? '#1c1917'
                      : '#090d16',
                    borderColor: status.isBought
                      ? '#10b981'
                      : isSelected
                      ? '#ffffff'
                      : status.isAvailable
                      ? branchColors.stroke
                      : '#334155',
                  }}
                >
                  <span className={isRoot ? 'text-lg font-bold' : 'text-sm font-semibold'}>
                    {def.icon || (isRoot ? '∞' : '⚡')}
                  </span>
                </div>

                {/* Status Badges */}
                {status.isBought ? (
                  <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center text-[9px] font-black border border-slate-950 shadow-sm">
                    ✓
                  </div>
                ) : !status.isAvailable ? (
                  <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center text-[9px] border border-slate-950">
                    <Lock className="w-2.5 h-2.5" />
                  </div>
                ) : (
                  <div className="absolute -top-1 -right-1 px-1 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-[9px] font-black border border-slate-950 shadow-sm">
                    {def.cost}
                  </div>
                )}

                {/* Node Label Below Circle */}
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 whitespace-nowrap text-center pointer-events-none">
                  <div
                    className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded shadow-sm ${
                      isSelected
                        ? 'bg-white text-slate-950 font-bold'
                        : status.isBought
                        ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30'
                        : status.isAvailable
                        ? 'bg-slate-900/90 text-amber-200 border border-amber-500/30'
                        : 'bg-slate-950/80 text-slate-500 border border-slate-800'
                    }`}
                  >
                    {isRoot ? 'Nexus' : def.id}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
