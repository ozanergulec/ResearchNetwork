import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { publicationsApi } from '../../services/publicationService';
import '../../styles/feed/PublicationCitationGraph.css';

interface GNode { id: string; title: string; type: string; }
interface GEdge { source: string; target: string; intent?: string; confidence?: number; sentence?: string; }

interface PublicationCitationGraphProps {
    publicationId: string;
}

interface IntentStyle {
    label: string;
    fill: string;
    stroke: string;
    text: string;
}

// SciCite-fine-tuned SciBERT emits exactly 3 intent labels: background / method / result.
const INTENTS: Record<string, IntentStyle> = {
    background: { label: 'Background', fill: '#f3f4f6', stroke: '#9ca3af', text: '#6b7280' },
    method:     { label: 'Method',     fill: '#ede9fe', stroke: '#8b5cf6', text: '#6d28d9' },
    result:     { label: 'Result',     fill: '#fef3c7', stroke: '#f59e0b', text: '#b45309' },
};

function getStyle(intent?: string): IntentStyle {
    if (!intent) return { label: 'Cites', fill: '#f3f4f6', stroke: '#9ca3af', text: '#6b7280' };
    const l = intent.toLowerCase();
    for (const [k, v] of Object.entries(INTENTS)) { if (l.includes(k)) return v; }
    return { label: intent, fill: '#f3f4f6', stroke: '#9ca3af', text: '#6b7280' };
}

function trunc(s: string, n: number) { return s.length > n ? s.slice(0, n) + '…' : s; }

// Split text into lines that fit within maxChars
function wrapText(text: string, maxChars: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let current = '';
    for (const word of words) {
        if ((current + ' ' + word).trim().length > maxChars && current) {
            lines.push(current.trim());
            current = word;
        } else {
            current = current ? current + ' ' + word : word;
        }
    }
    if (current.trim()) lines.push(current.trim());
    return lines.slice(0, 3); // max 3 lines
}

interface LayoutNode {
    id: string;
    title: string;
    type: string;
    x: number;
    y: number;
    w: number;
    h: number;
    style: IntentStyle;
    sentence?: string;
    confidence?: number;
}

interface LayoutEdge {
    from: LayoutNode;
    to: LayoutNode;
    style: IntentStyle;
    sentence?: string;
}

const PublicationCitationGraph: React.FC<PublicationCitationGraphProps> = ({ publicationId }) => {
    const [nodes, setNodes] = useState<GNode[]>([]);
    const [edges, setEdges] = useState<GEdge[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [fullscreen, setFullscreen] = useState(false);
    const [hoveredNode, setHoveredNode] = useState<string | null>(null);
    const [selectedNode, setSelectedNode] = useState<string | null>(null);

    // We zoom and pan by manipulating the SVG viewBox (vector-accurate, no blur).
    // Zoom uses React state so the UI (percentage label) updates; pan is a ref
    // updated imperatively via requestAnimationFrame for smooth 60 fps dragging.
    const [zoom, setZoom] = useState(1);
    const [zoomDisplay, setZoomDisplay] = useState(100);
    // Pan stored in SVG user-space units (not screen pixels).
    const panRef = useRef({ x: 0, y: 0 });
    const isPanningRef = useRef(false);
    const [cursorStyle, setCursorStyle] = useState<'grab' | 'grabbing'>('grab');
    const panStart = useRef({ x: 0, y: 0 });
    const panOrigin = useRef({ x: 0, y: 0 });
    const svgRef = useRef<SVGSVGElement>(null);
    const rafPending = useRef(false);
    const fsBodyRef = useRef<HTMLDivElement>(null);

    const applyViewBox = useCallback(() => {
        const svg = svgRef.current;
        if (!svg || !layoutBaseRef.current) return;
        const { minX, minY, baseW, baseH } = layoutBaseRef.current;
        const vw = baseW / zoom;
        const vh = baseH / zoom;
        const cx = minX + baseW / 2 - panRef.current.x;
        const cy = minY + baseH / 2 - panRef.current.y;
        svg.setAttribute('viewBox', `${cx - vw / 2} ${cy - vh / 2} ${vw} ${vh}`);
    }, [zoom]);

    // Keep a ref copy of the base viewBox so applyViewBox doesn't need layout in deps.
    const layoutBaseRef = useRef<{ minX: number; minY: number; baseW: number; baseH: number } | null>(null);

    // When zoom changes, sync viewBox + zoom % label.
    useEffect(() => { applyViewBox(); setZoomDisplay(Math.round(zoom * 100)); }, [zoom, applyViewBox]);

    // Reset zoom/pan only when fullscreen opens.
    useEffect(() => {
        if (fullscreen) {
            setZoom(1.4);
            panRef.current = { x: 0, y: 0 };
        }
    }, [fullscreen]);

    // React synthetic `onWheel` is passive since React 17, so e.preventDefault()
    // silently fails and the page scrolls instead of zooming. Attach non-passive
    // native listener via useEffect below.
    useEffect(() => {
        if (!fullscreen) return;
        const el = fsBodyRef.current;
        if (!el) return;
        const onWheel = (e: WheelEvent) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            setZoom(prev => Math.min(Math.max(prev * delta, 0.3), 5));
        };
        el.addEventListener('wheel', onWheel, { passive: false });
        return () => el.removeEventListener('wheel', onWheel);
    }, [fullscreen]);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if (e.button !== 0) return;
        isPanningRef.current = true;
        setCursorStyle('grabbing');
        panStart.current = { x: e.clientX, y: e.clientY };
        panOrigin.current = { ...panRef.current };
    }, []);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (!isPanningRef.current) return;
        const svg = svgRef.current;
        const base = layoutBaseRef.current;
        if (!svg || !base) return;
        // Convert screen-pixel delta to SVG-unit delta (accounts for current zoom & element size).
        const rect = svg.getBoundingClientRect();
        const unitsPerPxX = (base.baseW / zoom) / rect.width;
        const unitsPerPxY = (base.baseH / zoom) / rect.height;
        panRef.current = {
            x: panOrigin.current.x + (e.clientX - panStart.current.x) * unitsPerPxX,
            y: panOrigin.current.y + (e.clientY - panStart.current.y) * unitsPerPxY,
        };
        if (!rafPending.current) {
            rafPending.current = true;
            requestAnimationFrame(() => { rafPending.current = false; applyViewBox(); });
        }
    }, [applyViewBox, zoom]);

    const handleMouseUp = useCallback(() => {
        isPanningRef.current = false;
        setCursorStyle('grab');
    }, []);

    const resetView = useCallback(() => {
        setZoom(1.4);
        panRef.current = { x: 0, y: 0 };
    }, []);

    useEffect(() => {
        const fetch = async () => {
            setLoading(true);
            try {
                const res = await publicationsApi.getCitationGraph(publicationId);
                setNodes(res.data.nodes || []);
                setEdges(res.data.edges || []);
            } catch (e: any) { setError(e.message || 'Failed'); }
            finally { setLoading(false); }
        };
        if (publicationId) fetch();
    }, [publicationId]);

    // Build layout
    const layout = useMemo(() => {
        const source = nodes.find(n => n.type === 'source');
        const refs = nodes.filter(n => n.type === 'reference');
        if (!source || refs.length === 0) return null;

        const cx = 500, cy = 500;
        const count = refs.length;
        const radius = Math.max(260, 180 + count * 12);

        // Source node
        const sourceLayout: LayoutNode = {
            id: source.id, title: source.title, type: 'source',
            x: cx, y: cy, w: 180, h: 70,
            style: { label: 'Current Article', fill: '#fff7ed', stroke: '#f97316', text: '#c2410c' },
        };

        const edgeByTarget = new Map<string, GEdge>();
        for (const e of edges) edgeByTarget.set(e.target, e);

        const refLayouts: LayoutNode[] = refs.map((ref, i) => {
            const angle = -Math.PI / 2 + (2 * Math.PI * i) / count;
            const edge = edgeByTarget.get(ref.id);
            const style = getStyle(edge?.intent);
            return {
                id: ref.id, title: ref.title, type: 'reference',
                x: cx + radius * Math.cos(angle),
                y: cy + radius * Math.sin(angle),
                w: 160, h: 64,
                style,
                sentence: edge?.sentence,
                confidence: edge?.confidence,
            };
        });

        const allNodes = [sourceLayout, ...refLayouts];

        const layoutEdges: LayoutEdge[] = refLayouts.map(rn => {
            return { from: sourceLayout, to: rn, style: rn.style, sentence: rn.sentence };
        });

        // Base viewBox (we zoom by shrinking this, not by CSS transform — keeps SVG sharp)
        const pad = 140;
        const minX = Math.min(...allNodes.map(n => n.x - n.w / 2)) - pad;
        const minY = Math.min(...allNodes.map(n => n.y - n.h / 2)) - pad;
        const maxX = Math.max(...allNodes.map(n => n.x + n.w / 2)) + pad;
        const maxY = Math.max(...allNodes.map(n => n.y + n.h / 2)) + pad;
        const baseW = maxX - minX;
        const baseH = maxY - minY;

        return {
            nodes: allNodes,
            edges: layoutEdges,
            viewBox: `${minX} ${minY} ${baseW} ${baseH}`,
            base: { minX, minY, baseW, baseH },
        };
    }, [nodes, edges]);

    const handleNodeClick = useCallback((id: string) => {
        setSelectedNode(prev => prev === id ? null : id);
    }, []);

    // Keep layoutBaseRef in sync so imperative viewBox updates can read base dims.
    useEffect(() => {
        layoutBaseRef.current = layout?.base ?? null;
    }, [layout]);

    if (loading) return <div className="cg-loading"><div className="pub-detail-preview-spinner"></div><span>Loading citation graph...</span></div>;
    if (error) return <div className="cg-error">{error}</div>;
    if (!layout) return <div className="cg-empty">No citation relationships to visualize.</div>;

    const renderGraph = (fs: boolean) => {
        const fontSize = fs ? 11 : 9;
        const labelSize = fs ? 10 : 8;
        const charLimit = fs ? 22 : 16;

        return (
            <svg
                ref={fs ? svgRef : undefined}
                viewBox={layout.viewBox}
                className="cg-svg"
                preserveAspectRatio="xMidYMid meet"
            >
                <defs>
                    {/* One arrow marker per intent color — not per edge. */}
                    {Object.entries(INTENTS).map(([k, v]) => (
                        <marker key={k} id={`arw-${k}${fs ? 'f' : ''}`}
                            viewBox="0 0 10 10" refX="10" refY="5"
                            markerWidth="7" markerHeight="7" orient="auto-start-reverse"
                        >
                            <path d="M0 0L10 5L0 10z" fill={v.stroke} />
                        </marker>
                    ))}
                    <marker id={`arw-default${fs ? 'f' : ''}`}
                        viewBox="0 0 10 10" refX="10" refY="5"
                        markerWidth="7" markerHeight="7" orient="auto-start-reverse"
                    >
                        <path d="M0 0L10 5L0 10z" fill="#9ca3af" />
                    </marker>
                    <filter id="shadow">
                        <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="rgba(0,0,0,0.08)" />
                    </filter>
                    <filter id="shadowHover">
                        <feDropShadow dx="0" dy="3" stdDeviation="6" floodColor="rgba(0,0,0,0.15)" />
                    </filter>
                </defs>

                {/* Edges */}
                {layout.edges.map((edge, i) => {
                    const { from, to, style } = edge;
                    // Calculate control point for curve
                    const mx = (from.x + to.x) / 2;
                    const my = (from.y + to.y) / 2;
                    // Offset control point perpendicular to the line
                    const dx = to.x - from.x, dy = to.y - from.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    const nx = -dy / dist, ny = dx / dist;
                    const curveOffset = dist * 0.1;
                    const cpx = mx + nx * curveOffset;
                    const cpy = my + ny * curveOffset;

                    // Shorten start/end
                    const startOff = 40, endOff = 35;
                    const ux = dx / dist, uy = dy / dist;
                    const sx = from.x + ux * startOff, sy = from.y + uy * startOff;
                    const tx = to.x - ux * endOff, ty = to.y - uy * endOff;

                    // Label position (on the curve midpoint)
                    const labelX = cpx;
                    const labelY = cpy;

                    const isHighlighted = hoveredNode === to.id || selectedNode === to.id;

                    // Resolve shared marker id from intent label (falls back to default)
                    const intentKey = Object.keys(INTENTS).find(k => style.label === INTENTS[k].label);
                    const markerId = intentKey ? `arw-${intentKey}${fs ? 'f' : ''}` : `arw-default${fs ? 'f' : ''}`;

                    return (
                        <g key={`e${i}`}>
                            {/* Edge path */}
                            <path
                                d={`M${sx},${sy} Q${cpx},${cpy} ${tx},${ty}`}
                                fill="none"
                                stroke={style.stroke}
                                strokeWidth={isHighlighted ? 3 : 1.8}
                                strokeOpacity={isHighlighted ? 1 : 0.5}
                                markerEnd={`url(#${markerId})`}
                            />
                            {/* Intent label on edge */}
                            <g transform={`translate(${labelX},${labelY})`}>
                                <rect x={-32} y={-9} width={64} height={18} rx={9}
                                    fill="#fff" stroke={style.stroke} strokeWidth={1}
                                    opacity={isHighlighted ? 1 : 0.8}
                                />
                                <text textAnchor="middle" dy="4"
                                    fill={style.text} fontSize={labelSize} fontWeight="700"
                                    fontFamily="Inter, system-ui, sans-serif"
                                >
                                    {style.label}
                                </text>
                            </g>
                        </g>
                    );
                })}

                {/* Nodes */}
                {layout.nodes.map((node) => {
                    const isSource = node.type === 'source';
                    const isHovered = hoveredNode === node.id;
                    const isSelected = selectedNode === node.id;
                    const highlighted = isHovered || isSelected;
                    const { w, h, x, y, style } = node;

                    const refNum = node.title.match(/\[(\d+)\]/)?.[0] || '';
                    const cleanTitle = node.title.replace(/^\[\d+\]\s*/, '');
                    const titleLines = wrapText(isSource ? cleanTitle : cleanTitle, charLimit);

                    return (
                        <g key={node.id}
                            onMouseEnter={() => setHoveredNode(node.id)}
                            onMouseLeave={() => setHoveredNode(null)}
                            onClick={() => handleNodeClick(node.id)}
                            style={{ cursor: 'pointer' }}
                        >
                            {/* Node rectangle — SVG filter only applied on hover to avoid
                                per-frame filter graph on 50+ nodes (big perf win). */}
                            <rect
                                x={x - w / 2} y={y - h / 2} width={w} height={h}
                                rx={12} fill={style.fill}
                                stroke={style.stroke}
                                strokeWidth={highlighted ? 3 : 2}
                                filter={highlighted ? 'url(#shadowHover)' : undefined}
                            />

                            {isSource ? (
                                <>
                                    <text x={x} y={y - 10} textAnchor="middle"
                                        fill={style.text} fontSize={labelSize} fontWeight="800"
                                        fontFamily="Inter, system-ui, sans-serif"
                                    >
                                        📄 Current Article
                                    </text>
                                    {titleLines.map((line, li) => (
                                        <text key={li} x={x} y={y + 6 + li * (fontSize + 2)}
                                            textAnchor="middle" fill="#1f2937"
                                            fontSize={fontSize} fontWeight="600"
                                            fontFamily="Inter, system-ui, sans-serif"
                                        >
                                            {trunc(line, charLimit + 6)}
                                        </text>
                                    ))}
                                </>
                            ) : (
                                <>
                                    {refNum && (
                                        <text x={x} y={y - h / 2 + 16} textAnchor="middle"
                                            fill={style.text} fontSize={labelSize} fontWeight="800"
                                            fontFamily="Inter, system-ui, sans-serif"
                                        >
                                            {refNum}
                                        </text>
                                    )}
                                    {titleLines.map((line, li) => (
                                        <text key={li} x={x} y={y - h / 2 + 28 + li * (fontSize + 2)}
                                            textAnchor="middle" fill="#374151"
                                            fontSize={fontSize} fontWeight="500"
                                            fontFamily="Inter, system-ui, sans-serif"
                                        >
                                            {line}
                                        </text>
                                    ))}
                                </>
                            )}

                            {/* Tooltip on hover — foreignObject lets us use real HTML with
                                proper word-wrap instead of clipped SVG <text>. */}
                            {highlighted && !isSource && node.sentence && (() => {
                                const tipW = 300;
                                const tipH = 140;
                                // Center horizontally, but clamp so tooltip stays in the
                                // layout bounds (prevents overflow off-screen).
                                const base = layout.base;
                                const minTipX = base.minX + 8;
                                const maxTipX = base.minX + base.baseW - tipW - 8;
                                const rawTipX = x - tipW / 2;
                                const tipX = Math.max(minTipX, Math.min(maxTipX, rawTipX));
                                // Show above node if node is in lower half (avoids going off-screen).
                                const showAbove = y > base.minY + base.baseH * 0.55;
                                const tipY = showAbove ? y - h / 2 - tipH - 10 : y + h / 2 + 10;
                                return (
                                    <foreignObject
                                        x={tipX} y={tipY} width={tipW} height={tipH}
                                        style={{ pointerEvents: 'none', overflow: 'visible' }}
                                    >
                                        <div
                                            xmlns="http://www.w3.org/1999/xhtml"
                                            style={{
                                                background: 'rgba(17, 24, 39, 0.96)',
                                                color: '#f9fafb',
                                                padding: '10px 12px',
                                                borderRadius: 8,
                                                fontSize: fs ? 12 : 10,
                                                fontFamily: 'Inter, system-ui, sans-serif',
                                                lineHeight: 1.45,
                                                wordBreak: 'break-word',
                                                boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
                                                border: `1px solid ${style.stroke}`,
                                            }}
                                        >
                                            <span style={{ fontStyle: 'italic' }}>“{node.sentence}”</span>
                                        </div>
                                    </foreignObject>
                                );
                            })()}

                            {/* Confidence badge */}
                            {!isSource && node.confidence != null && (
                                <g>
                                    <rect x={x + w / 2 - 28} y={y - h / 2 - 6} width={32} height={16} rx={8}
                                        fill={style.stroke}
                                    />
                                    <text x={x + w / 2 - 12} y={y - h / 2 + 5}
                                        textAnchor="middle" fill="#fff"
                                        fontSize={8} fontWeight="700"
                                        fontFamily="Inter, system-ui, sans-serif"
                                    >
                                        {(node.confidence * 100).toFixed(0)}%
                                    </text>
                                </g>
                            )}
                        </g>
                    );
                })}
            </svg>
        );
    };

    return (
        <>
            {/* Render the inline preview only when fullscreen is closed — saves
                one full SVG worth of DOM (~110 elements × 2) during panning. */}
            {!fullscreen && (
                <div className="cg-inline-container" onClick={() => setFullscreen(true)}>
                    {renderGraph(false)}
                    <div className="cg-expand-hint">🔍 Click for fullscreen</div>
                </div>
            )}

            {fullscreen && (
                <div className="cg-fullscreen-overlay" onClick={(e) => { if (e.target === e.currentTarget) setFullscreen(false); }}>
                    <div className="cg-fullscreen-content">
                        <div className="cg-fullscreen-header">
                            <h3>Citation Relationship Graph</h3>
                            <div className="cg-zoom-controls">
                                <button className="cg-zoom-btn" onClick={() => setZoom(z => Math.min(z * 1.25, 5))} title="Zoom In">＋</button>
                                <span className="cg-zoom-level">{zoomDisplay}%</span>
                                <button className="cg-zoom-btn" onClick={() => setZoom(z => Math.max(z * 0.8, 0.3))} title="Zoom Out">−</button>
                                <button className="cg-zoom-btn cg-zoom-reset" onClick={resetView} title="Reset View">⟳</button>
                            </div>
                            <button className="cg-fullscreen-close" onClick={() => setFullscreen(false)}>✕</button>
                        </div>
                        <div
                            className="cg-fullscreen-body"
                            ref={fsBodyRef}
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                            onMouseLeave={handleMouseUp}
                            style={{ cursor: cursorStyle, overflow: 'hidden' }}
                        >
                            <div
                                className="cg-zoom-wrapper"
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                {renderGraph(true)}
                            </div>
                        </div>
                        <div className="cg-legend-bar">
                            <div className="cg-legend-item"><span style={{ background: '#9ca3af' }}></span> Background</div>
                            <div className="cg-legend-item"><span style={{ background: '#8b5cf6' }}></span> Method</div>
                            <div className="cg-legend-item"><span style={{ background: '#f59e0b' }}></span> Result</div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default PublicationCitationGraph;
