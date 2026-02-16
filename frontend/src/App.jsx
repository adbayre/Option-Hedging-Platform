import { useState } from 'react'
import OptionsView from './OptionsView'
import VolSurfaceView from './VolSurfaceView'
import Clock from './components/Clock'
import './App.css'

function App() {
  // State for active tab
  const [activeTab, setActiveTab] = useState('options')

  // Navigation Items
  const tabs = [
    { id: 'options', label: 'PRICING & HEDGING' },
    { id: 'surface', label: 'VOLATILITY SURFACE' }
  ];

  return (
    <div className="app-container">
      
      {/* --- HEADER --- */}
      <header className="bloomberg-header">
        <div className="brand-section">
          <div className="neon-bar"></div>
          <div>
            <h1 className="brand-title">OPTION PRICING PLATFORM</h1>
            <p className="brand-subtitle">Quantitative Risk Management</p>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <Clock />
          <button 
            className="btn-download"
            onClick={() => alert("Export feature coming soon")}
          >
            EXPORT DATA
          </button>
        </div>
      </header>

      {/* --- NAVIGATION --- */}
      <nav className="main-nav">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`nav-item ${activeTab === tab.id ? 'active' : ''}`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* --- MAIN CONTENT --- */}
      <main className="main-content">
        
        {/* Tab 1: Pricing & Hedging Lab */}
        <div style={{ display: activeTab === 'options' ? 'block' : 'none', height: '100%' }}>
          <OptionsView />
        </div>

        {/* Tab 2: Volatility Surface */}
        <div style={{ display: activeTab === 'surface' ? 'block' : 'none', height: '100%' }}>
          <VolSurfaceView />
        </div>

      </main>

      {/* --- FOOTER --- */}
      <footer className="app-footer">
        ESILV © 2026 | PI² Team 406 - OPTION PRICING ENGINE
      </footer>
    </div>
  )
}

export default App