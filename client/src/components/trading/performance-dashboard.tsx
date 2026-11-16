import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Activity, 
  DollarSign, 
  BarChart3,
  PieChart,
  Clock
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Trade {
  id: number;
  pair: string;
  tradeType: string;
  amount: string;
  result?: 'win' | 'loss';
  pnl?: string;
  createdAt: string;
  duration: number;
}

interface UserProfile {
  id: number;
  username: string;
  email: string;
  balance: string;
  referralCode: string;
}

interface PerformanceMetrics {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalProfit: number;
  totalLoss: number;
  netPnL: number;
  avgTradeSize: number;
  bestTrade: number;
  worstTrade: number;
  todayTrades: number;
  todayPnL: number;
  weeklyPnL: number;
  monthlyPnL: number;
}

export default function PerformanceDashboard() {
  const [animatedMetrics, setAnimatedMetrics] = useState<PerformanceMetrics>({
    totalTrades: 0,
    winningTrades: 0,
    losingTrades: 0,
    winRate: 0,
    totalProfit: 0,
    totalLoss: 0,
    netPnL: 0,
    avgTradeSize: 0,
    bestTrade: 0,
    worstTrade: 0,
    todayTrades: 0,
    todayPnL: 0,
    weeklyPnL: 0,
    monthlyPnL: 0,
  });

  const { data: profile } = useQuery<UserProfile>({
    queryKey: ["/api/profile"],
    refetchInterval: 5000,
  });

  const { data: allTrades = [] } = useQuery<Trade[]>({
    queryKey: ["/api/trades"],
    refetchInterval: 3000,
  });

  const { data: activeTrades = [] } = useQuery({
    queryKey: ["/api/trades/active"],
    refetchInterval: 1000,
  });

  // Calculate performance metrics
  const calculateMetrics = (): PerformanceMetrics => {
    const completedTrades = allTrades.filter(trade => trade.result);
    const winningTrades = completedTrades.filter(trade => trade.result === 'win');
    const losingTrades = completedTrades.filter(trade => trade.result === 'loss');
    
    const totalProfit = winningTrades.reduce((sum, trade) => sum + parseFloat(trade.pnl || "0"), 0);
    const totalLoss = Math.abs(losingTrades.reduce((sum, trade) => sum + parseFloat(trade.pnl || "0"), 0));
    
    const today = new Date().toDateString();
    const todayTrades = completedTrades.filter(trade => 
      new Date(trade.createdAt).toDateString() === today
    );
    
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const weeklyTrades = completedTrades.filter(trade => 
      new Date(trade.createdAt) >= weekAgo
    );
    
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const monthlyTrades = completedTrades.filter(trade => 
      new Date(trade.createdAt) >= monthAgo
    );

    const pnlValues = completedTrades.map(trade => parseFloat(trade.pnl || "0"));
    const bestTrade = pnlValues.length > 0 ? Math.max(...pnlValues) : 0;
    const worstTrade = pnlValues.length > 0 ? Math.min(...pnlValues) : 0;

    return {
      totalTrades: completedTrades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate: completedTrades.length > 0 ? (winningTrades.length / completedTrades.length) * 100 : 0,
      totalProfit,
      totalLoss,
      netPnL: totalProfit - totalLoss,
      avgTradeSize: allTrades.length > 0 ? allTrades.reduce((sum, trade) => sum + parseFloat(trade.amount), 0) / allTrades.length : 0,
      bestTrade,
      worstTrade,
      todayTrades: todayTrades.length,
      todayPnL: todayTrades.reduce((sum, trade) => sum + parseFloat(trade.pnl || "0"), 0),
      weeklyPnL: weeklyTrades.reduce((sum, trade) => sum + parseFloat(trade.pnl || "0"), 0),
      monthlyPnL: monthlyTrades.reduce((sum, trade) => sum + parseFloat(trade.pnl || "0"), 0),
    };
  };

  const metrics = calculateMetrics();

  // Animate metrics on change
  useEffect(() => {
    const animateValue = (start: number, end: number, duration: number = 1000) => {
      return new Promise((resolve) => {
        const startTime = Date.now();
        const update = () => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const current = start + (end - start) * progress;
          
          if (progress < 1) {
            requestAnimationFrame(update);
          } else {
            resolve(end);
          }
        };
        update();
      });
    };

    // Animate each metric with staggered timing
    Object.keys(metrics).forEach((key, index) => {
      setTimeout(() => {
        setAnimatedMetrics(prev => ({
          ...prev,
          [key]: metrics[key as keyof PerformanceMetrics]
        }));
      }, index * 100);
    });
  }, [allTrades]);

  const MetricCard = ({ 
    title, 
    value, 
    change, 
    icon: Icon, 
    color,
    suffix = "",
    prefix = "",
    animationDelay = 0 
  }: {
    title: string;
    value: number;
    change?: number;
    icon: any;
    color: string;
    suffix?: string;
    prefix?: string;
    animationDelay?: number;
  }) => {
    const [displayValue, setDisplayValue] = useState(0);

    useEffect(() => {
      const timer = setTimeout(() => {
        const duration = 800;
        const start = displayValue;
        const end = value;
        const startTime = Date.now();

        const animate = () => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const easeOut = 1 - Math.pow(1 - progress, 3);
          const current = start + (end - start) * easeOut;
          
          setDisplayValue(current);
          
          if (progress < 1) {
            requestAnimationFrame(animate);
          }
        };
        animate();
      }, animationDelay);

      return () => clearTimeout(timer);
    }, [value, animationDelay]);

    return (
      <Card className={cn(
        "dark-surface border-[var(--kucoin-dark-200)] hover:border-[var(--kucoin-primary)]/30 transition-all duration-300 hover:shadow-lg",
        "transform hover:scale-[1.02] hover:translate-y-[-2px]"
      )}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={cn("p-2 rounded-lg", color)}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-[var(--kucoin-dark-100)] uppercase tracking-wide">
                  {title}
                </p>
                <div className="flex items-baseline space-x-1">
                  <span className="text-xl font-bold text-white">
                    {prefix}
                    {typeof displayValue === 'number' 
                      ? suffix === '%' 
                        ? displayValue.toFixed(1)
                        : suffix === '$'
                        ? displayValue.toFixed(2)
                        : Math.round(displayValue)
                      : displayValue
                    }
                    {suffix}
                  </span>
                  {change !== undefined && (
                    <Badge
                      variant="secondary"
                      className={cn(
                        "text-xs px-1 py-0",
                        change >= 0 ? "bg-[var(--kucoin-success)]/20 text-[var(--kucoin-success)]" : "bg-[var(--kucoin-danger)]/20 text-[var(--kucoin-danger)]"
                      )}
                    >
                      {change >= 0 ? "+" : ""}{change.toFixed(1)}%
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const WinRateIndicator = ({ winRate }: { winRate: number }) => {
    const [animatedRate, setAnimatedRate] = useState(0);

    useEffect(() => {
      const timer = setTimeout(() => {
        setAnimatedRate(winRate);
      }, 500);
      return () => clearTimeout(timer);
    }, [winRate]);

    const circumference = 2 * Math.PI * 50;
    const strokeDashoffset = circumference - (animatedRate / 100) * circumference;

    return (
      <Card className="dark-surface border-[var(--kucoin-dark-200)] overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-lg flex items-center gap-2">
            <Target className="w-5 h-5 text-[var(--kucoin-primary)]" />
            Win Rate Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative w-32 h-32 mx-auto mb-4">
            <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
              {/* Background circle */}
              <circle
                cx="60"
                cy="60"
                r="50"
                fill="transparent"
                stroke="var(--kucoin-dark-300)"
                strokeWidth="8"
              />
              {/* Animated progress circle */}
              <circle
                cx="60"
                cy="60"
                r="50"
                fill="transparent"
                stroke="var(--kucoin-primary)"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-2000 ease-out"
                style={{
                  filter: "drop-shadow(0 0 8px var(--kucoin-primary))"
                }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <span className="text-2xl font-bold text-white">
                  {animatedRate.toFixed(1)}%
                </span>
                <div className="text-xs text-[var(--kucoin-dark-100)] mt-1">
                  Win Rate
                </div>
              </div>
            </div>
          </div>
          <div className="text-center space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-[var(--kucoin-success)]">
                Wins: {animatedMetrics.winningTrades}
              </span>
              <span className="text-[var(--kucoin-danger)]">
                Losses: {animatedMetrics.losingTrades}
              </span>
            </div>
            <div className="w-full bg-[var(--kucoin-dark-400)] rounded-full h-2 overflow-hidden">
              <div 
                className="h-2 bg-gradient-to-r from-[var(--kucoin-success)] to-[var(--kucoin-primary)] rounded-full transition-all duration-2000 ease-out"
                style={{ width: `${animatedRate}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const TradingStreakIndicator = () => {
    const recentTrades = allTrades.slice(-10); // Last 10 trades
    const [animatedStreak, setAnimatedStreak] = useState(0);
    
    // Calculate current streak
    let currentStreak = 0;
    for (let i = recentTrades.length - 1; i >= 0; i--) {
      if (recentTrades[i].result === 'win') {
        currentStreak++;
      } else {
        break;
      }
    }

    useEffect(() => {
      const timer = setTimeout(() => {
        setAnimatedStreak(currentStreak);
      }, 800);
      return () => clearTimeout(timer);
    }, [currentStreak]);

    return (
      <Card className="dark-surface border-[var(--kucoin-dark-200)]">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-lg flex items-center gap-2">
            <Activity className="w-5 h-5 text-[var(--kucoin-warning)]" />
            Trading Streak
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center mb-4">
            <div className="text-3xl font-bold text-[var(--kucoin-warning)] mb-2">
              {animatedStreak}
            </div>
            <div className="text-sm text-[var(--kucoin-dark-100)]">
              Consecutive Wins
            </div>
          </div>
          
          {/* Recent trades visualization */}
          <div className="flex justify-center space-x-1 mb-4">
            {recentTrades.slice(-8).map((trade, index) => (
              <div
                key={trade.id}
                className={cn(
                  "w-3 h-6 rounded-sm transition-all duration-300",
                  trade.result === 'win' 
                    ? "bg-[var(--kucoin-success)]" 
                    : trade.result === 'loss'
                    ? "bg-[var(--kucoin-danger)]"
                    : "bg-[var(--kucoin-dark-300)]"
                )}
                style={{
                  animationDelay: `${index * 100}ms`,
                  animation: "fadeInUp 0.5s ease-out forwards"
                }}
              />
            ))}
          </div>

          <div className="text-xs text-center text-[var(--kucoin-dark-100)]">
            Last 8 trades
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Performance Dashboard</h2>
          <p className="text-[var(--kucoin-dark-100)] mt-1">
            Real-time trading insights and analytics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-[var(--kucoin-success)] rounded-full animate-pulse" />
          <span className="text-sm text-[var(--kucoin-dark-100)]">Live Data</span>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Trades"
          value={animatedMetrics.totalTrades}
          icon={Activity}
          color="bg-[var(--kucoin-primary)]"
          animationDelay={0}
        />
        <MetricCard
          title="Net P&L"
          value={animatedMetrics.netPnL}
          icon={DollarSign}
          color={animatedMetrics.netPnL >= 0 ? "bg-[var(--kucoin-success)]" : "bg-[var(--kucoin-danger)]"}
          prefix="$"
          animationDelay={100}
        />
        <MetricCard
          title="Win Rate"
          value={animatedMetrics.winRate}
          icon={Target}
          color="bg-[var(--kucoin-warning)]"
          suffix="%"
          animationDelay={200}
        />
        <MetricCard
          title="Active Trades"
          value={Array.isArray(activeTrades) ? activeTrades.length : 0}
          icon={Clock}
          color="bg-[var(--kucoin-secondary)]"
          animationDelay={300}
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Today's P&L"
          value={animatedMetrics.todayPnL}
          icon={TrendingUp}
          color={animatedMetrics.todayPnL >= 0 ? "bg-[var(--kucoin-success)]" : "bg-[var(--kucoin-danger)]"}
          prefix="$"
          animationDelay={400}
        />
        <MetricCard
          title="Best Trade"
          value={animatedMetrics.bestTrade}
          icon={TrendingUp}
          color="bg-[var(--kucoin-success)]"
          prefix="$"
          animationDelay={500}
        />
        <MetricCard
          title="Worst Trade"
          value={Math.abs(animatedMetrics.worstTrade)}
          icon={TrendingDown}
          color="bg-[var(--kucoin-danger)]"
          prefix="-$"
          animationDelay={600}
        />
        <MetricCard
          title="Avg Trade Size"
          value={animatedMetrics.avgTradeSize}
          icon={BarChart3}
          color="bg-[var(--kucoin-primary)]"
          prefix="$"
          animationDelay={700}
        />
      </div>

      {/* Win Rate Visualization and Period Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <WinRateIndicator winRate={animatedMetrics.winRate} />
        <TradingStreakIndicator />
        
        {/* Period Performance */}
        <Card className="lg:col-span-2 dark-surface border-[var(--kucoin-dark-200)]">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <PieChart className="w-5 h-5 text-[var(--kucoin-primary)]" />
              Performance Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-[var(--kucoin-dark-400)] rounded-lg">
                <div className="text-2xl font-bold text-white mb-1">
                  ${animatedMetrics.todayPnL.toFixed(2)}
                </div>
                <div className="text-sm text-[var(--kucoin-dark-100)]">Today</div>
                <div className="text-xs text-[var(--kucoin-dark-100)] mt-1">
                  {animatedMetrics.todayTrades} trades
                </div>
              </div>
              <div className="text-center p-4 bg-[var(--kucoin-dark-400)] rounded-lg">
                <div className="text-2xl font-bold text-white mb-1">
                  ${animatedMetrics.weeklyPnL.toFixed(2)}
                </div>
                <div className="text-sm text-[var(--kucoin-dark-100)]">This Week</div>
              </div>
              <div className="text-center p-4 bg-[var(--kucoin-dark-400)] rounded-lg">
                <div className="text-2xl font-bold text-white mb-1">
                  ${animatedMetrics.monthlyPnL.toFixed(2)}
                </div>
                <div className="text-sm text-[var(--kucoin-dark-100)]">This Month</div>
              </div>
            </div>
            
            {/* Profit vs Loss Breakdown */}
            <div className="mt-6 space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-[var(--kucoin-success)]">Total Profits</span>
                  <span className="text-white font-semibold">${animatedMetrics.totalProfit.toFixed(2)}</span>
                </div>
                <div className="w-full bg-[var(--kucoin-dark-400)] rounded-full h-2">
                  <div 
                    className="bg-[var(--kucoin-success)] h-2 rounded-full transition-all duration-1000 ease-out"
                    style={{ 
                      width: `${animatedMetrics.totalProfit + animatedMetrics.totalLoss > 0 
                        ? (animatedMetrics.totalProfit / (animatedMetrics.totalProfit + animatedMetrics.totalLoss)) * 100 
                        : 0}%` 
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-[var(--kucoin-danger)]">Total Losses</span>
                  <span className="text-white font-semibold">${animatedMetrics.totalLoss.toFixed(2)}</span>
                </div>
                <div className="w-full bg-[var(--kucoin-dark-400)] rounded-full h-2">
                  <div 
                    className="bg-[var(--kucoin-danger)] h-2 rounded-full transition-all duration-1000 ease-out"
                    style={{ 
                      width: `${animatedMetrics.totalProfit + animatedMetrics.totalLoss > 0 
                        ? (animatedMetrics.totalLoss / (animatedMetrics.totalProfit + animatedMetrics.totalLoss)) * 100 
                        : 0}%` 
                    }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}