import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, TrendingDown, Wallet, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import TradeResultPopup from "./trade-result-popup";

interface Trade {
  id: number;
  pair: string;
  tradeType: string;
  amount: string;
  duration: number;
  startTime: string;
  endTime: string;
  result: string | null;
  pnl: string | null;
  isActive: boolean;
}

interface CompletedTrade {
  id: number;
  pair: string;
  tradeType: string;
  amount: string;
  result: 'win' | 'loss';
  pnl: string;
  duration: number;
}

const TRADING_PAIRS = [
  "BTC/USDT", "BTC/BUSD", "BTC/ETH", "ETH/USDT", "ETH/BUSD", "ETH/BTC",
  "BNB/USDT", "SOL/USDT", "ADA/USDT", "XRP/USDT", "AVAX/USDT", "DOGE/USDT",
  "SHIB/USDT", "DOT/USDT", "MATIC/USDT", "TRX/USDT", "LTC/USDT", "LINK/USDT",
  "ARB/USDT", "OP/USDT", "USDT/BUSD", "USDC/USDT", "DAI/USDT", "UNI/USDT",
  "SUSHI/USDT", "AAVE/USDT", "CAKE/USDT", "SAND/USDT", "MANA/USDT", "AXS/USDT",
  "GALA/USDT", "PEPE/USDT", "FLOKI/USDT", "BONK/USDT", "WIF/USDT", "APT/USDT",
  "INJ/USDT", "STX/USDT", "FTM/USDT", "RNDR/USDT"
];

interface UserProfile {
  id: number;
  username: string;
  email: string;
  balance: string;
  referralCode: string;
}

interface LiveTradingProps {
  setActiveSection?: (section: string) => void;
}

export default function LiveTrading({ setActiveSection }: LiveTradingProps = {}) {
  const [tradeAmount, setTradeAmount] = useState("100.00");
  const [selectedDuration, setSelectedDuration] = useState(0.5);
  const [selectedMarket, setSelectedMarket] = useState("BTC/USDT");
  const [countdown, setCountdown] = useState<string | null>(null);
  const [completedTradeResult, setCompletedTradeResult] = useState<CompletedTrade | null>(null);
  const previousActiveTradesRef = useRef<Trade[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch user profile for balance validation
  const { data: profile } = useQuery<UserProfile>({
    queryKey: ["/api/profile"],
    refetchInterval: 5000,
  });

  // Fetch active trades
  const { data: activeTrades = [] } = useQuery<Trade[]>({
    queryKey: ["/api/trades/active"],
    refetchInterval: 1000, // Refresh every second for countdown
  });

  // Place trade mutation
  const placeTradeMutation = useMutation({
    mutationFn: async (tradeData: { tradeType: string; amount: string; duration: number; pair: string }) => {
      const response = await apiRequest("POST", "/api/trade", tradeData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Trade placed successfully",
        description: "Your trade is now active",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/trades/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
    },
    onError: (error) => {
      toast({
        title: "Failed to place trade",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update countdown for active trades
  useEffect(() => {
    if (activeTrades.length > 0) {
      const activeTrade = activeTrades[0];
      const endTime = new Date(activeTrade.endTime).getTime();
      
      const updateCountdown = () => {
        const now = Date.now();
        const remaining = Math.max(0, endTime - now);
        
        if (remaining === 0) {
          setCountdown("ENDED");
          queryClient.invalidateQueries({ queryKey: ["/api/trades/active"] });
          queryClient.invalidateQueries({ queryKey: ["/api/trades"] });
          return;
        }
        
        const minutes = Math.floor(remaining / 60000);
        const seconds = Math.floor((remaining % 60000) / 1000);
        setCountdown(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      };
      
      updateCountdown();
      const interval = setInterval(updateCountdown, 1000);
      
      return () => clearInterval(interval);
    } else {
      setCountdown(null);
    }
  }, [activeTrades, queryClient]);

  // Detect completed trades and show popup
  useEffect(() => {
    const prevTrades = previousActiveTradesRef.current;
    
    if (prevTrades.length > 0 && activeTrades.length === 0) {
      // A trade has just completed, fetch the latest trade to get the result
      const fetchCompletedTrade = async () => {
        try {
          const response = await apiRequest("GET", "/api/trades");
          const allTrades = await response.json();
          
          if (allTrades.length > 0) {
            const latestTrade = allTrades[0];
            
            // Check if this trade just completed (has a result but was previously active)
            if (latestTrade.result && !latestTrade.isActive) {
              const completedTrade: CompletedTrade = {
                id: latestTrade.id,
                pair: latestTrade.pair,
                tradeType: latestTrade.tradeType,
                amount: latestTrade.amount,
                result: latestTrade.result as 'win' | 'loss',
                pnl: latestTrade.pnl || "0.00",
                duration: latestTrade.duration,
              };
              
              setCompletedTradeResult(completedTrade);
              
              // Refresh user balance and trade history
              queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
              queryClient.invalidateQueries({ queryKey: ["/api/trades"] });
            }
          }
        } catch (error) {
          console.error("Error fetching completed trade:", error);
        }
      };
      
      fetchCompletedTrade();
    }
    
    // Update the ref after checking
    previousActiveTradesRef.current = activeTrades;
  }, [activeTrades, queryClient]);

  const handleCloseTradeResultPopup = () => {
    setCompletedTradeResult(null);
  };

  const handlePlaceTrade = (tradeType: "buy" | "sell") => {
    const amount = parseFloat(tradeAmount);
    const userBalance = parseFloat(profile?.balance || "0");
    
    if (amount <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid trade amount",
        variant: "destructive",
      });
      return;
    }

    if (userBalance <= 0) {
      toast({
        title: "Insufficient balance",
        description: "Please deposit funds to your account before trading",
        variant: "destructive",
      });
      return;
    }

    if (amount > userBalance) {
      toast({
        title: "Insufficient balance",
        description: `Your balance is $${userBalance.toFixed(2)}. Please reduce the trade amount or deposit more funds.`,
        variant: "destructive",
      });
      return;
    }

    placeTradeMutation.mutate({
      tradeType,
      amount: tradeAmount,
      duration: selectedDuration.toString(),
      pair: selectedMarket,
    });
  };

  const activeTrade = activeTrades[0];

  return (
    <Card className="dark-surface border-[var(--kucoin-dark-300)]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-white">Live Trading</CardTitle>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-[var(--kucoin-success)] rounded-full animate-pulse" />
            <span className="text-sm text-[var(--kucoin-success)]">Live</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Active Trade Display */}
        {activeTrade && (
          <div className="dark-surface-elevated rounded-lg p-4">
            <div className="text-center">
              <p className="text-sm text-[var(--kucoin-dark-100)] mb-2">
                Current Trade: {activeTrade.pair}
              </p>
              <div className="text-3xl font-bold text-white mb-2">
                {countdown || "00:00"}
              </div>
              <div className="flex justify-center space-x-6">
                <div className="text-center">
                  <p className="text-xs text-[var(--kucoin-dark-100)]">Entry Price</p>
                  <p className="text-sm font-semibold text-white">$43,250.00</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-[var(--kucoin-dark-100)]">Amount</p>
                  <p className="text-sm font-semibold text-[var(--kucoin-primary)]">
                    ${activeTrade.amount}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-[var(--kucoin-dark-100)]">Direction</p>
                  <Badge
                    className={
                      activeTrade.tradeType === "buy"
                        ? "bg-[var(--kucoin-success)]/20 text-[var(--kucoin-success)]"
                        : "bg-[var(--kucoin-danger)]/20 text-[var(--kucoin-danger)]"
                    }
                  >
                    {activeTrade.tradeType.toUpperCase()}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Zero Balance Warning */}
        {!activeTrade && parseFloat(profile?.balance || "0") <= 0 && (
          <div className="bg-gradient-to-r from-[var(--kucoin-warning)]/20 to-[var(--kucoin-danger)]/20 rounded-lg p-6 border border-[var(--kucoin-warning)]/30 text-center">
            <Wallet className="w-12 h-12 text-[var(--kucoin-warning)] mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Deposit Required</h3>
            <p className="text-[var(--kucoin-dark-100)] mb-4">
              You need to deposit funds to your account before you can start trading.
            </p>
            <Button 
              className="gradient-primary text-white hover:opacity-90"
              onClick={() => setActiveSection?.('wallet')}
            >
              <Plus className="w-4 h-4 mr-2" />
              Deposit Funds
            </Button>
          </div>
        )}

        {/* Trading Controls */}
        {!activeTrade && parseFloat(profile?.balance || "0") > 0 && (
          <div className="space-y-4">
            {/* Market Selection */}
            <div>
              <Label className="block text-sm font-medium text-[var(--kucoin-dark-100)] mb-2">
                Select Market
              </Label>
              <Select value={selectedMarket} onValueChange={setSelectedMarket}>
                <SelectTrigger className="bg-[var(--kucoin-dark-300)] border-[var(--kucoin-dark-200)] text-white">
                  <SelectValue placeholder="Select trading pair" />
                </SelectTrigger>
                <SelectContent className="bg-[var(--kucoin-dark-400)] border-[var(--kucoin-dark-200)] max-h-60">
                  {TRADING_PAIRS.map((pair) => (
                    <SelectItem 
                      key={pair} 
                      value={pair}
                      className="text-white hover:bg-[var(--kucoin-dark-300)] focus:bg-[var(--kucoin-dark-300)]"
                    >
                      {pair}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Trade Amount */}
            <div>
              <Label className="block text-sm font-medium text-[var(--kucoin-dark-100)] mb-2">
                Trade Amount (USDT)
              </Label>
              <div className="relative">
                <Input
                  type="number"
                  value={tradeAmount}
                  onChange={(e) => setTradeAmount(e.target.value)}
                  placeholder="100.00"
                  className="bg-[var(--kucoin-dark-300)] border-[var(--kucoin-dark-200)] text-white placeholder-[var(--kucoin-dark-100)] pr-16"
                />
                <div className="absolute right-3 top-3 text-[var(--kucoin-dark-100)] text-sm">
                  USDT
                </div>
              </div>
            </div>

            {/* Trade Duration */}
            <div>
              <Label className="block text-sm font-medium text-[var(--kucoin-dark-100)] mb-2">
                Trade Duration
              </Label>
              <div className="grid grid-cols-4 gap-2 mb-2">
                {[
                  { value: 0.5, label: "30s" },
                  { value: 1, label: "1m" },
                  { value: 3, label: "3m" },
                  { value: 5, label: "5m" }
                ].map((duration) => (
                  <Button
                    key={duration.value}
                    variant={selectedDuration === duration.value ? "default" : "outline"}
                    onClick={() => setSelectedDuration(duration.value)}
                    className={
                      selectedDuration === duration.value
                        ? "gradient-primary text-white"
                        : "bg-[var(--kucoin-dark-300)] border-[var(--kucoin-dark-200)] text-white hover:bg-[var(--kucoin-primary)] hover:text-white"
                    }
                  >
                    {duration.label}
                  </Button>
                ))}
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { value: 10, label: "10m" },
                  { value: 15, label: "15m" },
                  { value: 30, label: "30m" },
                  { value: 60, label: "1h" }
                ].map((duration) => (
                  <Button
                    key={duration.value}
                    variant={selectedDuration === duration.value ? "default" : "outline"}
                    onClick={() => setSelectedDuration(duration.value)}
                    className={
                      selectedDuration === duration.value
                        ? "gradient-primary text-white"
                        : "bg-[var(--kucoin-dark-300)] border-[var(--kucoin-dark-200)] text-white hover:bg-[var(--kucoin-primary)] hover:text-white"
                    }
                  >
                    {duration.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Buy/Sell Buttons */}
            <div className="grid grid-cols-2 gap-4">
              <Button
                onClick={() => handlePlaceTrade("buy")}
                disabled={placeTradeMutation.isPending}
                className="bg-[var(--kucoin-success)] hover:bg-[var(--kucoin-success)]/80 text-white py-4 text-lg font-semibold"
              >
                <TrendingUp className="w-5 h-5 mr-2" />
                BUY
              </Button>
              <Button
                onClick={() => handlePlaceTrade("sell")}
                disabled={placeTradeMutation.isPending}
                className="bg-[var(--kucoin-danger)] hover:bg-[var(--kucoin-danger)]/80 text-white py-4 text-lg font-semibold"
              >
                <TrendingDown className="w-5 h-5 mr-2" />
                SELL
              </Button>
            </div>
          </div>
        )}
      </CardContent>
      
      {/* Trade Result Popup */}
      <TradeResultPopup 
        tradeResult={completedTradeResult}
        onClose={handleCloseTradeResultPopup}
      />
    </Card>
  );
}
