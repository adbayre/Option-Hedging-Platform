import logging
import time
import json
import os
from datetime import datetime
from typing import List, Dict, Optional, Literal
from pydantic import BaseModel

# Third-party libraries
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
import yfinance as yf
import pandas as pd
import numpy as np

# Custom Modules
from options import (
    calculate_black_scholes,
    calculate_crr_tree,
    simulate_delta_hedging,
    get_binom_tree_data,  
    get_convergence_data   
)

# --- 1. LOGGING CONFIGURATION ---
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.FileHandler("app.log"), logging.StreamHandler()],
)
logger = logging.getLogger(__name__)


# --- 2. PYDANTIC MODELS ---
class OptionPricingRequest(BaseModel):
    S: float  # Spot Price
    K: float  # Strike Price
    T: float  # Time to Maturity (Years)
    r: float  # Risk Free Rate
    sigma: float  # Volatility
    option_type: Literal["Call", "Put"] = "Call"
    N: int = 50  # CRR Steps

class HedgingRequest(BaseModel):
    S: float
    K: float
    T: float
    r: float
    sigma: float
    option_type: Literal["Call", "Put"] = "Call"
    n_steps: int = 52
    n_paths: int = 100


# --- 3. FASTAPI SETUP ---
app = FastAPI(title="Derivatives Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- 4. GLOBAL ERROR HANDLER ---
@app.middleware("http")
async def global_exception_handler(request: Request, call_next):
    try:
        return await call_next(request)
    except Exception as e:
        logger.critical(f"CRITICAL SERVER ERROR: {e}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal Server Error. Check logs for details."},
        )


# --- 5. ENDPOINTS ---

@app.get("/")
def read_root():
    return {"status": "Option Engine Running", "version": "2.0.0"}

@app.post("/api/options/pricing")
def get_option_pricing(request: OptionPricingRequest):
    """Calculate BS and CRR prices and Greeks"""
    try:
        bs_res = calculate_black_scholes(
            request.S, request.K, request.T, request.r, request.sigma, request.option_type
        )
        crr_res = calculate_crr_tree(
            request.S, request.K, request.T, request.r, request.sigma, request.N, request.option_type
        )
        return {
            "bs": bs_res,
            "crr": crr_res
        }
    except Exception as e:
        logger.error(f"Option pricing error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/options/hedging")
def get_hedging_simulation(request: HedgingRequest):
    """Run Monte Carlo Delta Hedging Simulation"""
    try:
        result = simulate_delta_hedging(
            request.S, request.K, request.T, request.r, request.sigma,
            request.n_steps, request.n_paths, request.option_type
        )
        return result
    except Exception as e:
        logger.error(f"Hedging simulation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/options/chain/{ticker}")
def get_option_chain_data(ticker: str, spot: float, option_type: str = "Call"):
    """Fetch real option chain for Volatility Surface (simplified)"""
    try:
        tk = yf.Ticker(ticker)
        exps = tk.options[:6]  # First 6 expirations
        if not exps:
            raise HTTPException(status_code=404, detail="No options found")
        
        strikes = []
        maturities = []
        ivs = []
        
        for exp in exps:
            chain = tk.option_chain(exp)
            data = chain.calls if option_type == "Call" else chain.puts
            
            T_years = (pd.to_datetime(exp) - pd.Timestamp.now()).days / 365.0
            if T_years < 0.01: continue
            
            # Filter for liquidity and relevance around spot
            mask = (data['impliedVolatility'] > 0.001) & \
                   (data['strike'] > spot * 0.5) & \
                   (data['strike'] < spot * 1.5)
            
            filtered = data[mask]
            
            strikes.extend(filtered['strike'].tolist())
            maturities.extend([T_years] * len(filtered))
            ivs.extend(filtered['impliedVolatility'].tolist())
            
        return {"strikes": strikes, "maturities": maturities, "ivs": ivs}
        
    except Exception as e:
        logger.error(f"Option chain fetch error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    
quote_cache = {}
CACHE_DURATION = 60

@app.get("/api/asset/{ticker}/realtime")
def get_realtime_asset(ticker: str):
    ticker = ticker.upper()
    current_time = time.time()

    # Check Cache
    if ticker in quote_cache:
        cached_item = quote_cache[ticker]
        if current_time < cached_item["expiry"]:
            return cached_item["data"]

    try:
        stock = yf.Ticker(ticker)
        try:
            # fast_info is faster and more reliable for real-time price
            price = stock.fast_info["last_price"]
            prev_close = stock.fast_info["previous_close"]
            
            if price is None:
                # Fallback to history if fast_info fails
                hist = stock.history(period="1d")
                if hist.empty:
                    raise ValueError("No data found")
                price = hist["Close"].iloc[-1]
                prev_close = hist["Open"].iloc[0] # Approx fallback
                
        except Exception:
            raise HTTPException(status_code=404, detail=f"Ticker '{ticker}' not found")

        change = price - prev_close
        pct_change = (change / prev_close) * 100

        data = {
            "symbol": ticker,
            "price": round(price, 2),
            "change": round(change, 2),
            "pct_change": round(pct_change, 2),
            "last_updated": datetime.now().strftime("%H:%M:%S"),
        }
        
        # Update Cache
        quote_cache[ticker] = {"data": data, "expiry": current_time + CACHE_DURATION}
        return data

    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Realtime fetch failed: {e}")
        raise HTTPException(status_code=503, detail="Network Error")

# --- Market Data Endpoint for "Fit Data" Mode ---
@app.get("/api/market/index/{ticker}")
def get_index_data(ticker: str, period: str = "5y"):
    try:
        # 1. Fetch Data
        stock = yf.Ticker(ticker)
        # Fetch slightly more data to calculate volatility accurately
        df = stock.history(period=period)
        
        if df.empty:
            raise HTTPException(status_code=404, detail="Ticker not found")
            
        # 2. Calculate "Fitted" Parameters
        current_price = df["Close"].iloc[-1]
        
        # Calculate Volatility (Annualized Std Dev of Log Returns)
        df["Log_Ret"] = np.log(df["Close"] / df["Close"].shift(1))
        annualized_vol = df["Log_Ret"].std() * np.sqrt(252)
        
        # Risk Free Rate (Using 10Y Treasury as proxy, or default to 4.5%)
        # For speed, we will hardcode a realistic default if TNX fails, or fetch it
        try:
            tnx = yf.Ticker("^TNX")
            rate = tnx.fast_info["last_price"] / 100
        except:
            rate = 0.045

        # 3. Format Data for Chart
        df.reset_index(inplace=True)
        chart_data = []
        for _, row in df.iterrows():
            chart_data.append({
                "time": row["Date"].strftime("%Y-%m-%d"),
                "open": row["Open"],
                "high": row["High"],
                "low": row["Low"],
                "close": row["Close"]
            })

        return {
            "spot": round(current_price, 2),
            "volatility": round(annualized_vol, 4),
            "rate": round(rate, 4),
            "chart_data": chart_data
        }

    except Exception as e:
        logger.error(f"Market data error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    
@app.post("/api/options/visuals")
def get_option_visuals(request: OptionPricingRequest):
    """Returns data for Tree and Convergence charts"""
    try:
        # 1. Tree Data
        # VISUAL SAFETY: We cap the visual tree at 18 steps. 
        # Drawing 200 steps (SVG) is impossible for a browser to render smoothly.
        # This makes the tree look "denser" as you drag the slider, up to a limit.
        visual_steps = min(request.N, 18)
        
        tree_data = get_binom_tree_data(
            request.S, request.K, request.T, request.r, request.sigma, 
            request.option_type, 
            N=visual_steps # Now uses the slider value (capped)
        )
        
        # 2. Convergence Data
        # This uses the FULL N (up to 200) for the charts.
        conv_data = get_convergence_data(
            request.S, request.K, request.T, request.r, request.sigma, 
            request.option_type, 
            N=request.N # Now uses the slider value (uncapped)
        )
        
        return {
            "tree": tree_data,
            "convergence": conv_data
        }
    except Exception as e:
        logger.error(f"Visuals error: {e}")
        raise HTTPException(status_code=500, detail=str(e))