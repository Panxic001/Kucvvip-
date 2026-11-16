import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface TradeResult {
  id: number;
  pair: string;
  tradeType: string;
  amount: string;
  result: 'win' | 'loss';
  pnl: string;
  duration: number;
}

interface TradeResultPopupProps {
  tradeResult: TradeResult | null;
  onClose: () => void;
}

export default function TradeResultPopup({ tradeResult, onClose }: TradeResultPopupProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (tradeResult) {
      setIsVisible(true);
      if (tradeResult.result === 'win') {
        setShowConfetti(true);
        // Remove confetti after animation
        setTimeout(() => setShowConfetti(false), 3000);
      }
    } else {
      setIsVisible(false);
      setShowConfetti(false);
    }
  }, [tradeResult]);

  if (!tradeResult) return null;

  const isWin = tradeResult.result === 'win';
  const pnlAmount = parseFloat(tradeResult.pnl);
  const pnlFormatted = Math.abs(pnlAmount).toFixed(2);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300); // Wait for animation to complete
  };

  return (
    <>
      {/* Confetti Animation for Wins */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-bounce"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 2}s`,
              }}
            >
              <div className="w-2 h-2 bg-yellow-400 rounded-full opacity-80"></div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={isVisible} onOpenChange={handleClose}>
        <DialogContent 
          className={cn(
            "max-w-md mx-auto p-0 overflow-hidden border-0",
            isWin ? "bg-gradient-to-br from-green-500 to-green-600" : "bg-gradient-to-br from-red-500 to-red-600"
          )}
          aria-describedby={undefined}
        >
          <DialogTitle className="sr-only">
            Trade Result: {isWin ? 'Win' : 'Loss'}
          </DialogTitle>
          <div className="relative">
            {/* Close Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="absolute top-4 right-4 text-white hover:bg-white/20 z-10"
            >
              <X className="h-4 w-4" />
            </Button>

            {/* Header Section */}
            <div className="text-center py-8 px-6">
              <div className={cn(
                "w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4",
                isWin ? "bg-white/20" : "bg-white/20"
              )}>
                {isWin ? (
                  <TrendingUp className="h-10 w-10 text-white" />
                ) : (
                  <TrendingDown className="h-10 w-10 text-white" />
                )}
              </div>
              
              <h2 className="text-3xl font-bold text-white mb-2">
                {isWin ? "Trade Won!" : "Trade Lost"}
              </h2>
              
              <p className="text-white/90 text-lg">
                {isWin ? "Congratulations!" : "Better luck next time"}
              </p>
            </div>

            {/* Trade Details */}
            <div className="bg-white/10 backdrop-blur-sm mx-6 mb-6 rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-white/80 text-sm">Trading Pair:</span>
                <span className="text-white font-semibold">{tradeResult.pair}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-white/80 text-sm">Trade Type:</span>
                <span className="text-white font-semibold capitalize">{tradeResult.tradeType}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-white/80 text-sm">Amount:</span>
                <span className="text-white font-semibold">${tradeResult.amount}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-white/80 text-sm">Duration:</span>
                <span className="text-white font-semibold">{tradeResult.duration} min</span>
              </div>
              
              <div className="border-t border-white/20 pt-3">
                <div className="flex justify-between items-center">
                  <span className="text-white/80 text-sm">P&L:</span>
                  <span className={cn(
                    "font-bold text-lg",
                    isWin ? "text-green-200" : "text-red-200"
                  )}>
                    {isWin ? '+' : '-'}${pnlFormatted}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="px-6 pb-6 space-y-3">
              <Button
                onClick={handleClose}
                className="w-full bg-white text-gray-900 hover:bg-white/90 font-semibold"
              >
                Continue Trading
              </Button>
              
              {isWin && (
                <div className="text-center">
                  <p className="text-white/80 text-sm">
                    Your balance has been updated with your winnings!
                  </p>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}