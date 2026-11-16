import { TrendingUp, History, Wallet, Users, Settings, LogOut, Shield, BarChart3, UserCheck, ArrowLeft, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/ui/logo";
import { authManager } from "@/lib/auth";
import { useLocation } from "wouter";

interface SidebarProps {
  activeSection: string;
  setActiveSection: (section: string) => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
}

const navigation = [
  { id: "trading", label: "Trading", icon: TrendingUp },
  { id: "performance", label: "Performance", icon: BarChart3 },
  { id: "history", label: "Trade History", icon: History },
  { id: "wallet", label: "Wallet", icon: Wallet },
  { id: "referrals", label: "Referrals", icon: Users },
  { id: "kyc", label: "KYC Verification", icon: Shield },
  { id: "giftcards", label: "Gift Cards", icon: Gift },
  { id: "profile", label: "Profile", icon: Settings },
];

export default function Sidebar({ activeSection, setActiveSection, isMobileMenuOpen, setIsMobileMenuOpen }: SidebarProps) {
  const [, setLocation] = useLocation();
  const user = authManager.getUser();

  const handleLogout = () => {
    authManager.logout();
    setLocation("/");
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center px-6 py-4 border-b border-[var(--kucoin-dark-300)]">
        <Logo size="md" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveSection(item.id);
                setIsMobileMenuOpen(false);
              }}
              className={`flex items-center w-full px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                isActive
                  ? "bg-[var(--kucoin-dark-300)] text-white"
                  : "text-[var(--kucoin-dark-100)] hover:bg-[var(--kucoin-dark-300)] hover:text-white"
              }`}
            >
              <Icon className="w-5 h-5 mr-3" />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Impersonation Indicator */}
      {user && user.role !== 'super_admin' && localStorage.getItem('original_admin_token') && (
        <div className="p-4 border-t border-[var(--kucoin-dark-300)]">
          <div className="bg-orange-600/20 border border-orange-600 rounded-lg p-3 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <UserCheck className="w-4 h-4 text-orange-400" />
              <span className="text-orange-400 text-sm font-semibold">Admin View</span>
            </div>
            <p className="text-orange-300 text-xs mb-2">
              Viewing as: {user.username}
            </p>
            <Button
              size="sm"
              onClick={() => {
                const originalToken = localStorage.getItem('original_admin_token');
                const originalUser = localStorage.getItem('original_admin_user');
                if (originalToken && originalUser) {
                  authManager.setImpersonatedUser(originalToken, JSON.parse(originalUser));
                  localStorage.removeItem('original_admin_token');
                  localStorage.removeItem('original_admin_user');
                  window.location.href = "/admin";
                }
              }}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white text-xs"
            >
              <ArrowLeft className="w-3 h-3 mr-1" />
              Return to Admin
            </Button>
          </div>
        </div>
      )}

      {/* User Info */}
      <div className="p-4 border-t border-[var(--kucoin-dark-300)]">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 gradient-primary rounded-full flex items-center justify-center">
            <span className="text-white font-semibold">
              {user?.username?.charAt(0).toUpperCase() || "U"}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {user?.username || "User"}
            </p>
            <p className="text-xs text-[var(--kucoin-dark-100)] truncate">
              VIP Member
            </p>
          </div>
        </div>
        <Button
          onClick={handleLogout}
          variant="outline"
          size="sm"
          className="w-full border-[var(--kucoin-danger)] text-[var(--kucoin-danger)] hover:bg-[var(--kucoin-danger)] hover:text-white"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col dark-surface border-r border-[var(--kucoin-dark-300)]">
        {sidebarContent}
      </div>

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-black bg-opacity-50"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-64 dark-surface border-r border-[var(--kucoin-dark-300)]">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
