import React from 'react';

export default function StochasticVolView() {
    return (
        <div className="view-container" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            
            {/* HEADER */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{ width: '4px', height: '32px', background: '#f43f5e', boxShadow: '0 0 12px rgba(244, 63, 94, 0.5)' }}></div>
                    <h2 style={{ fontSize: '18px', color: '#f43f5e', margin: 0 }}>STOCHASTIC VOLATILITY EXTENSIONS</h2>
                </div>
                <div style={{ 
                    padding: '6px 12px', 
                    background: 'rgba(244, 63, 94, 0.1)', 
                    border: '1px solid #f43f5e', 
                    borderRadius: '4px',
                    color: '#f43f5e',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    letterSpacing: '1px'
                }}>
                    STATUS: MODULE IN DEVELOPMENT
                </div>
            </div>

            {/* MAIN CONTENT GRID */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px', flex: 1 }}>
                
                {/* HESTON MODEL CARD */}
                <div className="bloomberg-panel" style={{ position: 'relative', overflow: 'hidden', padding: '25px', display: 'flex', flexDirection: 'column', borderTop: '3px solid #f43f5e' }}>
                    <h3 style={{ fontSize: '16px', color: '#fff', marginTop: 0, marginBottom: '15px', letterSpacing: '1px' }}>HESTON MODEL (1993)</h3>
                    <p style={{ color: '#aaa', fontSize: '13px', lineHeight: '1.6', marginBottom: '20px' }}>
                        The Black-Scholes model assumes constant volatility. The Heston model upgrades our quantitative engine by treating volatility as a random process itself, utilizing a Cox-Ingersoll-Ross (CIR) process for the variance.
                    </p>
                    
                    <div style={{ background: '#0b0f19', padding: '15px', borderRadius: '4px', border: '1px solid #333', marginBottom: '20px', fontFamily: 'monospace', color: '#00d4ff' }}>
                        {/* FIX: Wrapped equations in string literals */}
                        <div style={{ marginBottom: '8px' }}>{"dS_t = μ S_t dt + √v_t S_t dW_{1,t}"}</div>
                        <div>{"dv_t = κ(θ - v_t)dt + σ √v_t dW_{2,t}"}</div>
                    </div>

                    <ul style={{ color: '#888', fontSize: '12px', lineHeight: '1.8', paddingLeft: '20px', margin: 0 }}>
                        <li>Captures the <span style={{color: '#f8fafc'}}>negative correlation</span> (ρ) between asset returns and volatility changes.</li>
                        <li>Generates realistic <span style={{color: '#f8fafc'}}>fat tails</span> and volatility smiles.</li>
                        <li><strong>Implementation roadmap:</strong> Semi-analytical pricing via Characteristic Functions and Monte Carlo using Euler-Maruyama discretization.</li>
                    </ul>

                    {/* WIP OVERLAY */}
                    <div style={{ position: 'absolute', bottom: '20px', right: '20px', color: '#f43f5e', fontSize: '24px', opacity: 0.2 }}>
                        <i className="fas fa-tools"></i>
                    </div>
                </div>

                {/* SABR MODEL CARD */}
                <div className="bloomberg-panel" style={{ position: 'relative', overflow: 'hidden', padding: '25px', display: 'flex', flexDirection: 'column', borderTop: '3px solid #f43f5e' }}>
                    <h3 style={{ fontSize: '16px', color: '#fff', marginTop: 0, marginBottom: '15px', letterSpacing: '1px' }}>SABR MODEL</h3>
                    <p style={{ color: '#aaa', fontSize: '13px', lineHeight: '1.6', marginBottom: '20px' }}>
                        The Stochastic Alpha, Beta, Rho (SABR) model is an industry standard in interest rate and FX derivatives. It provides an excellent analytical approximation for the implied volatility smile.
                    </p>
                    
                    <div style={{ background: '#0b0f19', padding: '15px', borderRadius: '4px', border: '1px solid #333', marginBottom: '20px', fontFamily: 'monospace', color: '#fbbf24' }}>
                        {/* FIX: Wrapped equations in string literals */}
                        <div style={{ marginBottom: '8px' }}>{"dF_t = α_t (F_t)^β dW_{1,t}"}</div>
                        <div>{"dα_t = ν α_t dW_{2,t}"}</div>
                    </div>

                    <ul style={{ color: '#888', fontSize: '12px', lineHeight: '1.8', paddingLeft: '20px', margin: 0 }}>
                        <li><strong>β (Beta):</strong> Controls the backbone dynamics (Log-normal vs Normal).</li>
                        <li><strong>ρ (Rho):</strong> Controls the skewness of the volatility curve.</li>
                        <li><strong>ν (Nu):</strong> Volatility of volatility, controlling the smile's curvature.</li>
                        <li><strong>Implementation roadmap:</strong> Integration with our existing 3D Volatility Surface engine to fit SABR parameters to live market data.</li>
                    </ul>

                     {/* WIP OVERLAY */}
                     <div style={{ position: 'absolute', bottom: '20px', right: '20px', color: '#f43f5e', fontSize: '24px', opacity: 0.2 }}>
                        <i className="fas fa-cogs"></i>
                    </div>
                </div>

            </div>

            {/* FOOTER MESSAGE */}
            <div style={{ 
                marginTop: '25px', 
                padding: '15px', 
                background: 'rgba(244, 63, 94, 0.05)', 
                border: '1px dashed #f43f5e', 
                borderRadius: '4px',
                color: '#aaa',
                fontSize: '12px',
                textAlign: 'center',
                fontFamily: 'monospace'
            }}>
                THESE ADVANCED QUANTITATIVE MODELS ARE SCHEDULED FOR FUTURE DEPLOYMENT. THEY WILL ADDRESS THE LIMITATIONS IDENTIFIED IN OUR CONSTANT-VOLATILITY BACKTESTS.
            </div>

        </div>
    );
}