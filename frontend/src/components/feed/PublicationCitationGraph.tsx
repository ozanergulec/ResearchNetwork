import React, { useEffect, useState, useRef, useCallback } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { publicationsApi } from '../../services/publicationService';
import '../../styles/feed/PublicationCitationGraph.css';

interface PublicationCitationGraphProps {
    publicationId: string;
}

const PublicationCitationGraph: React.FC<PublicationCitationGraphProps> = ({ publicationId }) => {
    const [graphData, setGraphData] = useState<{nodes: any[], links: any[]} | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const fgRef = useRef<any>(null);

    useEffect(() => {
        const fetchGraph = async () => {
            setLoading(true);
            try {
                const response = await publicationsApi.getCitationGraph(publicationId);
                // Map API 'edges' to 'links' for react-force-graph
                if (response.data) {
                    setGraphData({
                        nodes: response.data.nodes,
                        links: response.data.edges
                    });
                }
            } catch (err: any) {
                console.error("Failed to load citation graph UI", err);
                setError(err.message || "Failed to load graph data");
            } finally {
                setLoading(false);
            }
        };

        if (publicationId) {
            fetchGraph();
        }
    }, [publicationId]);

    // Format badge colors based on intent
    const getIntentColor = (intent?: string) => {
        if (!intent) return '#7f8c8d'; // neutral gray
        
        const lower = intent.toLowerCase();
        if (lower.includes('support')) return '#27ae60'; // green
        if (lower.includes('contradict') || lower.includes('dispute')) return '#c0392b'; // red
        if (lower.includes('method') || lower.includes('use')) return '#8e44ad'; // purple
        if (lower.includes('extend')) return '#2980b9'; // blue
        return '#7f8c8d'; // gray
    };

    const handleNodeClick = useCallback((node: any) => {
        if (fgRef.current) {
            fgRef.current.centerAt(node.x, node.y, 1000);
            fgRef.current.zoom(8, 2000);
        }
    }, [fgRef]);

    if (loading) {
        return (
            <div className="citation-graph-loading">
                <div className="pub-detail-preview-spinner"></div>
                <span>Generating Citation Graph...</span>
            </div>
        );
    }

    if (error) {
        return <div className="citation-graph-error">{error}</div>;
    }

    if (!graphData || graphData.nodes.length <= 1) {
        return <div className="citation-graph-empty">No citation relationships available to visualize.</div>;
    }

    return (
        <div className="citation-graph-container">
            <ForceGraph2D
                ref={fgRef}
                width={700}
                height={500}
                graphData={graphData}
                nodeLabel="title"
                nodeColor={(node: any) => node.type === 'source' ? '#e74c3c' : '#34495e'}
                nodeVal={(node: any) => node.type === 'source' ? 2 : 1}
                linkColor={(link: any) => getIntentColor(link.intent)}
                linkWidth={(link: any) => link.confidence ? Math.max(1, link.confidence * 3) : 1}
                linkDirectionalArrowLength={3.5}
                linkDirectionalArrowRelPos={1}
                cooldownTicks={100}
                onNodeClick={handleNodeClick}
                backgroundColor="#f8f9fa"
            />
            
            <div className="citation-graph-legend">
                <div className="legend-item"><span className="legend-color support"></span> Supports</div>
                <div className="legend-item"><span className="legend-color contradict"></span> Contradicts</div>
                <div className="legend-item"><span className="legend-color method"></span> Uses Method</div>
                <div className="legend-item"><span className="legend-color extend"></span> Extends</div>
                <div className="legend-item"><span className="legend-color neutral"></span> Neutral/Other</div>
            </div>
        </div>
    );
};

export default PublicationCitationGraph;
