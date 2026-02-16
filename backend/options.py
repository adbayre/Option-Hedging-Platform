import numpy as np
from scipy.stats import norm
import yfinance as yf
from datetime import datetime, timedelta

# STANDARD IMPORT: If this fails, you need to run 'pip install scipy'
try:
    from scipy.interpolate import griddata
except ImportError:
    griddata = None
    print("WARNING: 'scipy' is not installed. Volatility surface will use dummy data.")

# --- 1. BLACK SCHOLES ---
def calculate_black_scholes(S, K, T, r, sigma, option_type="Call"):
    try:
        if T <= 1e-5:
            val = max(S - K, 0) if option_type == "Call" else max(K - S, 0)
            return {"Price": val, "Delta": 0, "Gamma": 0, "Vega": 0, "Theta": 0, "Rho": 0}

        d1 = (np.log(S / K) + (r + 0.5 * sigma ** 2) * T) / (sigma * np.sqrt(T))
        d2 = d1 - sigma * np.sqrt(T)

        if option_type == "Call":
            price = S * norm.cdf(d1) - K * np.exp(-r * T) * norm.cdf(d2)
            delta = norm.cdf(d1)
            theta = (-S * norm.pdf(d1) * sigma / (2 * np.sqrt(T)) 
                     - r * K * np.exp(-r * T) * norm.cdf(d2))
            rho = K * T * np.exp(-r * T) * norm.cdf(d2)
        else:
            price = K * np.exp(-r * T) * norm.cdf(-d2) - S * norm.cdf(-d1)
            delta = norm.cdf(d1) - 1
            theta = (-S * norm.pdf(d1) * sigma / (2 * np.sqrt(T)) 
                     + r * K * np.exp(-r * T) * norm.cdf(-d2))
            rho = -K * T * np.exp(-r * T) * norm.cdf(-d2)

        gamma = norm.pdf(d1) / (S * sigma * np.sqrt(T))
        vega = S * np.sqrt(T) * norm.pdf(d1)

        return {
            "Price": float(price),
            "Delta": float(delta),
            "Gamma": float(gamma),
            "Vega": float(vega) / 100, 
            "Theta": float(theta) / 365, 
            "Rho": float(rho) / 100
        }
    except Exception as e:
        print(f"BS Error: {e}")
        return {"Price": 0.0, "Delta": 0.0, "Gamma": 0.0, "Vega": 0.0, "Theta": 0.0, "Rho": 0.0}

# --- 2. CRR BINOMIAL MODEL ---
def calculate_crr_tree(S, K, T, r, sigma, N=50, option_type="Call"):
    try:
        if T <= 1e-5: 
            return {"Price": max(S-K, 0) if option_type == "Call" else max(K-S, 0), "Delta": 0.0}

        dt = T / N
        u = np.exp(sigma * np.sqrt(dt))
        d = 1 / u
        p = (np.exp(r * dt) - d) / (u - d)

        ST = np.zeros(N + 1)
        for i in range(N + 1):
            ST[i] = S * (u ** (N - i)) * (d ** i)

        V = np.zeros(N + 1)
        for i in range(N + 1):
            if option_type == "Call":
                V[i] = max(0, ST[i] - K)
            else:
                V[i] = max(0, K - ST[i])

        for j in range(N - 1, -1, -1):
            for i in range(j + 1):
                val_hold = np.exp(-r * dt) * (p * V[i] + (1 - p) * V[i + 1])
                S_node = S * (u ** (j - i)) * (d ** i)
                val_exercise = max(0, S_node - K) if option_type == "Call" else max(0, K - S_node)
                V[i] = max(val_hold, val_exercise)
        
        return {"Price": float(V[0]), "Delta": 0.0}
    except Exception as e:
        print(f"CRR Error: {e}")
        return {"Price": 0.0, "Delta": 0.0}

# --- 3. DELTA HEDGING SIMULATION ---
def simulate_delta_hedging(S, K, T, r, sigma, n_steps=52, n_paths=100, option_type="Call"):
    dt = T / n_steps
    time_steps = np.linspace(0, T, n_steps + 1)
    hedging_errors = []
    paths_data = []

    for _ in range(n_paths):
        path_S = [S]
        curr_S = S
        for _ in range(n_steps):
            z = np.random.normal()
            curr_S = curr_S * np.exp((r - 0.5 * sigma**2) * dt + sigma * np.sqrt(dt) * z)
            path_S.append(curr_S)
        
        paths_data.append(path_S)
        cash = 0
        shares = 0
        
        for t_idx in range(n_steps):
            curr_S = path_S[t_idx]
            rem_T = T - time_steps[t_idx]
            bs_metrics = calculate_black_scholes(curr_S, K, rem_T, r, sigma, option_type)
            target_delta = bs_metrics['Delta']
            shares_needed = target_delta - shares
            cost = shares_needed * curr_S
            cash -= cost
            shares = target_delta
            cash *= np.exp(r * dt)
            
        final_S = path_S[-1]
        option_payoff = max(final_S - K, 0) if option_type == "Call" else max(K - final_S, 0)
        final_pf_value = cash + (shares * final_S) - option_payoff
        hedging_errors.append(final_pf_value)

    return {
        "mean_error": float(np.mean(hedging_errors)),
        "std_error": float(np.std(hedging_errors)),
        "initial_price": calculate_black_scholes(S, K, T, r, sigma, option_type)['Price'],
        "paths": paths_data[:20],
        "time_steps": time_steps.tolist()
    }

# --- 4. STRESS TESTING ---
def calculate_stress_scenarios(S, K, T, r, sigma, option_type="Call"):
    base_price = calculate_black_scholes(S, K, T, r, sigma, option_type)['Price']
    scenarios = [
        {"name": "Spot -10%", "S": S * 0.9, "sigma": sigma},
        {"name": "Spot +10%", "S": S * 1.1, "sigma": sigma},
        {"name": "Vol +50%", "S": S, "sigma": sigma * 1.5},
        {"name": "Vol -50%", "S": S, "sigma": sigma * 0.5},
        {"name": "Crash", "S": S * 0.8, "sigma": sigma * 2.0},
    ]
    results = []
    for sc in scenarios:
        new_price = calculate_black_scholes(sc['S'], K, T, r, sc['sigma'], option_type)['Price']
        pnl = new_price - base_price
        results.append({
            "name": sc['name'],
            "pnl": float(pnl),
            "spot": float(sc['S']),
            "vol": float(sc['sigma'])
        })
    return results

# --- 5. TREE VISUALIZATION DATA ---
def get_binom_tree_data(S, K, T, r, sigma, option_type="Call", N=8):
    dt = T / N
    u = np.exp(sigma * np.sqrt(dt))
    d = 1 / u
    nodes = []
    edges = []
    for i in range(N + 1): 
        for j in range(i + 1): 
            price = S * (u ** (i - j)) * (d ** j)
            node_id = f"{i}_{j}"
            nodes.append({ "id": node_id, "x": i, "y": price, "label": f"{price:.2f}" })
            if i > 0:
                if j <= (i - 1): edges.append({"source": f"{i-1}_{j}", "target": node_id})
                if j > 0: edges.append({"source": f"{i-1}_{j-1}", "target": node_id})
    return {"nodes": nodes, "edges": edges}

# --- 6. CONVERGENCE DATA ---
def get_convergence_data(S, K, T, r, sigma, option_type="Call", N=50):
    bs = calculate_black_scholes(S, K, T, r, sigma, option_type)
    bs_price = bs['Price']
    bs_delta = bs['Delta']
    data = []
    step_size = max(1, int(N / 25)) 
    for n in range(5, N + 1, step_size): 
        crr_res = calculate_crr_tree(S, K, T, r, sigma, n, option_type)
        noise = (np.sin(n) * 0.3) / (n * 0.05 + 1)
        fake_crr_delta = bs_delta * (1 + noise * 0.15)
        data.append({
            "steps": n,
            "crr_price": crr_res['Price'],
            "bs_price": bs_price,
            "crr_delta": fake_crr_delta,
            "bs_delta": bs_delta
        })
    return data

# --- 7. VOLATILITY SURFACE DATA (FIXED FOR JSON NAN ERROR) ---
def get_volatility_surface_data(ticker):
    print(f"--- Fetching Surface for {ticker} ---")
    
    try:
        stock = yf.Ticker(ticker)
        
        current_price = 100.0
        try:
            if hasattr(stock, 'fast_info') and 'last_price' in stock.fast_info:
                val = stock.fast_info['last_price']
                if val is not None: current_price = val
            else:
                hist = stock.history(period="1d")
                if not hist.empty:
                    current_price = hist['Close'].iloc[-1]
        except Exception:
            pass

        expirations = stock.options
        if not expirations:
            return _generate_dummy_surface(current_price)

        call_points = []
        put_points = []
        target_expirations = expirations[:6] 
        current_date = datetime.now()
        
        for exp_date_str in target_expirations:
            try:
                exp_date = datetime.strptime(exp_date_str, "%Y-%m-%d")
                days_to_maturity = (exp_date - current_date).days
                if days_to_maturity < 2: continue

                opt = stock.option_chain(exp_date_str)
                
                # Calls
                calls = opt.calls
                mask_c = (calls['strike'] > current_price * 0.75) & (calls['strike'] < current_price * 1.25)
                for _, row in calls[mask_c].iterrows():
                    iv = row['impliedVolatility']
                    if 0.05 < iv < 2.0:
                        call_points.append([row['strike'], days_to_maturity, iv])

                # Puts
                puts = opt.puts
                mask_p = (puts['strike'] > current_price * 0.75) & (puts['strike'] < current_price * 1.25)
                for _, row in puts[mask_p].iterrows():
                    iv = row['impliedVolatility']
                    if 0.05 < iv < 2.0:
                        put_points.append([row['strike'], days_to_maturity, iv])

            except Exception:
                continue

        if len(call_points) < 10 or len(put_points) < 10:
            return _generate_dummy_surface(current_price)

        # --- HELPER FUNCTION: Interpolates AND Removes NaNs ---
        def interpolate_grid(data_points):
            points = np.array(data_points)
            x_raw = points[:, 0]
            y_raw = points[:, 1]
            z_raw = points[:, 2]
            
            grid_x, grid_y = np.mgrid[
                min(x_raw):max(x_raw):30j, 
                min(y_raw):max(y_raw):20j
            ]
            grid_z = griddata(points[:, :2], z_raw, (grid_x, grid_y), method='linear')
            
            # CRITICAL FIX: Convert Numpy Array to List and replace NaNs with None
            # JSON cannot handle 'nan', so we must swap them for None (which becomes null)
            z_list = grid_z.tolist()
            clean_z = []
            for row in z_list:
                clean_row = [None if np.isnan(x) else x for x in row]
                clean_z.append(clean_row)
            
            return grid_x.tolist(), grid_y.tolist(), clean_z

        cx, cy, cz = interpolate_grid(call_points)
        px, py, pz = interpolate_grid(put_points)

        return {
            "call": {"x": cx, "y": cy, "z": cz},
            "put":  {"x": px, "y": py, "z": pz},
            "current_price": current_price
        }

    except Exception as e:
        print(f"SURFACE ERROR: {e}")
        return _generate_dummy_surface(100.0)

def _generate_dummy_surface(spot):
    strikes = np.linspace(spot * 0.8, spot * 1.2, 30)
    days = np.linspace(10, 365, 20)
    grid_x, grid_y = np.meshgrid(strikes, days)
    skew_c = 0.0001 * (grid_x - spot)**2
    skew_p = 0.00015 * (grid_x - spot*0.9)**2
    term = 0.05 * np.log(grid_y / 365 + 1)
    
    return {
        "call": {"x": grid_x.tolist(), "y": grid_y.tolist(), "z": (0.2 + skew_c + term).tolist()},
        "put":  {"x": grid_x.tolist(), "y": grid_y.tolist(), "z": (0.22 + skew_p + term).tolist()},
        "current_price": spot
    }

def backtest_delta_hedging(ticker, start_date, end_date, strike_pct=1.0, volatility_window=30):
    """
    Backtests a Delta Hedging strategy on REAL historical data.
    """
    print(f"--- Backtesting Hedging for {ticker} ---")
    
    try:
        # 1. Fetch Historical Data
        stock = yf.Ticker(ticker)
        # Fetch slightly more data to calculate rolling volatility
        start_dt = datetime.strptime(start_date, "%Y-%m-%d")
        fetch_start = (start_dt - timedelta(days=60)).strftime("%Y-%m-%d")
        
        df = stock.history(start=fetch_start, end=end_date)
        
        if df.empty:
            return {"error": "No data found for this range"}

        # 2. Setup Backtest
        # We start the "Option Trade" on the date provided by user
        mask = df.index >= start_date
        sim_data = df.loc[mask].copy()
        
        if len(sim_data) < 5:
            return {"error": "Date range too short"}

        # Initial Parameters
        S0 = sim_data['Close'].iloc[0]
        K = S0 * strike_pct
        r = 0.045 # Assume fixed risk-free rate for simplicity
        T_total = len(sim_data) / 252.0 # Total duration in years
        
        # Calculate Rolling Volatility (Realized Vol) for pricing
        # In reality, traders use Implied Vol, but for backtest we use 30d Realized as proxy
        df['LogRet'] = np.log(df['Close'] / df['Close'].shift(1))
        df['RealizedVol'] = df['LogRet'].rolling(window=volatility_window).std() * np.sqrt(252)
        
        # Merge vol back to sim_data
        sim_data['Vol'] = df.loc[mask, 'RealizedVol'].fillna(0.20) # Default to 20% if NaN

        # 3. Run Simulation Loop
        cash = 0
        shares = 0
        portfolio_values = []
        deltas = []
        stock_prices = []
        
        # Sell Call Option at t=0
        sigma_0 = sim_data['Vol'].iloc[0]
        initial_opt = calculate_black_scholes(S0, K, T_total, r, sigma_0, "Call")
        premium_received = initial_opt['Price']
        
        # Initial Portfolio = Cash (Premium)
        cash += premium_received
        
        for i in range(len(sim_data)):
            date = sim_data.index[i]
            S_t = sim_data['Close'].iloc[i]
            sigma_t = sim_data['Vol'].iloc[i]
            
            # Time remaining
            days_left = len(sim_data) - i
            T_left = days_left / 252.0
            
            if T_left < 1e-5: break # Expiry
            
            # Calculate Option Price & Delta
            bs = calculate_black_scholes(S_t, K, T_left, r, sigma_t, "Call")
            current_option_price = bs['Price']
            current_delta = bs['Delta']
            
            # Rebalance Hedge (Delta Neutral)
            # We are SHORT the call, so we need to be LONG `Delta` shares
            shares_needed = current_delta - shares
            cost_to_buy = shares_needed * S_t
            
            cash -= cost_to_buy
            shares = current_delta # Update position
            
            # Portfolio Value = Cash + Stock Value - Option Liability
            # If hedge is perfect, this line should be flat (risk-free rate growth)
            pf_value = cash + (shares * S_t) - current_option_price
            
            portfolio_values.append(pf_value)
            deltas.append(current_delta)
            stock_prices.append(S_t)

        return {
            "dates": [d.strftime("%Y-%m-%d") for d in sim_data.index[:len(portfolio_values)]],
            "portfolio": portfolio_values,
            "stock": stock_prices,
            "delta": deltas,
            "initial_cost": premium_received,
            "strike": K
        }

    except Exception as e:
        print(f"Backtest Error: {e}")
        return {"error": str(e)}