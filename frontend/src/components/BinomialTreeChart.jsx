import React from 'react';

export default function BinomialTreeChart({ data }) {
    if (!data || !data.nodes) return null;

    // Calculate scaling
    const steps = Math.max(...data.nodes.map(n => n.x));
    const prices = data.nodes.map(n => n.y);
    const minP = Math.min(...prices);
    const maxP = Math.max(...prices);
    
    // SVG Dimensions
    const width = 600;
    const height = 300;
    const padding = 40;

    // Scale Functions
    const xScale = (step) => padding + (step / steps) * (width - 2 * padding);
    const yScale = (price) => height - padding - ((price - minP) / (maxP - minP)) * (height - 2 * padding);

    return (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: '100%' }}>
                <defs>
                    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="2" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                </defs>
                
                {/* EDGES */}
                {data.edges.map((edge, i) => {
                    const source = data.nodes.find(n => n.id === edge.source);
                    const target = data.nodes.find(n => n.id === edge.target);
                    if (!source || !target) return null;

                    return (
                        <line 
                            key={i}
                            x1={xScale(source.x)} y1={yScale(source.y)}
                            x2={xScale(target.x)} y2={yScale(target.y)}
                            stroke="#fbbf24" strokeWidth="1" opacity="0.4"
                        />
                    );
                })}

                {/* NODES */}
                {data.nodes.map((node, i) => (
                    <g key={i}>
                        <circle 
                            cx={xScale(node.x)} 
                            cy={yScale(node.y)} 
                            r={node.x === 0 ? 5 : 3} 
                            fill={node.x === 0 ? "#fbbf24" : "#222"}
                            stroke="#fbbf24"
                            strokeWidth="1.5"
                        />
                        {/* Only show labels for first and last steps to avoid clutter */}
                        {(node.x === 0 || node.x === steps) && (
                            <text 
                                x={xScale(node.x) + (node.x === steps ? 10 : -10)} 
                                y={yScale(node.y)} 
                                fill="#888" 
                                fontSize="10" 
                                alignmentBaseline="middle"
                                textAnchor={node.x === steps ? "start" : "end"}
                            >
                                {parseFloat(node.label).toFixed(1)}
                            </text>
                        )}
                    </g>
                ))}
            </svg>
        </div>
    );
}