"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Users, 
  ChevronDown, 
  ChevronUp, 
  Activity
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TreeNodeData {
  id: string;
  name: string;
  email: string;
  rank: string;
  promotion_level: number;
  status: string;
  is_active: boolean;
  upline_id: string | null;
  level_depth: number;
  direct_sales_count: number;
  group_sales_count: number;
  created_at?: string;
  children: TreeNodeData[];
}

interface TreeVisualizerProps {
  data: TreeNodeData;
}

interface Coords {
  x: number;
  y: number;
}

export function TreeVisualizer({ data }: TreeVisualizerProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const svgRef = React.useRef<SVGSVGElement | null>(null);

  // Tree states
  const [collapsedIds, setCollapsedIds] = React.useState<Set<string>>(new Set());
  const [hoveredNode, setHoveredNode] = React.useState<TreeNodeData | null>(null);
  const [tooltipPos, setTooltipPos] = React.useState({ x: 0, y: 0 });

  // Zoom and Pan states
  const [zoom, setZoom] = React.useState(0.85);
  const [pan, setPan] = React.useState({ x: 120, y: 30 });
  const [isDragging, setIsDragging] = React.useState(false);
  const [dragStart, setDragStart] = React.useState({ x: 0, y: 0 });

  // Toggle Collapse on click
  const toggleCollapse = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Compute Layout (Horizontal Centering, Post-order traversal)
  const coordsMap = React.useMemo(() => {
    const coords = new Map<string, Coords>();
    const state = { nextX: 100 };

    function traverse(node: TreeNodeData, depth: number) {
      const isCollapsed = collapsedIds.has(node.id);
      const y = depth * 190 + 100; // 190px vertical gap

      if (isCollapsed || !node.children || node.children.length === 0) {
        const x = state.nextX;
        state.nextX += 280; // 280px horizontal gap
        coords.set(node.id, { x, y });
      } else {
        node.children.forEach((child) => traverse(child, depth + 1));
        const leftX = coords.get(node.children[0].id)!.x;
        const rightX = coords.get(node.children[node.children.length - 1].id)!.x;
        const x = (leftX + rightX) / 2;
        coords.set(node.id, { x, y });
      }
    }

    traverse(data, 0);
    return coords;
  }, [data, collapsedIds]);

  // Collect flat nodes and links for rendering
  const { nodes, links } = React.useMemo(() => {
    const nodeList: TreeNodeData[] = [];
    const linkList: { parentId: string; childId: string }[] = [];

    function collect(node: TreeNodeData) {
      nodeList.push(node);
      const isCollapsed = collapsedIds.has(node.id);

      if (!isCollapsed && node.children && node.children.length > 0) {
        node.children.forEach((child) => {
          linkList.push({ parentId: node.id, childId: child.id });
          collect(child);
        });
      }
    }

    collect(data);
    return { nodes: nodeList, links: linkList };
  }, [data, collapsedIds]);

  // SVG Mouse wheel zoom
  React.useEffect(() => {
    const svgElement = svgRef.current;
    if (!svgElement) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const scaleFactor = 1.08;
      const zoomIn = e.deltaY < 0;
      setZoom((prev) => {
        const next = zoomIn ? prev * scaleFactor : prev / scaleFactor;
        return Math.max(0.2, Math.min(next, 2.5));
      });
    };

    svgElement.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      svgElement.removeEventListener("wheel", handleWheel);
    };
  }, []);

  // Mouse drag pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).tagName === "button" || (e.target as HTMLElement).closest("button")) {
      return; // Ignore pan triggers on expand button clicks
    }
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Center visualizer views
  const resetView = () => {
    setZoom(0.85);
    setPan({ x: 120, y: 30 });
  };

  // Node rank coloring
  const getRankTheme = (rank: string) => {
    const themes: Record<string, { stroke: string; bg: string; fill: string }> = {
      Director: { stroke: "border-amber-500/50", bg: "from-amber-500/10 to-transparent", fill: "text-amber-500" },
      Manager: { stroke: "border-violet-500/50", bg: "from-violet-500/10 to-transparent", fill: "text-violet-500" },
      "Senior Agent": { stroke: "border-blue-500/50", bg: "from-blue-500/10 to-transparent", fill: "text-blue-500" },
    };
    return themes[rank] || { stroke: "border-border/40", bg: "from-muted/10 to-transparent", fill: "text-muted-foreground" };
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-[620px] rounded-3xl border border-border/40 bg-zinc-950/20 glass-premium overflow-hidden select-none"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Zoom / Reset Action Panel */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 p-1.5 rounded-2xl border border-border/40 bg-zinc-950/80 glass-premium shadow-lg">
        <button
          onClick={() => setZoom((z) => Math.min(2.5, z * 1.15))}
          className="flex h-9 w-9 items-center justify-center rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
          title="Zoom In"
        >
          <ZoomIn className="h-4.5 w-4.5" />
        </button>
        <button
          onClick={() => setZoom((z) => Math.max(0.2, z / 1.15))}
          className="flex h-9 w-9 items-center justify-center rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
          title="Zoom Out"
        >
          <ZoomOut className="h-4.5 w-4.5" />
        </button>
        <div className="h-5 w-px bg-border/40 mx-0.5" />
        <button
          onClick={resetView}
          className="flex h-9 w-9 items-center justify-center rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
          title="Reset View"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>

      {/* SVG Canvas */}
      <svg
        ref={svgRef}
        className={cn(
          "w-full h-full cursor-grab",
          isDragging && "cursor-grabbing"
        )}
        onMouseDown={handleMouseDown}
      >
        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          
          {/* 1. RENDER LINKS (Orthogonal connector lines) */}
          {links.map(({ parentId, childId }) => {
            const parentCoords = coordsMap.get(parentId);
            const childCoords = coordsMap.get(childId);
            if (!parentCoords || !childCoords) return null;

            const px = parentCoords.x;
            const py = parentCoords.y;
            const cx = childCoords.x;
            const cy = childCoords.y;

            // Connect from parent card bottom (y+60) to child card top (y-60)
            const parentBottom = py + 60;
            const childTop = cy - 60;
            const linkMidY = (parentBottom + childTop) / 2;
            const linkPath = `M ${px} ${parentBottom} L ${px} ${linkMidY} L ${cx} ${linkMidY} L ${cx} ${childTop}`;

            return (
              <path
                key={`${parentId}-${childId}`}
                d={linkPath}
                fill="none"
                stroke="var(--border)"
                strokeWidth="2"
                strokeDasharray="4 4"
                className="opacity-60"
              />
            );
          })}

          {/* 2. RENDER NODES */}
          {nodes.map((node) => {
            const coords = coordsMap.get(node.id);
            if (!coords) return null;

            const { x, y } = coords;
            const theme = getRankTheme(node.rank);
            const isCollapsed = collapsedIds.has(node.id);
            const hasChildren = node.children && node.children.length > 0;

            return (
              <g 
                key={node.id} 
                transform={`translate(${x}, ${y})`}
                className="cursor-pointer"
                onMouseEnter={(e) => {
                  const rect = containerRef.current?.getBoundingClientRect();
                  if (rect) {
                    // Position tooltip relative to hovered card coordinates
                    setTooltipPos({
                      x: e.clientX - rect.left + 15,
                      y: e.clientY - rect.top + 15
                    });
                  }
                  setHoveredNode(node);
                }}
                onMouseMove={(e) => {
                  const rect = containerRef.current?.getBoundingClientRect();
                  if (rect) {
                    setTooltipPos({
                      x: e.clientX - rect.left + 15,
                      y: e.clientY - rect.top + 15
                    });
                  }
                }}
                onMouseLeave={() => setHoveredNode(null)}
              >
                {/* Node Box card (width 220px, height 120px) */}
                <rect
                  x="-110"
                  y="-60"
                  width="220"
                  height="120"
                  rx="20"
                  ry="20"
                  fill="rgb(9 9 11)"
                  fillOpacity="0.8"
                  className={cn(
                    "stroke-2 transition-all duration-300",
                    theme.stroke,
                    hoveredNode?.id === node.id && "scale-102 filter drop-shadow-lg stroke-primary/80"
                  )}
                />

                {/* Card visual gradient layer */}
                <rect
                  x="-110"
                  y="-60"
                  width="220"
                  height="120"
                  rx="20"
                  ry="20"
                  fill="url(#card-glow)"
                  className="opacity-10 pointer-events-none"
                />

                {/* Avatar Icon / Initial placeholder */}
                <g transform="translate(-90, -42)">
                  <circle cx="18" cy="18" r="18" fill="var(--muted)" className="opacity-40" />
                  <foreignObject x="0" y="0" width="36" height="36">
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm font-bold uppercase">
                      {node.name.slice(0, 2)}
                    </div>
                  </foreignObject>
                </g>

                {/* Status indicator badge (circle dot) */}
                <circle 
                  cx="-60" 
                  cy="-10" 
                  r="5" 
                  fill={node.is_active ? "var(--emerald-500)" : "var(--rose-500)"} 
                  className={cn(node.is_active ? "shadow-emerald-500" : "shadow-rose-500")} 
                />

                {/* Node Name */}
                <text
                  x="-62"
                  y="-26"
                  textAnchor="start"
                  fontSize="12"
                  fontWeight="bold"
                  fill="var(--foreground)"
                  className="truncate"
                >
                  {node.name.length > 20 ? `${node.name.slice(0, 18)}...` : node.name}
                </text>

                {/* Node Rank badge title */}
                <text
                  x="-62"
                  y="-8"
                  textAnchor="start"
                  fontSize="9"
                  fontWeight="800"
                  letterSpacing="0.05em"
                  className={cn("uppercase", theme.fill)}
                >
                  {node.rank}
                </text>

                {/* Email text */}
                <text
                  x="-90"
                  y="20"
                  textAnchor="start"
                  fontSize="9.5"
                  fill="var(--muted-foreground)"
                >
                  {node.email.length > 24 ? `${node.email.slice(0, 22)}...` : node.email}
                </text>

                {/* Stats Summary Line */}
                <text
                  x="-90"
                  y="38"
                  textAnchor="start"
                  fontSize="9"
                  fill="var(--muted-foreground)"
                  className="opacity-80"
                >
                  Downline recruits: {node.children.length}
                </text>

                {/* Expand / Collapse Overlay Button */}
                {hasChildren && (
                  <g 
                    transform="translate(0, 60)" 
                    onClick={(e) => toggleCollapse(node.id, e)}
                  >
                    <circle 
                      cx="0" 
                      cy="0" 
                      r="12" 
                      fill="rgb(24 24 27)" 
                      stroke="var(--border)" 
                      strokeWidth="1.5" 
                      className="hover:fill-zinc-800 transition-colors"
                    />
                    <foreignObject x="-6" y="-6" width="12" height="12">
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground hover:text-foreground">
                        {isCollapsed ? (
                          <ChevronDown className="h-3 w-3" />
                        ) : (
                          <ChevronUp className="h-3 w-3" />
                        )}
                      </div>
                    </foreignObject>
                  </g>
                )}
              </g>
            );
          })}
        </g>

        {/* Global SVG definitions */}
        <defs>
          <linearGradient id="card-glow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>
        </defs>
      </svg>

      {/* Floating Detailed Hover Tooltip */}
      <AnimatePresence>
        {hoveredNode && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            style={{
              position: "absolute",
              left: tooltipPos.x,
              top: tooltipPos.y,
            }}
            className="z-50 w-72 p-4 rounded-2xl border border-border/50 bg-zinc-950/95 glass-premium shadow-2xl pointer-events-none space-y-3.5"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-muted/40 border border-border/50 text-muted-foreground text-sm font-bold">
                {hoveredNode.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-foreground truncate text-sm">{hoveredNode.name}</h4>
                <p className="text-xs text-muted-foreground truncate">{hoveredNode.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] pt-1.5 border-t border-border/40">
              <div className="space-y-0.5">
                <span className="text-muted-foreground block uppercase tracking-wider text-[8px] font-bold">Rank</span>
                <span className="font-semibold text-primary">{hoveredNode.rank}</span>
              </div>
              <div className="space-y-0.5">
                <span className="text-muted-foreground block uppercase tracking-wider text-[8px] font-bold">Status</span>
                <span className={cn(
                  "font-semibold",
                  hoveredNode.is_active ? "text-emerald-500" : "text-rose-500"
                )}>
                  {hoveredNode.is_active ? "Active" : "Suspended"}
                </span>
              </div>
              <div className="space-y-0.5 mt-1.5">
                <span className="text-muted-foreground block uppercase tracking-wider text-[8px] font-bold">Direct Recruits</span>
                <span className="font-semibold text-foreground flex items-center gap-1">
                  <Users className="h-3 w-3 text-muted-foreground" />
                  {hoveredNode.direct_sales_count}
                </span>
              </div>
              <div className="space-y-0.5 mt-1.5">
                <span className="text-muted-foreground block uppercase tracking-wider text-[8px] font-bold">Total Downline</span>
                <span className="font-semibold text-foreground flex items-center gap-1">
                  <Activity className="h-3 w-3 text-muted-foreground" />
                  {hoveredNode.group_sales_count}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-border/40 text-[9.5px] text-muted-foreground flex justify-between items-center">
              <span>Depth level: {hoveredNode.level_depth}</span>
              <span>Joined: {new Date(hoveredNode.created_at || "").toLocaleDateString()}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
