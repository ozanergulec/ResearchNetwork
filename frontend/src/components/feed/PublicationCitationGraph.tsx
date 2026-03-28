import React, { useEffect, useState, useMemo, useCallback } from 'react';
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

const INTENTS: Record<string, IntentStyle> = {
    support:    { label: 'Supports',    fill: '#dcfce7', stroke: '#22c55e', text: '#15803d' },
    contradict: { label: 'Contradicts', fill: '#fee2e2', stroke: '#ef4444', text: '#b91c1c' },
    dispute:    { label: 'Contradicts', fill: '#fee2e2', stroke: '#ef4444', text: '#b91c1c' },
    method:     { label: 'Uses Method', fill: '#ede9fe', stroke: '#8b5cf6', text: '#6d28d9' },
    use:        { label: 'Uses Method', fill: '#ede9fe', stroke: '#8b5cf6', text: '#6d28d9' },
    extend:     { label: 'Extends',     fill: '#dbeafe', stroke: '#3b82f6', text: '#1d4ed8' },
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

        // Reference nodes in a circle
        const refLayouts: LayoutNode[] = refs.map((ref, i) => {
            const angle = -Math.PI / 2 + (2 * Math.PI * i) / count;
            const edge = edges.find(e => e.target === ref.id);
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

        // Calculate viewBox
        const pad = 140;
        const minX = Math.min(...allNodes.map(n => n.x - n.w / 2)) - pad;
        const minY = Math.min(...allNodes.map(n => n.y - n.h / 2)) - pad;
        const maxX = Math.max(...allNodes.map(n => n.x + n.w / 2)) + pad;
        const maxY = Math.max(...allNodes.map(n => n.y + n.h / 2)) + pad;

        return { nodes: allNodes, edges: layoutEdges, viewBox: `${minX} ${minY} ${maxX - minX} ${maxY - minY}` };
    }, [nodes, edges]);

    const handleNodeClick = useCallback((id: string) => {
        setSelectedNode(prev => prev === id ? null : id);
    }, []);

    if (loading) return <div className="cg-loading"><div className="pub-detail-preview-spinner"></div><span>Loading citation graph...</span></div>;
    if (error) return <div className="cg-error">{error}</div>;
    if (!layout) return <div className="cg-empty">No citation relationships to visualize.</div>;

    const renderGraph = (fs: boolean) => {
        const fontSize = fs ? 11 : 9;
        const labelSize = fs ? 10 : 8;
        const charLimit = fs ? 22 : 16;

        return (
            <svg viewBox={layout.viewBox} className="cg-svg" preserveAspectRatio="xMidYMid meet">
                <defs>
                    {layout.edges.map((_, i) => (
                        <marker key={`a${i}`} id={`arw${i}${fs?'f':''}`}
                            viewBox="0 0 10 10" refX="10" refY="5"
                            markerWidth="7" markerHeight="7" orient="auto-start-reverse"
                        >
                            <path d="M0 0L10 5L0 10z" fill={layout.edges[i].style.stroke} />
                        </marker>
                    ))}
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

                    return (
                        <g key={`e${i}`}>
                            {/* Edge path */}
                            <path
                                d={`M${sx},${sy} Q${cpx},${cpy} ${tx},${ty}`}
                                fill="none"
                                stroke={style.stroke}
                                strokeWidth={isHighlighted ? 3 : 1.8}
                                strokeOpacity={isHighlighted ? 1 : 0.5}
                                markerEnd={`url(#arw${i}${fs?'f':''})`}
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
                            {/* Node rectangle */}
                            <rect
                                x={x - w / 2} y={y - h / 2} width={w} height={h}
                                rx={12} fill={style.fill}
                                stroke={style.stroke}
                                strokeWidth={highlighted ? 3 : 2}
                                filter={highlighted ? 'url(#shadowHover)' : 'url(#shadow)'}
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

                            {/* Tooltip on hover - show sentence */}
                            {highlighted && !isSource && node.sentence && (
                                <g>
                                    <rect x={x - 130} y={y + h / 2 + 8} width={260} height={50} rx={8}
                                        fill="#1f2937" fillOpacity={0.92}
                                    />
                                    <text x={x} y={y + h / 2 + 28} textAnchor="middle"
                                        fill="#fff" fontSize={fs ? 9 : 7.5}
                                        fontFamily="Inter, system-ui, sans-serif"
                                    >
                                        {trunc(node.sentence, fs ? 60 : 45)}
                                    </text>
                                    <text x={x} y={y + h / 2 + 42} textAnchor="middle"
                                        fill="#9ca3af" fontSize={fs ? 8 : 7}
                                        fontFamily="Inter, system-ui, sans-serif"
                                    >
                                        {node.sentence.length > (fs ? 60 : 45) ? trunc(node.sentence.slice(fs ? 60 : 45), fs ? 60 : 45) : ''}
                                    </text>
                                </g>
                            )}

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
            <div className="cg-inline-container" onClick={() => setFullscreen(true)}>
                {renderGraph(false)}
                <div className="cg-expand-hint">🔍 Click for fullscreen</div>
            </div>

            {fullscreen && (
                <div className="cg-fullscreen-overlay" onClick={(e) => { if (e.target === e.currentTarget) setFullscreen(false); }}>
                    <div className="cg-fullscreen-content">
                        <div className="cg-fullscreen-header">
                            <h3>📊 Citation Relationship Graph</h3>
                            <button className="cg-fullscreen-close" onClick={() => setFullscreen(false)}>✕</button>
                        </div>
                        <div className="cg-fullscreen-body">
                            {renderGraph(true)}
                        </div>
                        <div className="cg-legend-bar">
                            <div className="cg-legend-item"><span style={{ background: '#22c55e' }}></span> Supports</div>
                            <div className="cg-legend-item"><span style={{ background: '#ef4444' }}></span> Contradicts</div>
                            <div className="cg-legend-item"><span style={{ background: '#8b5cf6' }}></span> Uses Method</div>
                            <div className="cg-legend-item"><span style={{ background: '#3b82f6' }}></span> Extends</div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default PublicationCitationGraph;
