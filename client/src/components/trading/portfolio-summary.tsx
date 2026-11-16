import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { authManager } from "@/lib/auth";
import { Wallet, TrendingUp, Target, Activity } from "lucide-react";

interface PortfolioData {
  totalBalance: string;
  todayPnL: string;
  winRate: string;
  activeTrades: number;
}

interface UserProfile {
  id: number;
  username: string;
  email: string;
  balance: string;
  referralCode: string;
}

interface Trade {
  id: number;
  pair: string;
  tradeType: string;
  amount: string;
  result?: 'win' | 'loss';
  pnl?: string;
  createdAt: string;
}

export default function PortfolioSummary() {
  // Fetch real-time user profile data including balance
  const { data: profile } = useQuery<UserProfile>({
    queryKey: ["/api/profile"],
    refetchInterval: 5000, // Refresh every 5 seconds to keep balance updated
  });

  // Fetch active trades count
  const { data: activeTrades = [] } = useQuery({
    queryKey: ["/api/trades/active"],
    refetchInterval: 1000,
  });

  // Fetch all trades for P&L and win rate calculations
  const { data: allTrades = [] } = useQuery<Trade[]>({
    queryKey: ["/api/trades"],
    refetchInterval: 5000,
  });

  // Calculate today's P&L
  const todayPnL = allTrades
    .filter(trade => {
      const tradeDate = new Date(trade.createdAt).toDateString();
      const today = new Date().toDateString();
      return tradeDate === today && trade.pnl;
    })
    .reduce((total, trade) => total + parseFloat(trade.pnl || "0"), 0);

  // Calculate win rate from completed trades
  const completedTrades = allTrades.filter(trade => trade.result);
  const winningTrades = completedTrades.filter(trade => trade.result === 'win');
  const winRate = completedTrades.length > 0 
    ? ((winningTrades.length / completedTrades.length) * 100).toFixed(1)
    : "0";

  const portfolioData: PortfolioData = {
    totalBalance: profile?.balance || "0.00",
    todayPnL: todayPnL >= 0 ? `+${todayPnL.toFixed(2)}` : todayPnL.toFixed(2),
    winRate: `${winRate}%`,
    activeTrades: Array.isArray(activeTrades) ? activeTrades.length : 0,
  };

  return (
    <Card className="dark-surface border-[var(--kucoin-dark-300)]">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-white">Account Balance</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Prominent Balance Display */}
          <div className="bg-gradient-to-r from-[var(--kucoin-primary)]/20 to-[var(--kucoin-secondary)]/20 rounded-lg p-4 border border-[var(--kucoin-primary)]/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Wallet className="w-5 h-5 text-[var(--kucoin-primary)]" />
                <span className="text-[var(--kucoin-dark-100)]">Available Balance</span>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-white">
                  ${portfolioData.totalBalance}
                </div>
                <div className="text-xs text-[var(--kucoin-dark-100)]">USDT</div>
              </div>
            </div>
          </div>
          
          {/* Trading Stats */}
          <div className="grid grid-cols-1 gap-3">
            <div className="flex justify-between items-center py-2">
              <div className="flex items-center space-x-2">
                <Activity className="w-4 h-4 text-[var(--kucoin-warning)]" />
                <span className="text-[var(--kucoin-dark-100)]">Active Trades</span>
              </div>
              <span className="text-white font-semibold">{portfolioData.activeTrades}</span>
            </div>
            
            <div className="flex justify-between items-center py-2">
              <div className="flex items-center space-x-2">
                <TrendingUp className={`w-4 h-4 ${todayPnL >= 0 ? 'text-[var(--kucoin-success)]' : 'text-[var(--kucoin-danger)]'}`} />
                <span className="text-[var(--kucoin-dark-100)]">Today's P&L</span>
              </div>
              <span className={`font-semibold ${todayPnL >= 0 ? 'text-[var(--kucoin-success)]' : 'text-[var(--kucoin-danger)]'}`}>
                ${portfolioData.todayPnL}
              </span>
            </div>
            
            <div className="flex justify-between items-center py-2">
              <div className="flex items-center space-x-2">
                <Target className="w-4 h-4 text-[var(--kucoin-primary)]" />
                <span className="text-[var(--kucoin-dark-100)]">Win Rate</span>
              </div>
              <span className="text-[var(--kucoin-primary)] font-semibold">
                {portfolioData.winRate}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
