import { useEffect, useRef } from 'react';
import { createChart, ColorType, CandlestickSeries } from 'lightweight-charts';

export default function CandlestickChart({ data }) {
  const chartContainerRef = useRef();
  const chartRef = useRef(null);
  
  // 1. Initialize Chart (Run once on mount)
  useEffect(() => {
    // Safety Check
    if (!chartContainerRef.current) return;

    // Create Chart Instance
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#888',
      },
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      grid: {
        vertLines: { color: '#222' },
        horzLines: { color: '#222' },
      },
      crosshair: {
        mode: 1, // Magnet mode
        vertLine: {
            color: '#555',
            width: 1,
            style: 3,
            labelBackgroundColor: '#00d4ff',
        },
        horzLine: {
            color: '#555',
            width: 1,
            style: 3,
            labelBackgroundColor: '#00d4ff',
        },
      },
      timeScale: {
        borderColor: '#333',
        timeVisible: true,
        fixLeftEdge: true, // Allow scrolling past start if needed, usually false is safer
        fixRightEdge: true,
      },
      rightPriceScale: {
        borderColor: '#333',
        scaleMargins: {
            top: 0.1,
            bottom: 0.1,
        },
      },
    });

    // Add Candlestick Series (V5 Syntax)
    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#00ff88',
      downColor: '#ff4444',
      borderVisible: false,
      wickUpColor: '#00ff88',
      wickDownColor: '#ff4444',
    });

    chartRef.current = { chart, candlestickSeries };

    // Handle Resizing
    const resizeObserver = new ResizeObserver((entries) => {
        if (!chart || !entries[0]) return;
        const { width, height } = entries[0].contentRect;
        chart.applyOptions({ width, height });
    });
    
    resizeObserver.observe(chartContainerRef.current);

    // Cleanup
    return () => {
      resizeObserver.disconnect();
      chart.remove();
    };
  }, []);

  // 2. Update Data & Set Initial 6-Month Zoom
  useEffect(() => {
    if (chartRef.current && data && data.length > 0) {
        const { chart, candlestickSeries } = chartRef.current;
        
        // A. Sort & Filter Data (Critical for lightweight-charts)
        const sortedData = [...data].sort((a, b) => 
            new Date(a.time).getTime() - new Date(b.time).getTime()
        );
        
        const uniqueData = sortedData.filter((v, i, a) => 
            i === a.findIndex(t => t.time === v.time)
        );

        // B. Load Data
        candlestickSeries.setData(uniqueData);

        // C. Calculate 6-Month Date Range
        const lastDataPoint = uniqueData[uniqueData.length - 1];
        
        if (lastDataPoint) {
            // Convert last date string to Timestamp
            const lastDate = new Date(lastDataPoint.time);
            
            // Calculate 6 months ago
            const sixMonthsAgo = new Date(lastDate);
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

            // D. Set the Visible Range (Unix timestamps in seconds)
            chart.timeScale().setVisibleRange({
                from: sixMonthsAgo.getTime() / 1000,
                to: lastDate.getTime() / 1000,
            });
        }
    }
  }, [data]);

  return (
    <div 
      ref={chartContainerRef} 
      style={{ 
        width: '100%', 
        height: '100%', 
        position: 'relative',
        minHeight: '200px' 
      }} 
    />
  );
}