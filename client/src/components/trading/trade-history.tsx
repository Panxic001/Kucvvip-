import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";

interface Trade {
  id: number;
  pair: string;
  tradeType: string;
  amount: string;
  duration: number;
  result: string | null;
  pnl: string | null;
  createdAt: string;
  isActive: boolean;
}

interface TradeHistoryProps {
  showFullHistory?: boolean;
}

export default function TradeHistory({ showFullHistory = false }: TradeHistoryProps) {
  const { data: trades = [], isLoading } = useQuery<Trade[]>({
    queryKey: ["/api/trades"],
  });

  const displayTrades = showFullHistory ? trades : trades.slice(0, 5);

  if (isLoading) {
    return (
      <Card className="dark-surface border-[var(--kucoin-dark-300)]">
        <CardContent className="p-6">
          <div className="text-center text-[var(--kucoin-dark-100)]">Loading trades...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="dark-surface border-[var(--kucoin-dark-300)]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-white">
            {showFullHistory ? "Trade History" : "Recent Trades"}
          </CardTitle>
          {!showFullHistory && trades.length > 5 && (
            <Button variant="link" className="text-[var(--kucoin-primary)] hover:text-[var(--kucoin-secondary)]">
              View All
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {trades.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-[var(--kucoin-dark-100)]">No trades yet. Start trading to see your history!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--kucoin-dark-300)]">
                  <th className="text-left py-3 px-4 text-[var(--kucoin-dark-100)] text-sm font-medium">
                    Pair
                  </th>
                  <th className="text-left py-3 px-4 text-[var(--kucoin-dark-100)] text-sm font-medium">
                    Direction
                  </th>
                  <th className="text-left py-3 px-4 text-[var(--kucoin-dark-100)] text-sm font-medium">
                    Amount
                  </th>
                  <th className="text-left py-3 px-4 text-[var(--kucoin-dark-100)] text-sm font-medium">
                    Duration
                  </th>
                  <th className="text-left py-3 px-4 text-[var(--kucoin-dark-100)] text-sm font-medium">
                    Result
                  </th>
                  <th className="text-left py-3 px-4 text-[var(--kucoin-dark-100)] text-sm font-medium">
                    P&L
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--kucoin-dark-300)]">
                {displayTrades.map((trade) => (
                  <tr key={trade.id}>
                    <td className="py-3 px-4 text-white">{trade.pair}</td>
                    <td className="py-3 px-4">
                      <Badge
                        className={
                          trade.tradeType === "buy"
                            ? "bg-[var(--kucoin-success)]/20 text-[var(--kucoin-success)]"
                            : "bg-[var(--kucoin-danger)]/20 text-[var(--kucoin-danger)]"
                        }
                      >
                        {trade.tradeType.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-white">${trade.amount}</td>
                    <td className="py-3 px-4 text-[var(--kucoin-dark-100)]">{trade.duration} min</td>
                    <td className="py-3 px-4">
                      {trade.isActive ? (
                        <Badge className="bg-[var(--kucoin-warning)]/20 text-[var(--kucoin-warning)]">
                          ACTIVE
                        </Badge>
                      ) : trade.result ? (
                        <Badge
                          className={
                            trade.result === "win"
                              ? "bg-[var(--kucoin-success)]/20 text-[var(--kucoin-success)]"
                              : "bg-[var(--kucoin-danger)]/20 text-[var(--kucoin-danger)]"
                          }
                        >
                          {trade.result.toUpperCase()}
                        </Badge>
                      ) : (
                        <span className="text-[var(--kucoin-dark-100)]">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {trade.pnl ? (
                        <span
                          className={
                            parseFloat(trade.pnl) >= 0
                              ? "text-[var(--kucoin-success)] font-semibold"
                              : "text-[var(--kucoin-danger)] font-semibold"
                          }
                        >
                          {parseFloat(trade.pnl) >= 0 ? "+" : ""}${trade.pnl}
                        </span>
                      ) : (
                        <span className="text-[var(--kucoin-dark-100)]">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
