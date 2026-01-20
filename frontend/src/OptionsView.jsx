import { useState, useEffect } from 'react'
import axios from 'axios'
import CandlestickChart from './components/CandlestickChart'
import LiveBadge from './components/LiveBadge'
import BinomialTreeChart from './components/BinomialTreeChart'
import ConvergenceChart from './components/ConvergenceChart'

export default function OptionsView() {
  // --- STATE ---
  const [isFitData, setIsFitData] = useState(false)
  const [selectedTicker, setSelectedTicker] = useState('SPY')
  
  // Inputs
  const [spot, setSpot] = useState(100)
  const [volatility, setVolatility] = useState(0.20)
  const [rate, setRate] = useState(0.045)
  
  // Common Inputs
  const [strike, setStrike] = useState(100)
  const [maturity, setMaturity] = useState(1.0)
  const [optionType, setOptionType] = useState('Call')
  const [steps, setSteps] = useState(50) // State is correct

  // Data
  const [marketData, setMarketData] = useState(null)
  const [prices, setPrices] = useState({ bs: 0, crr: 0 })
  const [isCalculating, setIsCalculating] = useState(false)
  const [isFetchingData, setIsFetchingData] = useState(false)

  // Visuals
  const [visuals, setVisuals] = useState(null)

  // INDEX OPTIONS
  const indexes = ['SPY', 'QQQ', 'IWM', 'DIA', 'AAPL', 'MSFT', 'NVDA', 'TSLA']

  // --- FETCH MARKET DATA ---
  const fetchMarketData = async (ticker) => {
    setIsFetchingData(true)
    try {
      const res = await axios.get(`/api/market/index/${ticker}`)
      const { spot, volatility, rate, chart_data } = res.data
      
      setSpot(spot)
      setVolatility(volatility)
      setRate(rate)
      setMarketData(chart_data)
      setStrike(spot) 
      
    } catch (err) {
      console.error("Market data fetch failed", err)
      alert("Failed to fetch market data. Check backend logs.")
      setIsFitData(false)
    } finally {
        setIsFetchingData(false)
    }
  }

  // --- CALCULATE PRICES ---
  const calculatePrices = async () => {
    setIsCalculating(true)
    try {
      const payload = {
        S: parseFloat(spot),
        K: parseFloat(strike),
        T: parseFloat(maturity),
        r: parseFloat(rate),
        sigma: parseFloat(volatility),
        option_type: optionType,
        // --- FIX IS HERE: Use the state variable, not hardcoded 50 ---
        N: parseInt(steps) 
      }
      
      // Parallel Request: Prices + Visuals
      const [priceRes, visualRes] = await Promise.all([
         axios.post('/api/options/pricing', payload),
         axios.post('/api/options/visuals', payload)
      ])

      setPrices({ bs: priceRes.data.bs.Price, crr: priceRes.data.crr.Price })
      setVisuals(visualRes.data) // Store the Tree and Convergence data

    } catch (err) {
      console.error(err)
    } finally {
      setIsCalculating(false)
    }
  }

  useEffect(() => {
    if (isFitData) fetchMarketData(selectedTicker)
    else setMarketData(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFitData, selectedTicker])

  // This effect ensures it updates when you drag the slider OR click update
  useEffect(() => {
    const timer = setTimeout(() => {
        if (spot && strike && volatility) calculatePrices()
    }, 500)
    return () => clearTimeout(timer)
  }, [spot, strike, volatility, rate, maturity, optionType, steps])

  // --- STYLES ---
  const labelStyle = { 
    fontSize: '9px', 
    color: 'var(--text-muted)', 
    marginBottom: '4px', 
    fontWeight: 'bold', 
    letterSpacing: '0.5px',
    textTransform: 'uppercase'
  };

  const inputGroupStyle = { 
    display: 'flex', 
    flexDirection: 'column' 
  };

  return (
    <div className="view-container">
      
      {/* 1. HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        
        {/* Left: Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{ width: '4px', height: '32px', background: 'var(--color-primary)', boxShadow: '0 0 12px var(--color-primary-glow)' }}></div>
            <h2 style={{ fontSize: '18px', color: 'var(--color-primary)', margin: 0 }}>DERIVATIVES LAB</h2>
        </div>

        {/* Right: LIVE BADGE OR MANUAL CARD */}
        <div>
            {isFitData ? (
                <LiveBadge ticker={selectedTicker} isLive={true} />
            ) : (
                <div style={{ 
                    display: 'inline-flex',
                    minWidth: '300px',
                    height: '80px',
                    alignItems: 'center',
                    padding: '0 16px',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    borderLeft: '4px solid var(--text-muted)',
                    borderRadius: '2px',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
                    justifyContent: 'space-between'
                }}>
                    <div style={{ fontFamily: 'var(--font-ticker)', fontWeight: '700', fontSize: '24px', color: 'var(--text-muted)' }}>
                        CUSTOM
                    </div>
                    <div style={{ width: '1px', height: '32px', background: 'var(--border-subtle)' }}></div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontFamily: 'var(--font-price)', fontSize: '22px', fontWeight: '700', color: 'var(--color-primary)' }}>
                            ${parseFloat(spot).toFixed(2)}
                        </div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>
                            MANUAL INPUT
                        </div>
                    </div>
                </div>
            )}
        </div>
      </div>

      {/* 2. CONTROLS */}
      <div className="controls" style={{ 
          display: 'flex', 
          alignItems: 'flex-end', 
          gap: '20px', 
          paddingBottom: '20px', 
          borderBottom: '1px solid #333', 
          marginBottom: '25px',
          height: '90px' 
      }}>
        
        {/* LEFT: ARBITRARY / MARKET INPUTS */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px' }}>
            <span style={{ fontSize: '11px', fontWeight: 'bold', color: isFitData ? 'var(--text-muted)' : '#fff', marginRight: '5px', marginBottom: '8px' }}>
                ARBITRARY
            </span>
            
            <div style={inputGroupStyle}>
                <label style={labelStyle}>SPOT PRICE ($)</label>
                <input 
                    type="number" 
                    value={spot} 
                    onChange={e => setSpot(e.target.value)} 
                    disabled={isFitData}
                    style={{ width: '80px', opacity: isFitData ? 0.5 : 1 }} 
                />
            </div>

            <div style={inputGroupStyle}>
                <label style={labelStyle}>VOLATILITY (σ)</label>
                <input 
                    type="number" 
                    step="0.01" 
                    value={volatility} 
                    onChange={e => setVolatility(e.target.value)} 
                    disabled={isFitData}
                    style={{ width: '80px', opacity: isFitData ? 0.5 : 1 }} 
                />
            </div>

            <div style={inputGroupStyle}>
                <label style={labelStyle}>RISK FREE RATE (r)</label>
                <input 
                    type="number" 
                    step="0.001" 
                    value={rate} 
                    onChange={e => setRate(e.target.value)} 
                    disabled={isFitData}
                    style={{ width: '80px', opacity: isFitData ? 0.5 : 1 }} 
                />
            </div>
        </div>

        {/* MIDDLE: FIT DATA TOGGLE */}
        <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '10px', 
            marginLeft: '10px', 
            marginRight: '10px', 
            borderLeft: '1px solid #333', 
            borderRight: '1px solid #333', 
            padding: '0 20px',
            height: '35px', 
            marginBottom: '2px' 
        }}>
            <label style={{ 
                color: '#fff', fontSize: '11px', fontWeight: 'bold', 
                display: 'flex', alignItems: 'center', cursor: 'pointer', fontFamily: 'var(--font-mono)' 
            }}>
                <input 
                    type="checkbox" 
                    checked={isFitData} 
                    onChange={(e) => setIsFitData(e.target.checked)}
                    style={{ accentColor: 'var(--color-primary)', marginRight: '8px', cursor: 'pointer' }}
                />
                FIT DATA
            </label>

            <select 
                value={selectedTicker} 
                onChange={(e) => setSelectedTicker(e.target.value)}
                disabled={!isFitData}
                style={{ minWidth: '100px', opacity: isFitData ? 1 : 0.5 }}
            >
                {indexes.map(idx => <option key={idx} value={idx}>{idx}</option>)}
            </select>
        </div>

        {/* RIGHT: COMMON OPTIONS */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px', marginLeft: 'auto' }}>
            
            <div style={inputGroupStyle}>
                <label style={labelStyle}>STRIKE PRICE ($)</label>
                <input 
                    type="number" 
                    value={strike} 
                    onChange={e => setStrike(e.target.value)} 
                    style={{ width: '80px', color: 'var(--color-primary)', fontWeight: 'bold' }} 
                />
            </div>
            {/* STEPS SLIDER */}
            <div style={inputGroupStyle}>
                <label style={labelStyle}>STEPS (N={steps})</label>
                <div style={{ display: 'flex', alignItems: 'center', height: '32px' }}>
                    <input 
                        type="range" 
                        min="10" 
                        max="200" 
                        step="5"
                        value={steps} 
                        onChange={e => setSteps(e.target.value)} 
                        style={{ width: '100px', accentColor: '#fbbf24', cursor: 'pointer' }} 
                    />
                </div>
            </div>
            <div style={inputGroupStyle}>
                <label style={labelStyle}>OPTION TYPE</label>
                <select value={optionType} onChange={e => setOptionType(e.target.value)} style={{ width: '80px' }}>
                    <option value="Call">CALL</option>
                    <option value="Put">PUT</option>
                </select>
            </div>
            
            <div style={inputGroupStyle}>
                <label style={labelStyle}>MATURITY (YRS)</label>
                <input 
                    type="number" 
                    step="0.1" 
                    value={maturity} 
                    onChange={e => setMaturity(e.target.value)} 
                    style={{ width: '60px' }} 
                />
            </div>
            
            <button onClick={calculatePrices} disabled={isCalculating} style={{ height: '34px', marginBottom: '0px' }}>
                {isCalculating ? '...' : 'UPDATE'}
            </button>
        </div>

      </div>

      {/* 3. MAIN CONTENT AREA */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '20px', height: '400px' }}>
        
        {/* LEFT: CHART */}
        <div className="bloomberg-panel" style={{ padding: '15px', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <h3 style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    {isFitData ? `${selectedTicker} • MARKET DATA (5Y)` : 'UNDERLYING ASSET SIMULATION'}
                </h3>
            </div>
            
            {isFitData ? (
                isFetchingData ? (
                    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
                        LOADING MARKET DATA...
                    </div>
                ) : (
                    <div style={{ height: '340px', width: '100%' }}>
                        <CandlestickChart data={marketData} />
                    </div>
                )
            ) : (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '10px', color: '#444' }}>
                    <div style={{ fontSize: '24px' }}>📊</div>
                    <div style={{ fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
                        ENABLE "FIT DATA" TO VIEW LIVE CHART
                    </div>
                </div>
            )}
        </div>

        {/* RIGHT: PRICING BOXES */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            
            {/* BLACK SCHOLES BOX */}
            <div style={{ 
                flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
                border: '1px solid #00d4ff', // All around Blue
                boxShadow: '0 0 15px rgba(0, 212, 255, 0.1)', 
                background: 'rgba(0, 212, 255, 0.03)',
                borderRadius: '4px' 
            }}>
                <div style={{ fontSize: '16px', color: '#00d4ff', marginBottom: '8px', letterSpacing: '1px', fontWeight: 'bold' }}>BLACK SCHOLES</div>
                <div style={{ fontSize: '32px', fontWeight: '900', color: '#fff', fontFamily: 'var(--font-mono)' }}>
                    ${prices.bs.toFixed(2)}
                </div>
            </div>

            {/* CRR BOX */}
            <div style={{ 
                flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
                border: '1px solid #fbbf24', // All around Yellow
                boxShadow: '0 0 15px rgba(251, 191, 36, 0.1)', 
                background: 'rgba(251, 191, 36, 0.03)',
                borderRadius: '4px'
            }}>
                <div style={{ fontSize: '16px', color: '#fbbf24', marginBottom: '8px', letterSpacing: '1px', fontWeight: 'bold' }}>BINOMIAL (CRR)</div>
                <div style={{ fontSize: '32px', fontWeight: '900', color: '#fff', fontFamily: 'var(--font-mono)' }}>
                    ${prices.crr.toFixed(2)}
                </div>
            </div>

        </div>

      </div>

      {/* 4. SEPARATOR: CONVERGENCE HEADER */}
      <div style={{ margin: '40px 0 20px 0', display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ width: '4px', height: '24px', background: '#fbbf24', boxShadow: '0 0 12px rgba(251, 191, 36, 0.5)' }}></div>
          <h2 style={{ fontSize: '16px', color: '#fbbf24', margin: 0, letterSpacing: '1px' }}>
              CONVERGENCE ANALYSIS (N={steps})
          </h2>
          <div style={{ height: '1px', background: '#333', flex: 1, marginLeft: '10px' }}></div>
      </div>

      {/* 5. CONVERGENCE GRID (8x2) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', height: '600px', marginBottom: '40px' }}>
        
        {/* LEFT: CONVERGENCE PLOTS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="bloomberg-panel" style={{ flex: 1, padding: '10px' }}>
                {visuals ? (
                    <ConvergenceChart 
                        data={visuals.convergence} 
                        dataKeyLine="crr_price" 
                        dataKeyConstant="bs_price" 
                        color="#00d4ff" 
                        title="Price Convergence (CRR → BS)" 
                    />
                ) : <div style={{height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#444', fontSize: '10px'}}>CALCULATING...</div>}
            </div>

            <div className="bloomberg-panel" style={{ flex: 1, padding: '10px' }}>
                {visuals ? (
                    <ConvergenceChart 
                        data={visuals.convergence} 
                        dataKeyLine="crr_delta" 
                        dataKeyConstant="bs_delta" 
                        color="#a855f7" 
                        title="Delta Convergence (CRR → BS)" 
                    />
                ) : <div style={{height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#444', fontSize: '10px'}}>CALCULATING...</div>}
            </div>
        </div>

        {/* RIGHT: TREE */}
        <div style={{ 
            border: '1px solid #fbbf24', 
            boxShadow: '0 0 15px rgba(251, 191, 36, 0.1)', 
            background: 'rgba(251, 191, 36, 0.02)',
            borderRadius: '4px',
            padding: '10px',
            position: 'relative'
        }}>
            <div style={{ position: 'absolute', top: 10, left: 15, fontSize: '10px', color: '#fbbf24', fontWeight: 'bold', letterSpacing: '1px' }}>
                BINOMIAL LATTICE (SIMPLIFIED VISUAL)
            </div>
            {visuals ? (
                <BinomialTreeChart data={visuals.tree} />
            ) : <div style={{height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fbbf24', fontSize: '10px'}}>GENERATING LATTICE...</div>}
        </div>

      </div>

    </div>
  )
}