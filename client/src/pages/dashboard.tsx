import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { authManager } from "@/lib/auth";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import LiveTrading from "@/components/trading/live-trading";
import PortfolioSummary from "@/components/trading/portfolio-summary";
import TradeHistory from "@/components/trading/trade-history";
import WalletSection from "@/components/wallet/wallet-section";
import ReferralCard from "@/components/referral/referral-card";
import ProfileSection from "@/components/profile/profile-section";
import CryptoChart from "@/components/trading/crypto-chart";
import KycVerification from "@/components/kyc/kyc-verification";
import PerformanceDashboard from "@/components/trading/performance-dashboard";
import GiftCardRedemption from "@/components/gift-cards/gift-card-redemption";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const [activeSection, setActiveSection] = useState("trading");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!authManager.isAuthenticated()) {
      setLocation("/auth");
    }
  }, [setLocation]);

  // Show loading or redirect if not authenticated
  if (!authManager.isAuthenticated()) {
    return (
      <div className="min-h-screen bg-[var(--kucoin-dark-500)] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl text-white mb-4">Authentication Required</h2>
          <p className="text-[var(--kucoin-dark-100)] mb-4">Please log in to access your dashboard</p>
          <button 
            onClick={() => setLocation("/auth")}
            className="bg-[var(--kucoin-primary)] text-white px-6 py-2 rounded hover:bg-[var(--kucoin-primary)]/80"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  const renderMainContent = () => {
    switch (activeSection) {
      case "trading":
        return (
          <div className="space-y-6">
            <CryptoChart symbol="BTC" pair="USDT" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <LiveTrading setActiveSection={setActiveSection} />
              </div>
              <div className="space-y-6">
                <PortfolioSummary />
              </div>
            </div>
            <TradeHistory />
          </div>
        );
      case "history":
        return <TradeHistory showFullHistory />;
      case "performance":
        return <PerformanceDashboard />;
      case "wallet":
        return <WalletSection />;
      case "referrals":
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ReferralCard />
            <div className="dark-surface rounded-xl border border-[var(--kucoin-dark-300)] p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Referral History</h3>
              <p className="text-[var(--kucoin-dark-100)]">Your referral history will appear here.</p>
            </div>
          </div>
        );
      case "kyc":
        return <KycVerification />;
      case "giftcards":
        return <GiftCardRedemption />;
      case "profile":
        return <ProfileSection />;
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--kucoin-dark-500)]">
      <Sidebar
        activeSection={activeSection}
        setActiveSection={setActiveSection}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
      />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          activeSection={activeSection}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
          setActiveSection={setActiveSection}
        />
        
        <main className="flex-1 overflow-auto p-6">
          {renderMainContent()}
        </main>
      </div>
    </div>
  );
}
