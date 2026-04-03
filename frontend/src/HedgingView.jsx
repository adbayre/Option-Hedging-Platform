import { useState } from 'react';
import axios from 'axios';
// Fixed: Added 'Legend' to the import list
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from 'recharts';
import LiveBadge from './components/LiveBadge';

export default function HedgingView() {
    const [ticker, setTicker] = useState('SPY');
    const [startDate, setStartDate] = useState('2023-01-01');
    const [endDate, setEndDate] = useState('2023-06-01');
    const [strikePct, setStrikePct] = useState(100); 
    
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);

    const indexes = ['SPY', 'QQQ', 'IWM', 'DIA', 'AAPL', 'MSFT', 'NVDA', 'TSLA', '^FCHI'];

    const runSimulation = async () => {
        setLoading(true);
        try {
            const strike_ratio = parseFloat(strikePct) / 100.0;
            const res = await axios.post('/api/options/backtest', {
                ticker, start_date: startDate, end_date: endDate, strike_pct: strike_ratio 
            });
            
            if (res.data.error) {
                alert(res.data.error);
                setLoading(false);
                return;
            }

            const initial_cash = res.data.portfolio[0];
            const chartData = res.data.dates.map((date, i) => ({
                date,
                portfolio: res.data.portfolio[i],
                pnl_only: res.data.portfolio[i] - initial_cash,
                stock: res.data.stock[i],
                delta: res.data.delta[i],
                optionPrice: res.data.option_price ? res.data.option_price[i] : 0 
            }));

            const final_val = res.data.portfolio[res.data.portfolio.length - 1];
            const net_pnl = final_val - initial_cash;
            
            setResult({ ...res.data, chartData, final_val, net_pnl, is_profit: net_pnl >= 0 });
            
        } catch (err) {
            console.error(err);
            alert("Simulation failed. Check backend console.");
        } finally {
            setLoading(false);
        }
    };

    const KPICard = ({ title, value, sub, color }) => (
        <div className="bloomberg-panel" style={{ flex: 1, padding: '15px', display: 'flex', flexDirection: 'column', borderTop: `4px solid ${color}`, background: 'var(--bg-surface)' }}>
            <span style={{ fontSize: '10px', color: '#888', fontWeight: 'bold', letterSpacing: '1px' }}>{title}</span>
            <span style={{ fontSize: '28px', color: '#fff', fontWeight: '900', margin: '5px 0' }}>{value}</span>
            <span style={{ fontSize: '11px', color: color }}>{sub}</span>
        </div>
    );

    return (
        <div className="view-container" style={{ overflowY: 'auto', height: '100%', paddingRight: '10px' }}>
            
            {/* 1. HEADER */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{ width: '4px', height: '32px', background: '#10b981', boxShadow: '0 0 12px rgba(16, 185, 129, 0.5)' }}></div>
                    <h2 style={{ fontSize: '18px', color: '#10b981', margin: 0 }}>DELTA HEDGING SIMULATION</h2>
                </div>
                <LiveBadge ticker={ticker} isLive={true} />
            </div>

            {/* 2. CONTROLS */}
            <div className="controls" style={{ display: 'flex', alignItems: 'flex-end', gap: '20px', paddingBottom: '20px', borderBottom: '1px solid #333', marginBottom: '25px' }}>
                
                {/* LEFT: ASSET & TICKER */}
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '15px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#fff', marginBottom: '10px' }}>ASSET</span>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <label style={{ fontSize: '9px', color: '#888', marginBottom: '6px', fontWeight: 'bold' }}>TICKER</label>
                        <select value={ticker} onChange={(e) => setTicker(e.target.value)} style={{ width: '100px', height: '36px', boxSizing: 'border-box', background: '#222', color: '#fff', border: '1px solid #444', borderRadius: '4px', padding: '0 8px' }}>
                            {indexes.map(idx => <option key={idx} value={idx}>{idx}</option>)}
                        </select>
                    </div>
                </div>

                {/* MIDDLE: DATES */}
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '15px', padding: '0 20px', borderLeft: '1px solid #333', borderRight: '1px solid #333' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <label style={{ fontSize: '9px', color: '#888', marginBottom: '6px', fontWeight: 'bold' }}>START DATE</label>
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ height: '36px', boxSizing: 'border-box', background: '#222', color: '#fff', border: '1px solid #444', borderRadius: '4px', padding: '0 10px', fontFamily: 'monospace' }} />
                    </div>
                    <div style={{ color: '#666', marginBottom: '10px' }}>→</div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <label style={{ fontSize: '9px', color: '#888', marginBottom: '6px', fontWeight: 'bold' }}>EXPIRY DATE</label>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ height: '36px', boxSizing: 'border-box', background: '#222', color: '#fff', border: '1px solid #444', borderRadius: '4px', padding: '0 10px', fontFamily: 'monospace' }} />
                    </div>
                </div>

                {/* RIGHT: STRIKE & BUTTON */}
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '15px', marginLeft: 'auto' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <label style={{ fontSize: '9px', color: '#888', marginBottom: '6px', fontWeight: 'bold' }}>STRIKE (%)</label>
                        <input type="number" value={strikePct} onChange={e => setStrikePct(e.target.value)} placeholder="100" style={{ width: '80px', height: '36px', boxSizing: 'border-box', background: '#222', color: '#10b981', border: '1px solid #444', borderRadius: '4px', fontWeight: 'bold', textAlign: 'center' }} />
                    </div>
                    <button onClick={runSimulation} disabled={loading} style={{ height: '36px', boxSizing: 'border-box', padding: '0 24px', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', background: loading ? '#555' : '#f59e0b', color: '#000' }}>
                        {loading ? 'RUNNING...' : 'RUN BACKTEST'}
                    </button>
                </div>
            </div>

            {/* 3. KPI DASHBOARD */}
            {result && (
                <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
                    <KPICard title="PREMIUM COLLECTED (DAY 0)" value={`$${result.initial_cost.toFixed(2)}`} sub="INITIAL CASH BUFFER" color="#00d4ff" />
                    <KPICard title="HEDGED PORTFOLIO (FINAL)" value={`$${result.final_val.toFixed(2)}`} sub="PREMIUM - GAMMA COSTS" color={result.is_profit ? '#10b981' : '#ef4444'} />
                    <KPICard title="NET P&L (PER SHARE)" value={`${result.net_pnl > 0 ? '+' : ''}$${result.net_pnl.toFixed(2)}`} sub={result.is_profit ? "HEDGE SUCCESSFUL" : "VOLATILITY EXCEEDED PREMIUM"} color={result.is_profit ? '#10b981' : '#ef4444'} />
                </div>
            )}

            {/* 4. CHARTS */}
            {result ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', height: '350px', marginBottom: '20px' }}>
                    <div className="bloomberg-panel" style={{ padding: '15px', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                            <h3 style={{ fontSize: '12px', color: '#888', margin: 0 }}>CUMULATIVE P&L (VS INITIAL PREMIUM)</h3>
                        </div>
                        <div style={{ flex: 1, minHeight: 0 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={result.chartData}>
                                    <defs>
                                        <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
                                        <linearGradient id="colorLoss" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/><stop offset="95%" stopColor="#ef4444" stopOpacity={0}/></linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                    <XAxis dataKey="date" stroke="#666" fontSize={10} tickFormatter={str => str.substring(5)} />
                                    <YAxis stroke="#666" fontSize={10} />
                                    <Tooltip contentStyle={{ backgroundColor: '#111', border: '1px solid #333' }} />
                                    <ReferenceLine y={0} stroke="#666" strokeDasharray="3 3" />
                                    <Area type="monotone" dataKey="pnl_only" stroke={result.is_profit ? "#10b981" : "#ef4444"} fill={result.is_profit ? "url(#colorProfit)" : "url(#colorLoss)"} strokeWidth={2} name="Net P&L ($)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="bloomberg-panel" style={{ padding: '15px', display: 'flex', flexDirection: 'column' }}>
                        <h3 style={{ fontSize: '12px', color: '#888', margin: '0 0 10px 0' }}>HEDGE RATIO vs STOCK PRICE</h3>
                        <div style={{ flex: 1, minHeight: 0 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={result.chartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                    <XAxis dataKey="date" stroke="#666" fontSize={10} tickFormatter={str => str.substring(5)} />
                                    <YAxis yAxisId="left" stroke="#666" fontSize={10} domain={['auto', 'auto']} />
                                    <YAxis yAxisId="right" orientation="right" stroke="#00d4ff" domain={[0, 1]} fontSize={10} />
                                    <Tooltip contentStyle={{ backgroundColor: '#111', border: '1px solid #333' }} />
                                    <ReferenceLine y={result.strike} yAxisId="left" stroke="#fbbf24" strokeDasharray="4 4" label={{ value: 'STRIKE', fill: '#fbbf24', fontSize: 10, position: 'insideRight' }} />
                                    <Line yAxisId="left" type="monotone" dataKey="stock" stroke="#888" strokeWidth={1} name="Stock Price" dot={false} />
                                    <Line yAxisId="right" type="step" dataKey="delta" stroke="#00d4ff" strokeWidth={2} name="Hedge Delta" dot={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            ) : (
                <div style={{ height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', border: '1px dashed #333', borderRadius: '4px', color: '#666' }}>
                    <div style={{ fontSize: '24px', marginBottom: '10px' }}>📈</div>
                    <div style={{ fontSize: '12px', fontFamily: 'monospace' }}>SELECT PARAMETERS AND CLICK "RUN BACKTEST"</div>
                </div>
            )}

            {/* 5. DATA LEDGER & QUANTITATIVE EXPLANATION */}
            {result && (
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginBottom: '40px' }}>
                    
                    {/* TRADE BLOTTER TABLE */}
                    <div className="bloomberg-panel" style={{ padding: '15px', maxHeight: '400px', overflowY: 'auto' }}>
                        <h3 style={{ fontSize: '12px', color: '#888', margin: '0 0 15px 0', borderBottom: '1px solid #333', paddingBottom: '10px' }}>TRADE BLOTTER (DATA COLLECTION)</h3>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', fontFamily: 'monospace', textAlign: 'right' }}>
                            <thead>
                                <tr style={{ color: '#00d4ff', borderBottom: '1px solid #444' }}>
                                    <th style={{ padding: '8px', textAlign: 'left' }}>DATE</th>
                                    <th style={{ padding: '8px' }}>STOCK ($)</th>
                                    <th style={{ padding: '8px' }}>BS OPTION PRICE ($)</th>
                                    <th style={{ padding: '8px' }}>DELTA (SHARES)</th>
                                    <th style={{ padding: '8px' }}>PORTFOLIO P&L ($)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {result.chartData.map((row, idx) => (
                                    <tr key={idx} style={{ borderBottom: '1px solid #222', color: '#ddd' }}>
                                        <td style={{ padding: '8px', textAlign: 'left' }}>{row.date}</td>
                                        <td style={{ padding: '8px' }}>{row.stock.toFixed(2)}</td>
                                        <td style={{ padding: '8px' }}>{row.optionPrice ? row.optionPrice.toFixed(2) : '-'}</td>
                                        <td style={{ padding: '8px' }}>{row.delta.toFixed(4)}</td>
                                        <td style={{ padding: '8px', color: row.pnl_only >= 0 ? '#10b981' : '#ef4444' }}>
                                            {row.pnl_only > 0 ? '+' : ''}{row.pnl_only.toFixed(2)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* ENGINE EXPLANATION */}
                    <div className="bloomberg-panel" style={{ padding: '15px', background: 'var(--bg-surface)' }}>
                        <h3 style={{ fontSize: '12px', color: '#10b981', margin: '0 0 15px 0', borderBottom: '1px solid #333', paddingBottom: '10px' }}>QUANTITATIVE ENGINE</h3>
                        <div style={{ fontSize: '12px', color: '#aaa', lineHeight: '1.6' }}>
                            <p><strong>1. Pricing Model:</strong></p>
                            <p>Option prices in the ledger are calculated daily using the Black-Scholes formula:</p>
                            <p style={{ background: '#111', padding: '10px', borderRadius: '4px', textAlign: 'center', color: '#fff', fontFamily: 'monospace' }}>
                                C(S,t) = S N(d1) - K e^(-r(T-t)) N(d2)
                            </p>
                            
                            <p><strong>2. Delta Calculation:</strong></p>
                            <p>The hedge ratio (Delta) indicates how many shares of the underlying asset must be purchased to neutralize directional risk. It is derived from:</p>
                            <p style={{ background: '#111', padding: '10px', borderRadius: '4px', textAlign: 'center', color: '#fff', fontFamily: 'monospace' }}>
                                Δ = N(d1)
                            </p>
                            
                            <p><strong>3. Mechanics of the Hedge:</strong></p>
                            <p>By selling the option, we collect the initial premium. However, as the stock moves, Δ fluctuates. To maintain a Delta-Neutral position, the algorithm systematically buys shares when the price rises and sells when it falls.</p>
                            
                            <p style={{ color: '#ef4444', borderLeft: '2px solid #ef4444', paddingLeft: '10px', marginTop: '15px' }}>
                                <strong>Gamma Bleed:</strong> Because we are short the option, we are inherently forced to "Buy High and Sell Low" during rebalancing. If realized volatility outpaces the implied volatility priced into our initial premium, the portfolio yields a net loss.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}