import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { authManager } from "@/lib/auth";

interface ReferralStats {
  count: number;
  earnings: string;
}

export default function ReferralCard() {
  const user = authManager.getUser();
  const { toast } = useToast();

  const { data: referralData } = useQuery<{ stats: ReferralStats }>({
    queryKey: ["/api/referral"],
  });

  const copyReferralCode = () => {
    if (user?.referralCode) {
      navigator.clipboard.writeText(user.referralCode);
      toast({
        title: "Referral code copied",
        description: "Share it with your friends to earn rewards!",
      });
    }
  };

  const shareReferralLink = () => {
    if (user?.referralCode) {
      const referralLink = `${window.location.origin}/auth?ref=${user.referralCode}`;
      navigator.clipboard.writeText(referralLink);
      toast({
        title: "Referral link copied",
        description: "Share this link to invite friends!",
      });
    }
  };

  return (
    <Card className="gradient-primary">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-white flex items-center">
          <Users className="h-5 w-5 mr-2" />
          Referral Program
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-3 mb-4">
          <div className="text-yellow-300 text-sm font-semibold mb-1">NEW: 50% First Deposit Bonus!</div>
          <div className="text-white/90 text-xs">
            Earn 50% of your referrals' first deposit automatically
          </div>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-white/80">Your Code</span>
          <div className="flex items-center space-x-2">
            <span className="text-white font-semibold">{user?.referralCode}</span>
            <Button
              size="sm"
              variant="ghost"
              onClick={copyReferralCode}
              className="h-6 w-6 p-0 text-white/80 hover:text-white"
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-white/80">Referrals</span>
          <span className="text-white font-semibold">
            {referralData?.stats.count || 0}
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-white/80">Total Earnings</span>
          <span className="text-white font-semibold">
            ${referralData?.stats.earnings || "0.00"}
          </span>
        </div>

        <div className="text-xs text-white/60 space-y-1 bg-white/5 p-2 rounded">
          <div>• $10 signup bonus per referral</div>
          <div>• 50% of first deposit as bonus</div>
          <div>• Instant automatic payouts</div>
        </div>
        
        <Button
          onClick={shareReferralLink}
          className="w-full bg-white/20 hover:bg-white/30 text-white border-0 mt-4"
        >
          Share Referral Link
        </Button>
      </CardContent>
    </Card>
  );
}
