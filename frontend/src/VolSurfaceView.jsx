import { useState, useEffect } from 'react';
import axios from 'axios';
import Plot from 'react-plotly.js';
import LiveBadge from './components/LiveBadge';

export default function VolSurfaceView() {
    const [ticker, setTicker] = useState('SPY');
    const [surfaceData, setSurfaceData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);

    const indexes = ['SPY', 'QQQ', 'IWM', 'DIA', 'AAPL', 'MSFT', 'NVDA', 'TSLA'];

    const fetchSurface = async () => {
        setLoading(true);
        setError(false);
        try {
            const res = await axios.get(`/api/options/surface/${ticker}`);
            setSurfaceData(res.data);
        } catch (err) {
            console.error(err);
            setError(true);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSurface();
    }, [ticker]);

    // Reusable Component with Iridescent Theme (Viridis)
    const SurfacePlot = ({ data, title }) => (
        <Plot
            data={[
                {
                    type: 'surface',
                    x: data.x, 
                    y: data.y, 
                    z: data.z, 
                    colorscale: 'Viridis', // Iridescent Theme
                    showscale: false,
                    contours: {
                        x: { show: true, color: '#ffffff33', width: 2 },
                        y: { show: true, color: '#ffffff33', width: 2 },
                        z: { show: false }
                    },
                    opacity: 1
                }
            ]}
            layout={{
                autosize: true,
                title: { text: title, font: { color: '#fff', size: 14, family: 'monospace' } },
                paper_bgcolor: 'rgba(0,0,0,0)',
                plot_bgcolor: 'rgba(0,0,0,0)',
                margin: { l: 0, r: 0, b: 20, t: 40 },
                scene: {
                    xaxis: { title: 'STRIKE', titlefont: {color: '#666', size: 9}, tickfont: {color: '#666', size: 8}, gridcolor: '#333', backgroundcolor: 'rgba(0,0,0,0)' },
                    yaxis: { title: 'DAYS', titlefont: {color: '#666', size: 9}, tickfont: {color: '#666', size: 8}, gridcolor: '#333', backgroundcolor: 'rgba(0,0,0,0)' },
                    zaxis: { title: 'VOL %', titlefont: {color: '#666', size: 9}, tickfont: {color: '#666', size: 8}, gridcolor: '#333', backgroundcolor: 'rgba(0,0,0,0)' },
                    camera: {
                        eye: { x: 1.5, y: 1.5, z: 0.8 },
                        up: { x: 0, y: 0, z: 1 }
                    },
                    dragmode: 'turntable'
                }
            }}
            useResizeHandler={true}
            style={{ width: '100%', height: '100%' }}
            config={{ displayModeBar: false }}
        />
    );

    return (
        <div className="view-container" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            
            {/* HEADER */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{ width: '4px', height: '32px', background: '#a855f7', boxShadow: '0 0 12px rgba(168, 85, 247, 0.5)' }}></div>
                    <h2 style={{ fontSize: '18px', color: '#a855f7', margin: 0 }}>VOLATILITY SURFACE</h2>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <select 
                        value={ticker} 
                        onChange={(e) => setTicker(e.target.value)}
                        style={{ padding: '8px', background: '#222', color: '#fff', border: '1px solid #444', borderRadius: '4px' }}
                    >
                        {indexes.map(idx => <option key={idx} value={idx}>{idx}</option>)}
                    </select>
                    <LiveBadge ticker={ticker} isLive={true} />
                </div>
            </div>

            {/* MAIN CHART AREA - SPLIT VIEW */}
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', minHeight: 0 }}>
                
                {/* LEFT: CALLS */}
                <div className="bloomberg-panel" style={{ position: 'relative', overflow: 'hidden', padding: 0, border: '1px solid #333' }}>
                    {loading ? (
                        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', fontSize: '10px' }}>LOADING CALLS...</div>
                    ) : surfaceData ? (
                        <SurfacePlot data={surfaceData.call} title="CALL IMPLIED VOLATILITY" />
                    ) : null}
                </div>

                {/* RIGHT: PUTS */}
                <div className="bloomberg-panel" style={{ position: 'relative', overflow: 'hidden', padding: 0, border: '1px solid #333' }}>
                    {loading ? (
                        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', fontSize: '10px' }}>LOADING PUTS...</div>
                    ) : surfaceData ? (
                        <SurfacePlot data={surfaceData.put} title="PUT IMPLIED VOLATILITY" />
                    ) : null}
                </div>

            </div>

            {/* INFO FOOTER */}
            <div style={{ marginTop: '15px', display: 'flex', gap: '20px', fontSize: '11px', color: '#666', fontFamily: 'monospace' }}>
                <div>X: STRIKE</div>
                <div>Y: DAYS</div>
                <div>Z: VOLATILITY</div>
                <div style={{ marginLeft: 'auto', color: '#a855f7' }}>
                    INTERPOLATION: LINEAR MESH
                </div>
            </div>

        </div>
    );
}