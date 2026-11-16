import { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown } from "lucide-react";

interface PriceData {
  time: string;
  price: number;
  timestamp: number;
}

interface CryptoChartProps {
  symbol?: string;
  pair?: string;
}

export default function CryptoChart({ symbol = "BTC", pair = "USDT" }: CryptoChartProps) {
  const [priceData, setPriceData] = useState<PriceData[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [priceChange, setPriceChange] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  // Generate realistic price movements
  const generatePriceData = () => {
    const now = Date.now();
    const data: PriceData[] = [];
    let basePrice = 105230; // Starting BTC price
    
    // Generate 50 data points over the last 50 minutes
    for (let i = 49; i >= 0; i--) {
      const timestamp = now - (i * 60 * 1000); // Every minute
      const time = new Date(timestamp).toLocaleTimeString('en-US', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      
      // Simulate realistic price movement
      const volatility = 50; // Price volatility range
      const trend = Math.sin(i * 0.1) * 20; // Slight trending pattern
      const randomWalk = (Math.random() - 0.5) * volatility;
      
      basePrice += trend + randomWalk;
      
      data.push({
        time,
        price: Math.round(basePrice * 100) / 100,
        timestamp
      });
    }
    
    return data;
  };

  // Simulate real-time price updates
  useEffect(() => {
    const initialData = generatePriceData();
    setPriceData(initialData);
    setCurrentPrice(initialData[initialData.length - 1]?.price || 0);
    setPriceChange(0.23); // Current BTC market change: +0.23%
    setLoading(false);

    const interval = setInterval(() => {
      setPriceData(prevData => {
        const lastPrice = prevData[prevData.length - 1]?.price || 105230;
        const volatility = 30;
        const randomChange = (Math.random() - 0.5) * volatility;
        const newPrice = Math.round((lastPrice + randomChange) * 100) / 100;
        
        const now = Date.now();
        const newDataPoint: PriceData = {
          time: new Date(now).toLocaleTimeString('en-US', { 
            hour12: false, 
            hour: '2-digit', 
            minute: '2-digit' 
          }),
          price: newPrice,
          timestamp: now
        };

        // Keep only last 50 data points
        const newData = [...prevData.slice(1), newDataPoint];
        
        // Calculate price change
        const oldPrice = prevData[0]?.price || newPrice;
        const change = ((newPrice - oldPrice) / oldPrice) * 100;
        setPriceChange(change);
        setCurrentPrice(newPrice);
        
        return newData;
      });
    }, 3000); // Update every 3 seconds

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Loading {symbol}/{pair} Chart...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isPositive = priceChange >= 0;

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">
            {symbol}/{pair} Live Chart
          </CardTitle>
          <div className="text-right">
            <div className="text-2xl font-bold">
              ${currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <Badge 
              variant={isPositive ? "default" : "destructive"}
              className={`${isPositive ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'} text-white`}
            >
              {isPositive ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
              {isPositive ? '+' : ''}{priceChange.toFixed(2)}%
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={priceData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="time" 
                fontSize={12}
                tick={{ fill: 'currentColor' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis 
                fontSize={12}
                tick={{ fill: 'currentColor' }}
                axisLine={false}
                tickLine={false}
                domain={['dataMin - 50', 'dataMax + 50']}
                tickFormatter={(value) => `$${value.toLocaleString()}`}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px'
                }}
                formatter={(value: number) => [
                  `$${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
                  'Price'
                ]}
                labelFormatter={(label) => `Time: ${label}`}
              />
              <Line 
                type="monotone" 
                dataKey="price" 
                stroke={isPositive ? "#10b981" : "#ef4444"}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: isPositive ? "#10b981" : "#ef4444" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 flex items-center justify-center text-sm text-muted-foreground">
          <span>Live market data</span>
        </div>
      </CardContent>
    </Card>
  );
}