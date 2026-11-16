import { Menu, Plus, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authManager } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";

interface HeaderProps {
  activeSection: string;
  setIsMobileMenuOpen: (open: boolean) => void;
  setActiveSection?: (section: string) => void;
}

interface UserProfile {
  id: number;
  username: string;
  email: string;
  balance: string;
  referralCode: string;
}

const sectionTitles = {
  trading: "Live Trading Dashboard",
  history: "Trade History",
  wallet: "Wallet Management",
  referrals: "Referral Program",
  profile: "Profile Settings",
};

export default function Header({ activeSection, setIsMobileMenuOpen, setActiveSection }: HeaderProps) {
  // Fetch real-time user profile data including balance
  const { data: profile } = useQuery<UserProfile>({
    queryKey: ["/api/profile"],
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  return (
    <header className="dark-surface border-b border-[var(--kucoin-dark-300)] px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden text-[var(--kucoin-dark-100)] hover:text-white"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold text-white">
            {sectionTitles[activeSection as keyof typeof sectionTitles] || "Dashboard"}
          </h1>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Balance Display */}
          <div className="hidden sm:flex items-center space-x-3 bg-[var(--kucoin-dark-300)] rounded-lg px-4 py-2 border border-[var(--kucoin-dark-200)]">
            <Wallet className="w-4 h-4 text-[var(--kucoin-primary)]" />
            <div className="text-center">
              <p className="text-xs text-[var(--kucoin-dark-100)]">Available Balance</p>
              <p className="text-sm font-semibold text-[var(--kucoin-primary)]">
                ${profile?.balance || "0.00"} USDT
              </p>
            </div>
          </div>
          
          <Button
            size="sm"
            className="gradient-primary text-white hover:opacity-90"
            onClick={() => setActiveSection?.('wallet')}
          >
            <Plus className="h-4 w-4 mr-2" />
            Deposit
          </Button>
        </div>
      </div>
    </header>
  );
}
