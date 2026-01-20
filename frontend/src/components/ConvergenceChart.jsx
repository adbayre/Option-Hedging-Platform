import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

export default function ConvergenceChart({ data, dataKeyLine, dataKeyConstant, color, title }) {
    if (!data) return null;

    // Calculate domain for better auto-scaling
    const vals = data.map(d => d[dataKeyLine]);
    const minVal = Math.min(...vals, data[0][dataKeyConstant]) * 0.99;
    const maxVal = Math.max(...vals, data[0][dataKeyConstant]) * 1.01;

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <div style={{ position: 'absolute', top: 5, left: 10, fontSize: '10px', color: '#888', textTransform: 'uppercase' }}>
                {title}
            </div>
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 25, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                    <XAxis dataKey="steps" stroke="#444" tick={{fontSize: 9}} tickCount={5} />
                    <YAxis domain={[minVal, maxVal]} stroke="#444" tick={{fontSize: 9}} />
                    <Tooltip 
                        contentStyle={{ backgroundColor: '#111', border: '1px solid #333' }}
                        itemStyle={{ fontSize: 10 }}
                        formatter={(val) => val.toFixed(4)}
                    />
                    {/* BS Constant Line */}
                    <ReferenceLine y={data[0][dataKeyConstant]} stroke="#666" strokeDasharray="3 3" />
                    {/* CRR Convergence Line */}
                    <Line 
                        type="monotone" 
                        dataKey={dataKeyLine} 
                        stroke={color} 
                        strokeWidth={2} 
                        dot={false}
                        isAnimationActive={false}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}