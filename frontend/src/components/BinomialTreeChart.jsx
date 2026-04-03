import React, { useState } from 'react';
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";

export default function BinomialTreeChart({ data }) {
    if (!data || !data.nodes) return null;

    // --- 1. LAYOUT CALCULATIONS ---
    const xSpacing = 80; // Tighter horizontal space
    const ySpacing = 60; // Tighter vertical space
    
    const steps = Math.max(...data.nodes.map(n => n.x));
    
    // Virtual Canvas Dimensions (Internal SVG size)
    const svgWidth = (steps + 2) * xSpacing + 100;
    const svgHeight = (steps + 2) * ySpacing + 100;
    
    const centerY = svgHeight / 2;

    const getNodePosition = (nodeId) => {
        const [i, j] = nodeId.split('_').map(Number);
        const xPos = 50 + i * xSpacing;
        const yPos = centerY + (2 * j - i) * (ySpacing / 1.5);
        return { x: xPos, y: yPos };
    };

    const [hoveredNode, setHoveredNode] = useState(null);

    return (
        // OUTER CONTAINER: Must be strictly 100% of PARENT, with hidden overflow
        <div style={{ width: '100%', height: '100%', overflow: 'hidden', cursor: 'grab', position: 'relative' }}>
            
            <TransformWrapper
                initialScale={0.5} // Start zoomed out to see structure
                minScale={0.1}
                maxScale={5}
                centerOnInit={true}
                wheel={{ step: 0.1 }}
            >
                {/* TRANSFORM COMPONENT: Must inherit size */}
                <TransformComponent 
                    wrapperStyle={{ width: '100%', height: '100%' }}
                    contentStyle={{ width: '100%', height: '100%' }}
                >
                    <svg width={svgWidth} height={svgHeight} viewBox={`0 0 ${svgWidth} ${svgHeight}`}>
                        
                        <defs>
                            <filter id="glow-node" x="-50%" y="-50%" width="200%" height="200%">
                                <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
                                <feMerge>
                                    <feMergeNode in="coloredBlur"/>
                                    <feMergeNode in="SourceGraphic"/>
                                </feMerge>
                            </filter>
                        </defs>

                        {/* EDGES */}
                        {data.edges.map((edge, i) => {
                            const start = getNodePosition(edge.source);
                            const end = getNodePosition(edge.target);
                            
                            return (
                                <line 
                                    key={i}
                                    x1={start.x} y1={start.y}
                                    x2={end.x} y2={end.y}
                                    stroke="#fbbf24" 
                                    strokeWidth="1" 
                                    strokeOpacity="0.4"
                                />
                            );
                        })}

                        {/* NODES */}
                        {data.nodes.map((node, i) => {
                            const pos = getNodePosition(node.id);
                            const isHovered = hoveredNode === node.id;
                            const isStart = node.x === 0;

                            return (
                                <g 
                                    key={i} 
                                    onMouseEnter={() => setHoveredNode(node.id)}
                                    onMouseLeave={() => setHoveredNode(null)}
                                >
                                    <circle 
                                        cx={pos.x} 
                                        cy={pos.y} 
                                        r={isHovered ? 6 : (isStart ? 5 : 3)} 
                                        fill={isStart || isHovered ? "#fbbf24" : "#1a1a1a"}
                                        stroke="#fbbf24"
                                        strokeWidth={isHovered ? 2 : 1.5}
                                        filter={isHovered ? "url(#glow-node)" : ""}
                                        transition="all 0.2s ease"
                                    />
                                    {/* Price Label (Small but legible) */}
                                    <text
                                        x={pos.x}
                                        y={pos.y - 8}
                                        textAnchor="middle"
                                        fill={isHovered ? "#fff" : "#888"}
                                        fontSize="10"
                                        fontFamily="monospace"
                                        pointerEvents="none"
                                        style={{ opacity: isHovered || isStart ? 1 : 0.7 }}
                                    >
                                        {parseFloat(node.y).toFixed(2)}
                                    </text>
                                </g>
                            );
                        })}

                    </svg>
                </TransformComponent>
            </TransformWrapper>
            
            <div style={{ position: 'absolute', bottom: 5, right: 10, fontSize: '9px', color: '#666', pointerEvents: 'none' }}>
                SCROLL TO ZOOM • DRAG TO PAN
            </div>
        </div>
    );
}