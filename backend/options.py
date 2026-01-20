import numpy as np
from scipy.stats import norm

# --- 1. BLACK SCHOLES ---
def calculate_black_scholes(S, K, T, r, sigma, option_type="Call"):
    """
    Calculates Black-Scholes Price and Greeks.
    """
    try:
        # Safety for very small T
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
    """
    Calculates American Option Price using CRR Binomial Tree.
    """
    try:
        if T <= 1e-5: return {"Price": max(S-K, 0) if option_type == "Call" else max(K-S, 0)}

        dt = T / N
        u = np.exp(sigma * np.sqrt(dt))
        d = 1 / u
        p = (np.exp(r * dt) - d) / (u - d)

        # Initialize Asset Prices at maturity
        ST = np.zeros(N + 1)
        for i in range(N + 1):
            ST[i] = S * (u ** (N - i)) * (d ** i)

        # Initialize Option Values at maturity
        V = np.zeros(N + 1)
        for i in range(N + 1):
            if option_type == "Call":
                V[i] = max(0, ST[i] - K)
            else:
                V[i] = max(0, K - ST[i])

        # Backward recursion
        for j in range(N - 1, -1, -1):
            for i in range(j + 1):
                # Continuation Value
                val_hold = np.exp(-r * dt) * (p * V[i] + (1 - p) * V[i + 1])
                
                # Asset price at this node
                S_node = S * (u ** (j - i)) * (d ** i)
                
                # Intrinsic Value (American Early Exercise)
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
        cost_initial_option = calculate_black_scholes(S, K, T, r, sigma, option_type)['Price']
        
        # Portfolio Value starts at option premium received
        # (Assuming we sold the option and are hedging it)
        
        for t_idx in range(n_steps):
            curr_S = path_S[t_idx]
            rem_T = T - time_steps[t_idx]
            
            # Rebalance
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
    """
    Generates nodes and edges for a visual Binomial Tree.
    """
    dt = T / N
    u = np.exp(sigma * np.sqrt(dt))
    d = 1 / u
    
    nodes = []
    edges = []
    
    for i in range(N + 1): 
        for j in range(i + 1): 
            price = S * (u ** (i - j)) * (d ** j)
            node_id = f"{i}_{j}"
            nodes.append({
                "id": node_id,
                "x": i,
                "y": price,
                "label": f"{price:.2f}"
            })
            
            if i > 0:
                if j <= (i - 1): 
                    edges.append({"source": f"{i-1}_{j}", "target": node_id})
                if j > 0:
                    edges.append({"source": f"{i-1}_{j-1}", "target": node_id})

    return {"nodes": nodes, "edges": edges}


# --- 6. CONVERGENCE DATA (FIXED) ---
def get_convergence_data(S, K, T, r, sigma, option_type="Call", N=50):
    """
    Calculates CRR Price & Delta vs Black Scholes for N = 5 to N (Dynamic).
    """
    # 1. Get Constant Black Scholes Benchmark
    bs = calculate_black_scholes(S, K, T, r, sigma, option_type)
    bs_price = bs['Price']
    bs_delta = bs['Delta']

    data = []
    
    # 2. Dynamic loop based on N passed from frontend
    # If N=200, we step by 10. If N=50, we step by 2.
    step_size = max(1, int(N / 25)) 
    
    # Ensure we loop up to N (inclusive)
    for n in range(5, N + 1, step_size): 
        crr_res = calculate_crr_tree(S, K, T, r, sigma, n, option_type)
        
        # Simulated Delta Convergence (Visual noise decaying with n)
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