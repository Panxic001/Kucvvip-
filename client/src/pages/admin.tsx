import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { authManager } from "@/lib/auth";
import { Settings, Users, CreditCard, TrendingUp, Shield, DollarSign, Menu, X, ZoomIn, Download, Ban, Trash2, Mail, Phone, Gift } from "lucide-react";

// Type declaration for Smartsupp
declare global {
  interface Window {
    smartsupp: (command: string) => void;
  }
}

interface User {
  id: number;
  username: string;
  email: string;
  balance: string;
  role: string;
  status: string;
  withdrawalBanned: boolean;
  withdrawalBanReason?: string;
  tradeWinRate: string;
  createdAt: string;
}

interface Transaction {
  id: number;
  userId: number;
  userEmail: string;
  type: string;
  cryptocurrency: string;
  amount: string;
  status: string;
  walletAddress?: string;
  network?: string;
  transactionHash?: string;
  adminNote?: string;
  approvedBy?: number;
  referralBonusProcessed: boolean;
  createdAt: string;
  updatedAt: string;
}

interface SiteConfig {
  id: number;
  key: string;
  value: string;
  description: string;
  updatedAt: string;
}

interface KycSubmission {
  id: number;
  userId: number;
  userEmail: string;
  fullName: string;
  status: string;
  idFrontImage: string;
  idBackImage: string;
  adminNote?: string;
  submittedAt: string;
  reviewedAt?: string;
}

interface BlacklistEntry {
  id: number;
  type: 'email' | 'phone';
  value: string;
  reason?: string;
  addedBy?: number;
  createdAt: string;
}

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userEditData, setUserEditData] = useState({
    balance: "",
    tradeWinRate: "",
    winPercentage: "",
    status: "",
    withdrawalBanned: false,
    withdrawalBanReason: ""
  });
  const [configKey, setConfigKey] = useState("");
  const [configValue, setConfigValue] = useState("");
  const [configDescription, setConfigDescription] = useState("");

  // Hide chat widget on admin pages
  useEffect(() => {
    const hideSmartsupp = () => {
      if (window.smartsupp) {
        window.smartsupp('chat:hide');
      }
      // Also hide via CSS as fallback
      const chatWidget = document.querySelector('#smartsupp-widget-container');
      if (chatWidget) {
        (chatWidget as HTMLElement).style.display = 'none';
      }
    };

    // Hide immediately if smartsupp is already loaded
    hideSmartsupp();

    // Also hide when smartsupp loads
    const checkSmartsupp = setInterval(() => {
      if (window.smartsupp) {
        window.smartsupp('chat:hide');
        clearInterval(checkSmartsupp);
      }
      // Continue hiding via CSS
      const chatWidget = document.querySelector('#smartsupp-widget-container');
      if (chatWidget) {
        (chatWidget as HTMLElement).style.display = 'none';
      }
    }, 100);

    // Additional CSS-based hiding for any smartsupp elements
    const style = document.createElement('style');
    style.textContent = `
      #smartsupp-widget-container,
      .smartsupp-widget,
      #smartsupp-chat-window {
        display: none !important;
        visibility: hidden !important;
      }
    `;
    document.head.appendChild(style);

    // Cleanup: show chat widget when leaving admin page
    return () => {
      clearInterval(checkSmartsupp);
      if (window.smartsupp) {
        window.smartsupp('chat:show');
      }
      // Remove CSS hiding
      document.head.removeChild(style);
      const chatWidget = document.querySelector('#smartsupp-widget-container');
      if (chatWidget) {
        (chatWidget as HTMLElement).style.display = '';
      }
    };
  }, []);
  const [walletAddresses, setWalletAddresses] = useState({
    USDT: "",
    TRX: "",
    ETH: "",
    BTC: ""
  });
  const [selectedKycImage, setSelectedKycImage] = useState<{ src: string; title: string } | null>(null);
  const [passwordResetData, setPasswordResetData] = useState({
    userId: null as number | null,
    newPassword: ""
  });
  const [blacklistData, setBlacklistData] = useState({
    type: "email" as 'email' | 'phone',
    value: "",
    reason: ""
  });
  const [topupData, setTopupData] = useState({
    amount: "",
    note: ""
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all users with forced refresh
  const { data: users = [], refetch: refetchUsers, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    refetchInterval: 1000, // Refresh every 1 second for immediate updates
    staleTime: 0, // Always consider data stale
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchIntervalInBackground: true,
  });

  // Console verification shows correct data is loaded
  if (users.length > 0) {
    console.log('✅ Admin panel loaded successfully - Trading controls active');
  }

  // Fetch pending transactions
  const { data: pendingTransactions = [] } = useQuery<Transaction[]>({
    queryKey: ["/api/admin/transactions", "pending"],
    refetchInterval: 10000,
  });

  // Fetch all transactions
  const { data: allTransactions = [] } = useQuery<Transaction[]>({
    queryKey: ["/api/admin/transactions"],
    refetchInterval: 30000,
  });

  // Fetch site configurations
  const { data: siteConfigs = [] } = useQuery<SiteConfig[]>({
    queryKey: ["/api/admin/config"],
    refetchInterval: 60000,
  });

  // Fetch KYC submissions
  const { data: kycSubmissions = [] } = useQuery<KycSubmission[]>({
    queryKey: ["/api/admin/kyc"],
    refetchInterval: 30000,
  });

  // Fetch blacklist entries
  const { data: blacklistEntries = [] } = useQuery<BlacklistEntry[]>({
    queryKey: ["/api/admin/blacklist"],
    refetchInterval: 30000,
  });

  const [giftCardFilter, setGiftCardFilter] = useState("all");
  const [giftCardNote, setGiftCardNote] = useState("");
  const [selectedGiftCardImage, setSelectedGiftCardImage] = useState<string | null>(null);

  const giftCardUrl = giftCardFilter && giftCardFilter !== "all" 
    ? `/api/admin/gift-cards?status=${giftCardFilter}` 
    : "/api/admin/gift-cards";
  const { data: giftCards = [] } = useQuery<any[]>({
    queryKey: [giftCardUrl],
    refetchInterval: 15000,
  });

  const giftCardActionMutation = useMutation({
    mutationFn: async (data: { id: number; action: string; adminNote?: string }) => {
      const res = await apiRequest("POST", `/api/admin/gift-cards/${data.id}/action`, {
        action: data.action,
        adminNote: data.adminNote,
      });
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: data.message });
      queryClient.invalidateQueries({ queryKey: [giftCardUrl] });
      setGiftCardNote("");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: (data: { userId: number; updates: any }) => {
      const token = localStorage.getItem('auth_token');
      return fetch(`/api/admin/users/${data.userId}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(data.updates),
      }).then(res => res.json());
    },
    onSuccess: async () => {
      // Force immediate data refresh with multiple strategies
      queryClient.removeQueries({ queryKey: ["/api/admin/users"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setTimeout(async () => {
        await refetchUsers();
      }, 100);
      toast({ title: "User updated successfully" });
      setSelectedUser(null);
    },
    onError: () => {
      toast({ title: "Failed to update user", variant: "destructive" });
    },
  });

  // Ban user mutation
  const banUserMutation = useMutation({
    mutationFn: (userId: number) =>
      fetch(`/api/admin/users/${userId}/ban`, { 
        method: "POST",
        headers: { "Content-Type": "application/json" }
      }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "User banned successfully" });
    },
    onError: () => {
      toast({ title: "Failed to ban user", variant: "destructive" });
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await apiRequest("DELETE", `/api/admin/users/${userId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "User deleted successfully" });
      setSelectedUser(null);
    },
    onError: (error: Error) => {
      console.error('Delete user error:', error);
      toast({ 
        title: "Failed to delete user", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // Approve transaction mutation
  const approveTransactionMutation = useMutation({
    mutationFn: async (data: { transactionId: number; adminNote?: string }) => {
      const response = await apiRequest("POST", `/api/admin/transactions/${data.transactionId}/approve`, {
        adminNote: data.adminNote,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/transactions"] });
      toast({ title: "Transaction approved successfully" });
    },
    onError: () => {
      toast({ title: "Failed to approve transaction", variant: "destructive" });
    },
  });

  // Decline transaction mutation
  const declineTransactionMutation = useMutation({
    mutationFn: async (data: { transactionId: number; adminNote?: string }) => {
      const response = await apiRequest("POST", `/api/admin/transactions/${data.transactionId}/decline`, {
        adminNote: data.adminNote,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/transactions"] });
      toast({ title: "Transaction declined successfully" });
    },
    onError: () => {
      toast({ title: "Failed to decline transaction", variant: "destructive" });
    },
  });

  // Update config mutation
  const updateConfigMutation = useMutation({
    mutationFn: (data: { key: string; value: string; description: string }) =>
      fetch("/api/admin/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/config"] });
      toast({ title: "Configuration updated successfully" });
      setConfigKey("");
      setConfigValue("");
      setConfigDescription("");
    },
    onError: () => {
      toast({ title: "Failed to update configuration", variant: "destructive" });
    },
  });

  // User impersonation mutation
  const impersonateUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await apiRequest("POST", `/api/admin/users/${userId}/impersonate`, {});
      return response.json();
    },
    onSuccess: (data) => {
      // Store original admin credentials before impersonating
      const currentToken = authManager.getToken();
      const currentUser = authManager.getUser();
      
      if (currentToken && currentUser) {
        localStorage.setItem('original_admin_token', currentToken);
        localStorage.setItem('original_admin_user', JSON.stringify(currentUser));
      }
      
      // Set the impersonated user data using the auth manager
      authManager.setImpersonatedUser(data.token, data.user);
      toast({ title: `Now logged in as ${data.user.username}` });
      
      // Navigate to the dashboard to see the user's view
      window.location.href = "/dashboard";
    },
    onError: () => {
      toast({ title: "Failed to impersonate user", variant: "destructive" });
    },
  });

  // Password reset mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async (data: { userId: number; newPassword: string }) => {
      const response = await apiRequest("POST", `/api/admin/users/${data.userId}/reset-password`, {
        newPassword: data.newPassword,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Password reset successfully" });
      setPasswordResetData({ userId: null, newPassword: "" });
    },
    onError: () => {
      toast({ title: "Failed to reset password", variant: "destructive" });
    },
  });

  // Add to blacklist mutation
  const addBlacklistMutation = useMutation({
    mutationFn: async (data: { type: 'email' | 'phone'; value: string; reason?: string }) => {
      const response = await apiRequest("POST", "/api/admin/blacklist", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blacklist"] });
      toast({ title: "Added to blacklist successfully" });
      setBlacklistData({ type: "email", value: "", reason: "" });
    },
    onError: (error: any) => {
      toast({ title: error.message || "Failed to add to blacklist", variant: "destructive" });
    },
  });

  // Remove from blacklist mutation
  const removeBlacklistMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/admin/blacklist/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blacklist"] });
      toast({ title: "Removed from blacklist successfully" });
    },
    onError: () => {
      toast({ title: "Failed to remove from blacklist", variant: "destructive" });
    },
  });

  // Admin topup credit mutation
  const topupMutation = useMutation({
    mutationFn: async (data: { userId: number; amount: string; note?: string }) => {
      const response = await apiRequest("POST", `/api/admin/users/${data.userId}/topup`, {
        amount: data.amount,
        note: data.note,
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/transactions"] });
      toast({ title: `Credit added successfully. New balance: $${data.newBalance}` });
      setTopupData({ amount: "", note: "" });
    },
    onError: (error: any) => {
      toast({ title: error.message || "Failed to add credit", variant: "destructive" });
    },
  });

  const handleUpdateUser = () => {
    if (!selectedUser) return;

    const updates: any = {};
    if (userEditData.balance) updates.balance = userEditData.balance;
    if (userEditData.tradeWinRate) updates.tradeWinRate = userEditData.tradeWinRate;
    if (userEditData.winPercentage) updates.winPercentage = userEditData.winPercentage;
    if (userEditData.status) updates.status = userEditData.status;
    
    // Include withdrawal ban fields
    updates.withdrawalBanned = userEditData.withdrawalBanned;
    if (userEditData.withdrawalBanned && userEditData.withdrawalBanReason) {
      updates.withdrawalBanReason = userEditData.withdrawalBanReason;
    } else if (!userEditData.withdrawalBanned) {
      updates.withdrawalBanReason = null; // Clear ban reason when not banned
    }

    updateUserMutation.mutate({ userId: selectedUser.id, updates });
  };

  const handleUpdateConfig = () => {
    if (!configKey || !configValue) return;
    updateConfigMutation.mutate({
      key: configKey,
      value: configValue,
      description: configDescription,
    });
  };

  // Wallet update mutation
  const updateWalletMutation = useMutation({
    mutationFn: async (data: { cryptocurrency: string; walletAddress: string }) => {
      const response = await apiRequest("PUT", "/api/admin/crypto/wallets", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/config"] });
      toast({ title: "Wallet address updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update wallet address", variant: "destructive" });
    },
  });

  const handleUpdateWallet = (cryptocurrency: string) => {
    const walletAddress = walletAddresses[cryptocurrency as keyof typeof walletAddresses];
    if (!walletAddress) return;
    
    updateWalletMutation.mutate({ cryptocurrency, walletAddress });
  };

  // QR code upload mutation
  const uploadQRMutation = useMutation({
    mutationFn: async (data: { cryptocurrency: string; qrCodeData: string }) => {
      const response = await apiRequest("POST", "/api/admin/qr-upload", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/config"] });
      toast({ title: "QR code uploaded successfully" });
    },
    onError: () => {
      toast({ title: "Failed to upload QR code", variant: "destructive" });
    },
  });

  const handleQRUpload = (cryptocurrency: string, file?: File) => {
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const qrCodeData = e.target?.result as string;
      uploadQRMutation.mutate({ cryptocurrency, qrCodeData });
    };
    reader.readAsDataURL(file);
  };

  // KYC review mutations
  const reviewKycMutation = useMutation({
    mutationFn: async (data: { kycId: number; status: string; adminNote?: string }) => {
      const response = await apiRequest("POST", `/api/admin/kyc/${data.kycId}/review`, {
        status: data.status,
        adminNote: data.adminNote || "",
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/kyc"] });
      toast({ title: "KYC review completed successfully" });
    },
    onError: (error: Error) => {
      console.error('KYC review error:', error);
      toast({ 
        title: "Failed to review KYC submission", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // Load wallet addresses from config when available
  useEffect(() => {
    if (siteConfigs && siteConfigs.length > 0) {
      const newWalletAddresses = {
        USDT: siteConfigs.find(c => c.key === 'deposit_wallet_usdt')?.value || '',
        TRX: siteConfigs.find(c => c.key === 'deposit_wallet_trx')?.value || '',
        ETH: siteConfigs.find(c => c.key === 'deposit_wallet_eth')?.value || '',
        BTC: siteConfigs.find(c => c.key === 'deposit_wallet_btc')?.value || '',
      };
      
      // Only update if values have actually changed
      const hasChanged = Object.keys(newWalletAddresses).some(
        key => newWalletAddresses[key as keyof typeof newWalletAddresses] !== walletAddresses[key as keyof typeof walletAddresses]
      );
      
      if (hasChanged) {
        setWalletAddresses(newWalletAddresses);
      }
    }
  }, [siteConfigs?.length]);

  const renderDashboard = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white mb-6">Dashboard Overview</h2>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <Card className="bg-[var(--kucoin-dark-400)] border-[var(--kucoin-dark-200)]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--kucoin-dark-100)]">Total Users</p>
                <p className="text-2xl font-bold text-[var(--kucoin-primary)]">{users.length}</p>
              </div>
              <Users className="w-8 h-8 text-[var(--kucoin-primary)]" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[var(--kucoin-dark-400)] border-[var(--kucoin-dark-200)]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--kucoin-dark-100)]">Pending Deposits</p>
                <p className="text-2xl font-bold text-[var(--kucoin-warning)]">
                  {pendingTransactions.filter(t => t.type === 'deposit').length}
                </p>
              </div>
              <CreditCard className="w-8 h-8 text-[var(--kucoin-warning)]" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[var(--kucoin-dark-400)] border-[var(--kucoin-dark-200)]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--kucoin-dark-100)]">Pending Withdrawals</p>
                <p className="text-2xl font-bold text-[var(--kucoin-danger)]">
                  {pendingTransactions.filter(t => t.type === 'withdrawal').length}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-[var(--kucoin-danger)]" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[var(--kucoin-dark-400)] border-[var(--kucoin-dark-200)]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--kucoin-dark-100)]">Pending KYC</p>
                <p className="text-2xl font-bold text-[var(--kucoin-warning)]">
                  {kycSubmissions.filter(k => k.status === 'pending').length}
                </p>
              </div>
              <Shield className="w-8 h-8 text-[var(--kucoin-warning)]" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Pending Transactions */}
      <Card className="bg-[var(--kucoin-dark-400)] border-[var(--kucoin-dark-200)]">
        <CardHeader>
          <CardTitle className="text-white">Recent Pending Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {pendingTransactions.slice(0, 5).map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between p-4 bg-[var(--kucoin-dark-300)] rounded-lg">
                <div>
                  <p className="font-semibold">
                    {transaction.type === 'deposit' || transaction.type === 'credit' ? '↓' : '↑'} {transaction.type.toUpperCase()}
                  </p>
                  <p className="text-sm text-[var(--kucoin-dark-100)]">User: {transaction.userEmail}</p>
                  {transaction.type === 'deposit' && transaction.proofFileName && (
                    <div className="mt-1">
                      <p className="text-xs text-[var(--kucoin-success)]">📎 {transaction.proofFileName}</p>
                      <button
                        onClick={() => {
                          if (transaction.proofFilePath) {
                            const token = localStorage.getItem('auth_token');
                            // Extract filename from the full path
                            const filename = transaction.proofFilePath.split('/').pop();
                            window.open(`/uploads/deposit-proofs/${filename}?token=${token}`, '_blank');
                          }
                        }}
                        className="text-xs bg-[var(--kucoin-primary)] hover:bg-[var(--kucoin-primary)]/80 text-white px-2 py-1 rounded mt-1 transition-colors"
                      >
                        View Proof
                      </button>
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-semibold">${transaction.amount}</p>
                  <Badge 
                    variant="outline" 
                    className={
                      transaction.status === 'approved'
                        ? 'text-[var(--kucoin-success)]'
                        : transaction.status === 'declined'
                        ? 'text-[var(--kucoin-danger)]'
                        : 'text-[var(--kucoin-warning)]'
                    }
                  >
                    {transaction.status}
                  </Badge>
                </div>
                {transaction.status === 'pending' && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => approveTransactionMutation.mutate({ transactionId: transaction.id })}
                      className="bg-[var(--kucoin-success)] hover:bg-[var(--kucoin-success)]/80"
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => declineTransactionMutation.mutate({ transactionId: transaction.id })}
                    >
                      Decline
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderUsers = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white mb-6">User Management</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        {/* Users List */}
        <Card className="bg-[var(--kucoin-dark-400)] border-[var(--kucoin-dark-200)]">
          <CardHeader>
            <CardTitle className="text-white">All Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {users.map((user) => (
                <div
                  key={user.id}
                  className={`p-4 rounded-lg cursor-pointer transition-colors ${
                    selectedUser?.id === user.id
                      ? 'bg-[var(--kucoin-primary)]/20 border border-[var(--kucoin-primary)]'
                      : 'bg-[var(--kucoin-dark-300)] hover:bg-[var(--kucoin-dark-200)]'
                  }`}
                  onClick={() => {
                    setSelectedUser(user);
                    setUserEditData({
                      balance: user.balance,
                      tradeWinRate: user.tradeWinRate,
                      winPercentage: user.winPercentage,
                      status: user.status,
                      withdrawalBanned: user.withdrawalBanned || false,
                      withdrawalBanReason: user.withdrawalBanReason || ""
                    });
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-white">{user.username}</p>
                      <p className="text-sm text-[var(--kucoin-dark-100)]">{user.email}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-[var(--kucoin-primary)]">${user.balance}</p>
                      <div className="flex flex-col gap-1">
                        <Badge
                          variant="outline"
                          className={
                            user.status === 'active'
                              ? 'text-[var(--kucoin-success)]'
                              : user.status === 'banned'
                              ? 'text-[var(--kucoin-danger)]'
                              : 'text-[var(--kucoin-warning)]'
                          }
                        >
                          {user.status}
                        </Badge>
                        {/* Withdrawal Ban Badge */}
                        {user.withdrawalBanned && (
                          <Badge
                            variant="outline"
                            className="text-red-400 bg-red-900/20 border-red-400"
                          >
                            WITHDRAWAL BANNED
                          </Badge>
                        )}
                        {/* Trading Status Badge */}
                        <Badge
                          variant="outline"
                          className={
                            user.tradeWinRate 
                              ? parseFloat(user.tradeWinRate) >= 70 
                                ? 'text-[var(--kucoin-success)] bg-green-900/20'
                                : parseFloat(user.tradeWinRate) === 0 
                                ? 'text-[var(--kucoin-danger)] bg-red-900/20'
                                : 'text-[var(--kucoin-warning)] bg-yellow-900/20'
                              : 'text-[var(--kucoin-dark-100)]'
                          }
                        >
                          {user.tradeWinRate 
                            ? parseFloat(user.tradeWinRate) >= 70 ? 'FORCE WIN'
                            : parseFloat(user.tradeWinRate) === 0 ? 'FORCE LOSS'
                            : 'CUSTOM'
                            : 'DEFAULT'
                          }
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 flex gap-4 text-sm text-[var(--kucoin-dark-100)]">
                    <span>Role: {user.role}</span>
                    <span>Win Rate: {user.tradeWinRate}%</span>
                    <span>Profit: {user.winPercentage}%</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* User Edit Panel */}
        {selectedUser && (
          <Card className="bg-[var(--kucoin-dark-400)] border-[var(--kucoin-dark-200)]">
            <CardHeader>
              <CardTitle className="text-white">Edit User: {selectedUser.username}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-white">Balance ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={userEditData.balance}
                  onChange={(e) => setUserEditData(prev => ({ ...prev, balance: e.target.value }))}
                  className="bg-[var(--kucoin-dark-300)] border-[var(--kucoin-dark-200)] text-white"
                />
              </div>

              <div>
                <Label className="text-white">Trade Win Rate (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={userEditData.tradeWinRate}
                  onChange={(e) => setUserEditData(prev => ({ ...prev, tradeWinRate: e.target.value }))}
                  className="bg-[var(--kucoin-dark-300)] border-[var(--kucoin-dark-200)] text-white"
                />
              </div>

              <div>
                <Label className="text-white">Win Profit Percentage (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="999"
                  step="0.01"
                  value={userEditData.winPercentage}
                  onChange={(e) => setUserEditData(prev => ({ ...prev, winPercentage: e.target.value }))}
                  className="bg-[var(--kucoin-dark-300)] border-[var(--kucoin-dark-200)] text-white"
                  placeholder="Profit % when user wins (e.g., 35, 85, 120)"
                />
                <p className="text-xs text-[var(--kucoin-dark-100)] mt-1">
                  Profit percentage when user wins trades (admin control only - no duration-based rates)
                </p>
              </div>

              <div>
                <Label className="text-white">Status</Label>
                <Select value={userEditData.status} onValueChange={(value) => setUserEditData(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger className="bg-[var(--kucoin-dark-300)] border-[var(--kucoin-dark-200)] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[var(--kucoin-dark-400)] border-[var(--kucoin-dark-200)]">
                    <SelectItem value="active" className="text-white">Active</SelectItem>
                    <SelectItem value="banned" className="text-white">Banned</SelectItem>
                    <SelectItem value="blocked" className="text-white">Blocked</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Withdrawal Ban Controls */}
              <div className="border-t border-[var(--kucoin-dark-200)] pt-4">
                <Label className="text-white text-sm font-semibold">Withdrawal Controls</Label>
                <div className="mt-2 space-y-3">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="withdrawalBanned"
                      checked={userEditData.withdrawalBanned}
                      onChange={(e) => setUserEditData(prev => ({ ...prev, withdrawalBanned: e.target.checked }))}
                      className="w-4 h-4 text-red-600 bg-[var(--kucoin-dark-300)] border-[var(--kucoin-dark-200)] rounded focus:ring-red-500"
                    />
                    <label htmlFor="withdrawalBanned" className="text-white text-sm">
                      Ban from withdrawals
                    </label>
                  </div>
                  
                  {userEditData.withdrawalBanned && (
                    <div>
                      <Label className="text-white text-sm">Ban Reason</Label>
                      <Input
                        type="text"
                        placeholder="Enter reason for withdrawal ban..."
                        value={userEditData.withdrawalBanReason}
                        onChange={(e) => setUserEditData(prev => ({ ...prev, withdrawalBanReason: e.target.value }))}
                        className="bg-[var(--kucoin-dark-300)] border-[var(--kucoin-dark-200)] text-white"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={handleUpdateUser}
                  className="gradient-primary text-white hover:opacity-90"
                  disabled={updateUserMutation.isPending}
                >
                  Update User
                </Button>
                
                <Button
                  variant="destructive"
                  onClick={() => banUserMutation.mutate(selectedUser.id)}
                  disabled={banUserMutation.isPending}
                >
                  Ban User
                </Button>
                
                <Button
                  variant="destructive"
                  className="bg-red-600 hover:bg-red-700"
                  onClick={() => {
                    if (confirm(`Are you sure you want to permanently delete user "${selectedUser.username}"? This action cannot be undone.`)) {
                      deleteUserMutation.mutate(selectedUser.id);
                    }
                  }}
                  disabled={deleteUserMutation.isPending}
                >
                  Delete Account
                </Button>
              </div>

              {/* User Impersonation Section */}
              <div className="border-t border-[var(--kucoin-dark-200)] pt-4">
                <Label className="text-white text-sm font-semibold">Admin Actions</Label>
                <div className="mt-2 flex flex-wrap gap-3">
                  <Button
                    onClick={() => {
                      if (confirm(`Login as ${selectedUser.username}? You will be switched to their account.`)) {
                        impersonateUserMutation.mutate(selectedUser.id);
                      }
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    disabled={impersonateUserMutation.isPending}
                  >
                    {impersonateUserMutation.isPending ? "Switching..." : "Login as User"}
                  </Button>
                </div>
              </div>

              {/* Password Reset Section */}
              <div className="border-t border-[var(--kucoin-dark-200)] pt-4">
                <Label className="text-white text-sm font-semibold">Password Reset</Label>
                <div className="mt-2 space-y-3">
                  <Input
                    type="password"
                    placeholder="Enter new password (min 6 characters)"
                    value={passwordResetData.newPassword}
                    onChange={(e) => setPasswordResetData(prev => ({ ...prev, newPassword: e.target.value }))}
                    className="bg-[var(--kucoin-dark-300)] border-[var(--kucoin-dark-200)] text-white"
                  />
                  <Button
                    onClick={() => {
                      if (!passwordResetData.newPassword || passwordResetData.newPassword.length < 6) {
                        toast({ title: "Password must be at least 6 characters long", variant: "destructive" });
                        return;
                      }
                      if (confirm(`Reset password for ${selectedUser.username}?`)) {
                        resetPasswordMutation.mutate({
                          userId: selectedUser.id,
                          newPassword: passwordResetData.newPassword
                        });
                      }
                    }}
                    className="bg-orange-600 hover:bg-orange-700 text-white"
                    disabled={resetPasswordMutation.isPending || !passwordResetData.newPassword}
                  >
                    {resetPasswordMutation.isPending ? "Resetting..." : "Reset Password"}
                  </Button>
                </div>
              </div>

              {/* Topup Credit Section */}
              <div className="border-t border-[var(--kucoin-dark-200)] pt-4">
                <Label className="text-white text-sm font-semibold flex items-center gap-2">
                  <span className="text-green-400">💰</span> Topup Credit
                </Label>
                <p className="text-xs text-[var(--kucoin-dark-100)] mt-1 mb-3">
                  Add credit to user's balance. This will appear in their transaction history as an inbound transfer.
                </p>
                <div className="mt-2 space-y-3">
                  <div>
                    <Label className="text-white text-xs">Amount (USDT)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="Enter amount to credit"
                      value={topupData.amount}
                      onChange={(e) => setTopupData(prev => ({ ...prev, amount: e.target.value }))}
                      className="bg-[var(--kucoin-dark-300)] border-[var(--kucoin-dark-200)] text-white"
                      data-testid="input-topup-amount"
                    />
                  </div>
                  <div>
                    <Label className="text-white text-xs">Note (Optional)</Label>
                    <Input
                      type="text"
                      placeholder="e.g., Bonus credit, Adjustment, etc."
                      value={topupData.note}
                      onChange={(e) => setTopupData(prev => ({ ...prev, note: e.target.value }))}
                      className="bg-[var(--kucoin-dark-300)] border-[var(--kucoin-dark-200)] text-white"
                      data-testid="input-topup-note"
                    />
                  </div>
                  <Button
                    onClick={() => {
                      if (!topupData.amount || parseFloat(topupData.amount) <= 0) {
                        toast({ title: "Please enter a valid amount", variant: "destructive" });
                        return;
                      }
                      if (confirm(`Add $${topupData.amount} credit to ${selectedUser.username}'s account?`)) {
                        topupMutation.mutate({
                          userId: selectedUser.id,
                          amount: topupData.amount,
                          note: topupData.note || undefined
                        });
                      }
                    }}
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                    disabled={topupMutation.isPending || !topupData.amount}
                    data-testid="button-topup-credit"
                  >
                    {topupMutation.isPending ? "Adding Credit..." : "Add Credit"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );

  const renderTransactions = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white mb-6">Transaction Management</h2>
      
      <Card className="bg-[var(--kucoin-dark-400)] border-[var(--kucoin-dark-200)]">
        <CardHeader>
          <CardTitle className="text-white">All Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {allTransactions.map((transaction) => (
              <div key={transaction.id} className="p-4 bg-[var(--kucoin-dark-300)] rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-white">
                      {transaction.type === 'deposit' ? '↓ DEPOSIT' : transaction.type === 'credit' ? '↓ CREDIT' : '↑ WITHDRAWAL'}
                    </p>
                    <p className="text-sm text-[var(--kucoin-dark-100)]">
                      User: {transaction.userEmail} | Amount: ${transaction.amount} | {transaction.cryptocurrency}
                    </p>
                    {transaction.type === 'withdrawal' && transaction.walletAddress && (
                      <p className="text-sm text-[var(--kucoin-primary)] font-mono bg-[var(--kucoin-dark-200)] px-2 py-1 rounded mt-1">
                        Withdrawal Address: {transaction.walletAddress}
                      </p>
                    )}
                    {transaction.type === 'deposit' && transaction.proofFileName && (
                      <div className="mt-2">
                        <p className="text-xs text-[var(--kucoin-success)] mb-1">
                          📎 Proof of Deposit: {transaction.proofFileName}
                        </p>
                        <button
                          onClick={() => {
                            if (transaction.proofFilePath) {
                              const token = localStorage.getItem('auth_token');
                              const filename = transaction.proofFilePath.split('/').pop();
                              window.open(`/uploads/deposit-proofs/${filename}?token=${token}`, '_blank');
                            }
                          }}
                          className="text-xs bg-[var(--kucoin-primary)] hover:bg-[var(--kucoin-primary)]/80 text-white px-3 py-1 rounded transition-colors"
                        >
                          View Proof File
                        </button>
                      </div>
                    )}
                    {transaction.type === 'deposit' && transaction.transactionHash && (
                      <div className="mt-2 p-2 bg-[var(--kucoin-dark-200)] rounded">
                        <p className="text-xs text-[var(--kucoin-primary)] font-mono break-all">
                          TXID: {transaction.transactionHash}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {transaction.validationStatus && (
                            <Badge 
                              variant="outline" 
                              className={
                                transaction.validationStatus === 'validated' || transaction.validationStatus === 'manually_approved'
                                  ? 'text-[var(--kucoin-success)] border-[var(--kucoin-success)]'
                                  : transaction.validationStatus === 'manual_review' || transaction.validationStatus === 'rejected'
                                  ? 'text-[var(--kucoin-danger)] border-[var(--kucoin-danger)]'
                                  : 'text-[var(--kucoin-warning)] border-[var(--kucoin-warning)]'
                              }
                            >
                              {transaction.validationStatus}
                            </Badge>
                          )}
                          {transaction.confirmationCount !== undefined && transaction.confirmationCount !== null && (
                            <span className="text-xs text-[var(--kucoin-dark-100)]">
                              Confirmations: {transaction.confirmationCount}
                            </span>
                          )}
                        </div>
                        {transaction.depositWalletAddress && (
                          <p className="text-xs text-[var(--kucoin-dark-100)] mt-1 font-mono break-all">
                            Wallet: {transaction.depositWalletAddress}
                          </p>
                        )}
                      </div>
                    )}
                    {transaction.network && (
                      <p className="text-xs text-[var(--kucoin-dark-100)]">
                        Network: {transaction.network}
                      </p>
                    )}
                    <p className="text-xs text-[var(--kucoin-dark-100)]">
                      {new Date(transaction.createdAt).toLocaleString()}
                    </p>
                    {transaction.adminNote && (
                      <p className="text-xs text-[var(--kucoin-warning)] mt-1">
                        Admin Note: {transaction.adminNote}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      variant="outline"
                      className={
                        transaction.status === 'approved'
                          ? 'text-[var(--kucoin-success)]'
                          : transaction.status === 'declined'
                          ? 'text-[var(--kucoin-danger)]'
                          : 'text-[var(--kucoin-warning)]'
                      }
                    >
                      {transaction.status}
                    </Badge>
                    {(transaction.status === 'pending' || 
                      (transaction.type === 'deposit' && 
                       transaction.validationStatus && 
                       ['pending_validation', 'pending_confirmations', 'manual_review', 'validating'].includes(transaction.validationStatus))
                    ) && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => approveTransactionMutation.mutate({ transactionId: transaction.id })}
                          className="bg-[var(--kucoin-success)] hover:bg-[var(--kucoin-success)]/80"
                          data-testid={`button-approve-transaction-${transaction.id}`}
                        >
                          {transaction.validationStatus ? 'Override Approve' : 'Approve'}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => declineTransactionMutation.mutate({ transactionId: transaction.id })}
                          data-testid={`button-decline-transaction-${transaction.id}`}
                        >
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
                {transaction.adminNote && (
                  <p className="mt-2 text-sm text-[var(--kucoin-dark-100)] italic">
                    Admin Note: {transaction.adminNote}
                  </p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderConfig = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white mb-6">Site Configuration</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        {/* Current Configurations */}
        <Card className="bg-[var(--kucoin-dark-400)] border-[var(--kucoin-dark-200)]">
          <CardHeader>
            <CardTitle className="text-white">Current Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {siteConfigs.map((config) => (
                <div key={config.id} className="p-4 bg-[var(--kucoin-dark-300)] rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-[var(--kucoin-primary)]">{config.key}</p>
                      <p className="text-white">{config.value}</p>
                      <p className="text-sm text-[var(--kucoin-dark-100)]">{config.description}</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => {
                        setConfigKey(config.key);
                        setConfigValue(config.value);
                        setConfigDescription(config.description);
                      }}
                      className="bg-[var(--kucoin-primary)] hover:bg-[var(--kucoin-primary)]/80"
                    >
                      Edit
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Update Configuration */}
        <Card className="bg-[var(--kucoin-dark-400)] border-[var(--kucoin-dark-200)]">
          <CardHeader>
            <CardTitle className="text-white">Update Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-white">Configuration Key</Label>
              <Input
                value={configKey}
                onChange={(e) => setConfigKey(e.target.value)}
                placeholder="e.g., deposit_wallet_address"
                className="bg-[var(--kucoin-dark-300)] border-[var(--kucoin-dark-200)] text-white"
              />
            </div>

            <div>
              <Label className="text-white">Value</Label>
              <Input
                value={configValue}
                onChange={(e) => setConfigValue(e.target.value)}
                placeholder="Configuration value"
                className="bg-[var(--kucoin-dark-300)] border-[var(--kucoin-dark-200)] text-white"
              />
            </div>

            <div>
              <Label className="text-white">Description</Label>
              <Input
                value={configDescription}
                onChange={(e) => setConfigDescription(e.target.value)}
                placeholder="Configuration description"
                className="bg-[var(--kucoin-dark-300)] border-[var(--kucoin-dark-200)] text-white"
              />
            </div>

            <Button
              onClick={handleUpdateConfig}
              className="gradient-primary text-white hover:opacity-90 w-full"
              disabled={updateConfigMutation.isPending}
            >
              Update Configuration
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderTrading = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white mb-6">Trading Control Center</h2>
      
      {/* Trading Mode Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card className="bg-[var(--kucoin-dark-400)] border-[var(--kucoin-dark-200)]">
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-sm text-[var(--kucoin-dark-100)]">Force Win Mode</p>
              <p className="text-2xl font-bold text-[var(--kucoin-success)]">
                {users.filter(u => u.tradeWinRate && parseFloat(u.tradeWinRate) >= 70).length}
              </p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-[var(--kucoin-dark-400)] border-[var(--kucoin-dark-200)]">
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-sm text-[var(--kucoin-dark-100)]">Force Loss Mode (0%)</p>
              <p className="text-2xl font-bold text-[var(--kucoin-danger)]">
                {users.filter(u => u.tradeWinRate && parseFloat(u.tradeWinRate) === 0).length}
              </p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-[var(--kucoin-dark-400)] border-[var(--kucoin-dark-200)]">
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-sm text-[var(--kucoin-dark-100)]">Default Mode</p>
              <p className="text-2xl font-bold text-[var(--kucoin-primary)]">
                {users.filter(u => !u.tradeWinRate || (u.tradeWinRate !== "90.00" && u.tradeWinRate !== "10.00")).length}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
      


      {/* User Status Overview Table */}
      <Card className="bg-[var(--kucoin-dark-400)] border-[var(--kucoin-dark-200)]">
        <CardHeader>
          <CardTitle className="text-white">User Trading Status Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--kucoin-dark-200)]">
                  <th className="text-left p-3 text-white">Username</th>
                  <th className="text-left p-3 text-white">Balance</th>
                  <th className="text-left p-3 text-white">Status</th>
                  <th className="text-center p-3 text-white">Trading Mode</th>
                  <th className="text-center p-3 text-white">Win Rate</th>
                  <th className="text-center p-3 text-white">Quick Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-[var(--kucoin-dark-300)]">
                    <td className="p-3 text-white font-medium">{user.username}</td>
                    <td className="p-3 text-white">${user.balance}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded text-xs ${
                        user.status === 'active' 
                          ? 'bg-[var(--kucoin-success)] text-white'
                          : user.status === 'banned'
                          ? 'bg-[var(--kucoin-danger)] text-white'
                          : 'bg-[var(--kucoin-warning)] text-black'
                      }`}>
                        {user.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        user.tradeWinRate === "0.00"
                          ? "bg-[var(--kucoin-danger)] text-white"
                          : user.tradeWinRate && parseFloat(user.tradeWinRate) >= 1
                          ? "bg-[var(--kucoin-success)] text-white"
                          : "bg-[var(--kucoin-dark-200)] text-white"
                      }`}>
                        {user.tradeWinRate === "0.00"
                          ? "FORCE LOSS"
                          : user.tradeWinRate && parseFloat(user.tradeWinRate) >= 1
                          ? "FORCE WIN"
                          : "DEFAULT"
                        }
                      </span>
                    </td>
                    <td className="p-3 text-center text-white">
                      {user.tradeWinRate ? `${user.tradeWinRate}%` : 'Normal'}
                    </td>
                    <td className="p-3">
                      <div className="flex gap-1 justify-center items-center">
                        <Input
                          key={`tableWinRate-${user.id}-${user.tradeWinRate}`}
                          id={`tableWinRate-${user.id}`}
                          type="number"
                          min="0"
                          max="100"
                          defaultValue={user.tradeWinRate || ''}
                          placeholder="%"
                          className="bg-[var(--kucoin-dark-400)] border-[var(--kucoin-dark-200)] text-white text-xs w-16 h-7 px-2"
                        />
                        <Button
                          size="sm"
                          onClick={() => {
                            const input = document.getElementById(`tableWinRate-${user.id}`) as HTMLInputElement;
                            const winRate = input?.value;
                            if (winRate && winRate !== user.tradeWinRate) {
                              const confirmed = confirm(`Set ${user.username} to ${winRate}% win rate?`);
                              if (confirmed) {
                                updateUserMutation.mutate({
                                  userId: user.id,
                                  updates: { tradeWinRate: parseFloat(winRate).toFixed(2) }
                                });
                              }
                            }
                          }}
                          className="bg-[var(--kucoin-primary)] hover:bg-[var(--kucoin-primary)]/80 text-white text-xs px-2 h-7"
                          disabled={updateUserMutation.isPending}
                        >
                          Set
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => {
                            const confirmed = confirm(`Reset ${user.username} to DEFAULT mode?`);
                            if (confirmed) {
                              updateUserMutation.mutate({
                                userId: user.id,
                                updates: { tradeWinRate: null }
                              });
                              // Clear the input field
                              const input = document.getElementById(`tableWinRate-${user.id}`) as HTMLInputElement;
                              if (input) input.value = "";
                            }
                          }}
                          className="bg-[var(--kucoin-dark-200)] hover:bg-[var(--kucoin-dark-100)] text-white text-xs px-2 h-7"
                          disabled={updateUserMutation.isPending}
                        >
                          Reset
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-[var(--kucoin-dark-400)] border-[var(--kucoin-dark-200)]">
        <CardHeader>
          <CardTitle className="text-white">Individual User Trading Controls</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {users.map((user) => (
              <div key={user.id} className="p-4 bg-[var(--kucoin-dark-300)] rounded-lg">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-white">{user.username}</p>
                      <p className="text-sm text-[var(--kucoin-dark-100)]">Balance: ${user.balance}</p>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        user.tradeWinRate && parseFloat(user.tradeWinRate) >= 70
                          ? "bg-[var(--kucoin-success)] text-white"
                          : user.tradeWinRate && parseFloat(user.tradeWinRate) <= 30
                          ? "bg-[var(--kucoin-danger)] text-white"
                          : user.tradeWinRate && parseFloat(user.tradeWinRate) > 30 && parseFloat(user.tradeWinRate) < 70
                          ? "bg-[var(--kucoin-warning)] text-black"
                          : "bg-[var(--kucoin-dark-200)] text-white"
                      }`}>
                        {user.tradeWinRate 
                          ? parseFloat(user.tradeWinRate) >= 70
                            ? "FORCE WIN"
                            : parseFloat(user.tradeWinRate) === 0
                            ? "FORCE LOSS"
                            : "CUSTOM"
                          : "DEFAULT"
                        }
                      </span>
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-white text-sm">Custom Win Rate (%)</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        key={`winRate-${user.id}-${user.tradeWinRate}`}
                        id={`winRate-${user.id}`}
                        type="number"
                        min="0"
                        max="100"
                        defaultValue={user.tradeWinRate || ''}
                        placeholder="Enter 0-100"
                        className="bg-[var(--kucoin-dark-400)] border-[var(--kucoin-dark-200)] text-white text-sm"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const winRate = (e.target as HTMLInputElement).value;
                            if (winRate && winRate !== user.tradeWinRate) {
                              const confirmed = confirm(`Set ${user.username} to ${winRate}% win rate?`);
                              if (confirmed) {
                                updateUserMutation.mutate({
                                  userId: user.id,
                                  updates: { tradeWinRate: parseFloat(winRate).toFixed(2) }
                                });
                              }
                            }
                          }
                        }}
                      />
                      <Button
                        size="sm"
                        onClick={() => {
                          const input = document.getElementById(`winRate-${user.id}`) as HTMLInputElement;
                          const winRate = input?.value;
                          if (winRate && winRate !== user.tradeWinRate) {
                            const confirmed = confirm(`Set ${user.username} to ${winRate}% win rate?`);
                            if (confirmed) {
                              updateUserMutation.mutate({
                                userId: user.id,
                                updates: { tradeWinRate: parseFloat(winRate).toFixed(2) }
                              });
                            }
                          }
                        }}
                        className="bg-[var(--kucoin-primary)] hover:bg-[var(--kucoin-primary)]/80 text-white text-xs px-3"
                        disabled={updateUserMutation.isPending}
                      >
                        Apply
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs text-[var(--kucoin-dark-100)]">Trading Control:</p>
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        size="sm"
                        onClick={() => {
                          const confirmed = confirm(`Set ${user.username} to always WIN?`);
                          if (confirmed) {
                            updateUserMutation.mutate({
                              userId: user.id,
                              updates: { tradeWinRate: "100.00" }
                            });
                          }
                        }}
                        className="bg-green-600 hover:bg-green-700 text-white text-xs"
                      >
                        Win
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          const confirmed = confirm(`Set ${user.username} to always LOSE?`);
                          if (confirmed) {
                            updateUserMutation.mutate({
                              userId: user.id,
                              updates: { tradeWinRate: "0.00" }
                            });
                          }
                        }}
                        className="bg-red-600 hover:bg-red-700 text-white text-xs"
                      >
                        Lose
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          const confirmed = confirm(`Reset ${user.username} to normal trading?`);
                          if (confirmed) {
                            updateUserMutation.mutate({
                              userId: user.id,
                              updates: { tradeWinRate: null }
                            });
                          }
                        }}
                        className="bg-gray-600 hover:bg-gray-700 text-white text-xs"
                      >
                        Default
                      </Button>
                    </div>
                    
                    {/* Win Percentage Control */}
                    {user.tradeWinRate && parseFloat(user.tradeWinRate) >= 95 && (
                      <div className="space-y-2 p-3 bg-green-950/20 rounded border border-green-700/30">
                        <p className="text-xs text-green-400 font-medium">Win Percentage Control:</p>
                        <div className="flex gap-2 items-center">
                          <Input
                            id={`winPercent-${user.id}`}
                            type="number"
                            min="10"
                            max="500"
                            defaultValue={user.winPercentage || "85"}
                            placeholder="85"
                            className="w-20 h-8 text-xs"
                          />
                          <span className="text-xs text-gray-400">%</span>
                          <Button
                            size="sm"
                            onClick={() => {
                              const input = document.getElementById(`winPercent-${user.id}`) as HTMLInputElement;
                              const winPercent = input?.value;
                              if (winPercent && parseFloat(winPercent) >= 10 && parseFloat(winPercent) <= 500) {
                                const confirmed = confirm(`Set ${user.username}'s win percentage to ${winPercent}%?`);
                                if (confirmed) {
                                  updateUserMutation.mutate({
                                    userId: user.id,
                                    updates: { winPercentage: parseFloat(winPercent).toFixed(2) }
                                  });
                                }
                              } else {
                                alert('Enter a win percentage between 10% and 500%');
                              }
                            }}
                            className="bg-green-600 hover:bg-green-700 text-white text-xs"
                          >
                            Set Win %
                          </Button>
                        </div>
                        <p className="text-xs text-gray-400">
                          Current: {user.winPercentage || "85"}% profit on wins
                        </p>
                      </div>
                    )}
                    
                    {/* Current Mode Indicator */}
                    <div className="text-xs">
                      <span className="text-[var(--kucoin-dark-100)]">Current: </span>
                      <span className={
                        user.tradeWinRate === "0.00" 
                          ? "text-red-500 font-medium"
                          : user.tradeWinRate && parseFloat(user.tradeWinRate) >= 1
                          ? "text-green-500 font-medium"
                          : "text-gray-400 font-medium"
                      }>
                        {user.tradeWinRate === "0.00" 
                          ? "Always Lose"
                          : user.tradeWinRate && parseFloat(user.tradeWinRate) >= 1
                          ? "Always Win"
                          : "Default"
                        }
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderBlacklist = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white mb-6">Blacklist Management</h2>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <Card className="bg-[var(--kucoin-dark-400)] border-[var(--kucoin-dark-200)]">
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-sm text-[var(--kucoin-dark-100)]">Total Blocked</p>
              <p className="text-2xl font-bold text-white">{blacklistEntries.length}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-[var(--kucoin-dark-400)] border-[var(--kucoin-dark-200)]">
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-sm text-[var(--kucoin-dark-100)]">Emails / Phones</p>
              <p className="text-2xl font-bold text-white">
                {blacklistEntries.filter(e => e.type === 'email').length} / {blacklistEntries.filter(e => e.type === 'phone').length}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-[var(--kucoin-dark-400)] border-[var(--kucoin-dark-200)]">
        <CardHeader>
          <CardTitle className="text-white">Add to Blacklist</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label className="text-white">Type</Label>
              <Select
                value={blacklistData.type}
                onValueChange={(value: 'email' | 'phone') => setBlacklistData(prev => ({ ...prev, type: value }))}
              >
                <SelectTrigger className="bg-[var(--kucoin-dark-300)] border-[var(--kucoin-dark-200)] text-white" data-testid="select-blacklist-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email Address</SelectItem>
                  <SelectItem value="phone">Phone Number</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label className="text-white">{blacklistData.type === 'email' ? 'Email' : 'Phone Number'}</Label>
              <Input
                type={blacklistData.type === 'email' ? 'email' : 'tel'}
                value={blacklistData.value}
                onChange={(e) => setBlacklistData(prev => ({ ...prev, value: e.target.value }))}
                placeholder={blacklistData.type === 'email' ? 'user@example.com' : '+1234567890'}
                className="bg-[var(--kucoin-dark-300)] border-[var(--kucoin-dark-200)] text-white"
                data-testid="input-blacklist-value"
              />
            </div>
            
            <div>
              <Label className="text-white">Reason (Optional)</Label>
              <Input
                value={blacklistData.reason}
                onChange={(e) => setBlacklistData(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="Spam, fraud, etc."
                className="bg-[var(--kucoin-dark-300)] border-[var(--kucoin-dark-200)] text-white"
                data-testid="input-blacklist-reason"
              />
            </div>
            
            <div className="flex items-end">
              <Button
                onClick={() => {
                  if (!blacklistData.value) {
                    toast({ title: "Please enter a value to blacklist", variant: "destructive" });
                    return;
                  }
                  addBlacklistMutation.mutate(blacklistData);
                }}
                className="w-full bg-red-600 hover:bg-red-700 text-white"
                disabled={addBlacklistMutation.isPending}
                data-testid="button-add-blacklist"
              >
                {addBlacklistMutation.isPending ? "Adding..." : "Add to Blacklist"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-[var(--kucoin-dark-400)] border-[var(--kucoin-dark-200)]">
        <CardHeader>
          <CardTitle className="text-white">Blacklist Entries</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {blacklistEntries.length === 0 ? (
              <p className="text-center text-[var(--kucoin-dark-100)] py-8">
                No blacklist entries found
              </p>
            ) : (
              blacklistEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-4 bg-[var(--kucoin-dark-300)] rounded-lg border border-[var(--kucoin-dark-200)]"
                  data-testid={`blacklist-entry-${entry.id}`}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="p-2 bg-[var(--kucoin-dark-400)] rounded-lg">
                      {entry.type === 'email' ? (
                        <Mail className="w-5 h-5 text-red-500" />
                      ) : (
                        <Phone className="w-5 h-5 text-red-500" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium">{entry.value}</span>
                        <Badge variant="outline" className="text-xs">
                          {entry.type}
                        </Badge>
                      </div>
                      {entry.reason && (
                        <p className="text-sm text-[var(--kucoin-dark-100)] mt-1">
                          Reason: {entry.reason}
                        </p>
                      )}
                      <p className="text-xs text-[var(--kucoin-dark-100)] mt-1">
                        Added: {new Date(entry.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (confirm(`Remove ${entry.value} from blacklist?`)) {
                        removeBlacklistMutation.mutate(entry.id);
                      }
                    }}
                    className="bg-[var(--kucoin-dark-400)] border-[var(--kucoin-dark-200)] text-red-500 hover:bg-red-900 hover:text-white"
                    disabled={removeBlacklistMutation.isPending}
                    data-testid={`button-remove-blacklist-${entry.id}`}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Remove
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderKycManagement = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white mb-6">KYC Verification Management</h2>
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card className="bg-[var(--kucoin-dark-400)] border-[var(--kucoin-dark-200)]">
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-sm text-[var(--kucoin-dark-100)]">Total Submissions</p>
              <p className="text-2xl font-bold text-white">{kycSubmissions.length}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-[var(--kucoin-dark-400)] border-[var(--kucoin-dark-200)]">
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-sm text-[var(--kucoin-dark-100)]">Pending Review</p>
              <p className="text-2xl font-bold text-[var(--kucoin-warning)]">
                {kycSubmissions.filter(k => k.status === 'pending').length}
              </p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-[var(--kucoin-dark-400)] border-[var(--kucoin-dark-200)]">
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-sm text-[var(--kucoin-dark-100)]">Approved</p>
              <p className="text-2xl font-bold text-[var(--kucoin-success)]">
                {kycSubmissions.filter(k => k.status === 'approved').length}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-[var(--kucoin-dark-400)] border-[var(--kucoin-dark-200)]">
        <CardHeader>
          <CardTitle className="text-white">KYC Submissions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {kycSubmissions.length === 0 ? (
              <p className="text-center text-[var(--kucoin-dark-100)] py-8">
                No KYC submissions found
              </p>
            ) : (
              kycSubmissions.map((kyc) => (
                <div key={kyc.id} className="p-4 bg-[var(--kucoin-dark-300)] rounded-lg">
                  <div className="flex flex-col lg:flex-row gap-4">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-white">{kyc.fullName}</h4>
                        <Badge
                          variant="outline"
                          className={
                            kyc.status === 'approved'
                              ? 'text-[var(--kucoin-success)] border-[var(--kucoin-success)]'
                              : kyc.status === 'rejected'
                              ? 'text-[var(--kucoin-danger)] border-[var(--kucoin-danger)]'
                              : 'text-[var(--kucoin-warning)] border-[var(--kucoin-warning)]'
                          }
                        >
                          {kyc.status.charAt(0).toUpperCase() + kyc.status.slice(1)}
                        </Badge>
                      </div>
                      <p className="text-sm text-[var(--kucoin-dark-100)] mb-1">
                        User: {kyc.userEmail}
                      </p>
                      <p className="text-xs text-[var(--kucoin-dark-100)] mb-3">
                        Submitted: {new Date(kyc.submittedAt).toLocaleString()}
                      </p>
                      
                      {kyc.adminNote && (
                        <div className="bg-[var(--kucoin-dark-200)] p-2 rounded text-sm">
                          <p className="text-[var(--kucoin-dark-100)]">Admin Note:</p>
                          <p className="text-white">{kyc.adminNote}</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-col gap-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-xs text-[var(--kucoin-dark-100)] mb-1">Front ID</p>
                          <img 
                            src={kyc.idFrontImage} 
                            alt="ID Front" 
                            className="w-24 h-16 object-cover rounded border border-[var(--kucoin-dark-200)] cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => setSelectedKycImage({ 
                              src: kyc.idFrontImage, 
                              title: `${kyc.fullName} - Front ID` 
                            })}
                          />
                        </div>
                        <div>
                          <p className="text-xs text-[var(--kucoin-dark-100)] mb-1">Back ID</p>
                          <img 
                            src={kyc.idBackImage} 
                            alt="ID Back" 
                            className="w-24 h-16 object-cover rounded border border-[var(--kucoin-dark-200)] cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => setSelectedKycImage({ 
                              src: kyc.idBackImage, 
                              title: `${kyc.fullName} - Back ID` 
                            })}
                          />
                        </div>
                      </div>
                      
                      {kyc.status === 'pending' && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            disabled={reviewKycMutation.isPending}
                            onClick={() => {
                              const confirmed = confirm(`Are you sure you want to approve ${kyc.fullName}'s KYC verification?`);
                              if (confirmed) {
                                const note = prompt("Optional admin note for approval:");
                                reviewKycMutation.mutate({
                                  kycId: kyc.id,
                                  status: 'approved',
                                  adminNote: note || undefined,
                                });
                              }
                            }}
                            className="bg-[var(--kucoin-success)] hover:bg-[var(--kucoin-success)]/80 text-white disabled:opacity-50"
                          >
                            {reviewKycMutation.isPending ? 'Processing...' : 'Approve'}
                          </Button>
                          <Button
                            size="sm"
                            disabled={reviewKycMutation.isPending}
                            onClick={() => {
                              const note = prompt("Reason for rejection (required):");
                              if (note && note.trim()) {
                                const confirmed = confirm(`Are you sure you want to reject ${kyc.fullName}'s KYC verification?\n\nReason: ${note}`);
                                if (confirmed) {
                                  reviewKycMutation.mutate({
                                    kycId: kyc.id,
                                    status: 'rejected',
                                    adminNote: note.trim(),
                                  });
                                }
                              } else if (note !== null) {
                                alert("Rejection reason is required and cannot be empty.");
                              }
                            }}
                            className="bg-[var(--kucoin-danger)] hover:bg-[var(--kucoin-danger)]/80 text-white disabled:opacity-50"
                          >
                            {reviewKycMutation.isPending ? 'Processing...' : 'Reject'}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const downloadImage = (src: string, filename: string) => {
    const link = document.createElement('a');
    link.href = src;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-[var(--kucoin-dark-500)] text-white">
      {/* KYC Image Modal */}
      {selectedKycImage && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--kucoin-dark-400)] rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-[var(--kucoin-dark-200)]">
              <h3 className="text-lg font-semibold text-white">{selectedKycImage.title}</h3>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadImage(selectedKycImage.src, `${selectedKycImage.title}.jpg`)}
                  className="bg-[var(--kucoin-dark-300)] border-[var(--kucoin-dark-200)] text-white hover:bg-[var(--kucoin-dark-200)]"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedKycImage(null)}
                  className="bg-[var(--kucoin-dark-300)] border-[var(--kucoin-dark-200)] text-white hover:bg-[var(--kucoin-dark-200)]"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="p-4">
              <div className="relative">
                <img
                  src={selectedKycImage.src}
                  alt={selectedKycImage.title}
                  className="w-full h-auto max-h-[70vh] object-contain rounded border border-[var(--kucoin-dark-200)]"
                />
                <div className="absolute top-2 right-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(selectedKycImage.src, '_blank')}
                    className="bg-[var(--kucoin-dark-400)] bg-opacity-90 border-[var(--kucoin-dark-200)] text-white hover:bg-[var(--kucoin-dark-300)]"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="mt-4 text-sm text-[var(--kucoin-dark-100)]">
                <p>Click the zoom button to view in full size, or use download to save the image.</p>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="flex relative">
        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="md:hidden fixed top-4 left-4 z-50 p-2 bg-[var(--kucoin-dark-400)] rounded-lg border border-[var(--kucoin-dark-200)]"
        >
          {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>

        {/* Mobile Overlay */}
        {isSidebarOpen && (
          <div
            className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Sidebar Navigation */}
        <div className={`
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
          md:translate-x-0 transition-transform duration-300 ease-in-out
          fixed md:static z-50 md:z-auto
          w-64 min-h-screen bg-[var(--kucoin-dark-400)] border-r border-[var(--kucoin-dark-200)]
        `}>
          <div className="p-6">
            <div className="flex items-center gap-3 mb-8 mt-12 md:mt-0">
              <Shield className="w-8 h-8 text-[var(--kucoin-primary)]" />
              <h1 className="text-xl font-bold">Admin Panel</h1>
            </div>
            
            <nav className="space-y-2">
              <button
                onClick={() => {
                  setActiveTab("dashboard");
                  setIsSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  activeTab === "dashboard"
                    ? "bg-[var(--kucoin-primary)] text-white"
                    : "text-[var(--kucoin-dark-100)] hover:bg-[var(--kucoin-dark-300)]"
                }`}
              >
                <TrendingUp className="w-5 h-5" />
                <span>Dashboard</span>
              </button>
              
              <button
                onClick={() => {
                  setActiveTab("users");
                  setIsSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  activeTab === "users"
                    ? "bg-[var(--kucoin-primary)] text-white"
                    : "text-[var(--kucoin-dark-100)] hover:bg-[var(--kucoin-dark-300)]"
                }`}
              >
                <Users className="w-5 h-5" />
                <span>Users</span>
              </button>
              
              <button
                onClick={() => {
                  setActiveTab("transactions");
                  setIsSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  activeTab === "transactions"
                    ? "bg-[var(--kucoin-primary)] text-white"
                    : "text-[var(--kucoin-dark-100)] hover:bg-[var(--kucoin-dark-300)]"
                }`}
              >
                <CreditCard className="w-5 h-5" />
                <span>Transactions</span>
              </button>
              
              <button
                onClick={() => {
                  setActiveTab("config");
                  setIsSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  activeTab === "config"
                    ? "bg-[var(--kucoin-primary)] text-white"
                    : "text-[var(--kucoin-dark-100)] hover:bg-[var(--kucoin-dark-300)]"
                }`}
              >
                <Settings className="w-5 h-5" />
                <span>Site Config</span>
              </button>
              
              <button
                onClick={() => {
                  setActiveTab("trading");
                  setIsSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  activeTab === "trading"
                    ? "bg-[var(--kucoin-primary)] text-white"
                    : "text-[var(--kucoin-dark-100)] hover:bg-[var(--kucoin-dark-300)]"
                }`}
              >
                <DollarSign className="w-5 h-5" />
                <span>Trading Control</span>
              </button>
              
              <button
                onClick={() => {
                  setActiveTab("wallets");
                  setIsSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  activeTab === "wallets"
                    ? "bg-[var(--kucoin-primary)] text-white"
                    : "text-[var(--kucoin-dark-100)] hover:bg-[var(--kucoin-dark-300)]"
                }`}
              >
                <CreditCard className="w-5 h-5" />
                <span>Crypto Wallets</span>
              </button>
              
              <button
                onClick={() => {
                  setActiveTab("kyc");
                  setIsSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  activeTab === "kyc"
                    ? "bg-[var(--kucoin-primary)] text-white"
                    : "text-[var(--kucoin-dark-100)] hover:bg-[var(--kucoin-dark-300)]"
                }`}
              >
                <Shield className="w-5 h-5" />
                <span>KYC Management</span>
              </button>
              
              <button
                onClick={() => {
                  setActiveTab("blacklist");
                  setIsSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  activeTab === "blacklist"
                    ? "bg-[var(--kucoin-primary)] text-white"
                    : "text-[var(--kucoin-dark-100)] hover:bg-[var(--kucoin-dark-300)]"
                }`}
              >
                <Ban className="w-5 h-5" />
                <span>Blacklist</span>
              </button>
              
              <button
                onClick={() => {
                  setActiveTab("giftcards");
                  setIsSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  activeTab === "giftcards"
                    ? "bg-[var(--kucoin-primary)] text-white"
                    : "text-[var(--kucoin-dark-100)] hover:bg-[var(--kucoin-dark-300)]"
                }`}
              >
                <Gift className="w-5 h-5" />
                <span>Gift Cards</span>
              </button>
            </nav>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 p-4 md:p-6 pt-16 md:pt-6">
          <div className="max-w-6xl mx-auto">
            {activeTab === "dashboard" && renderDashboard()}
            {activeTab === "users" && renderUsers()}
            {activeTab === "transactions" && renderTransactions()}
            {activeTab === "config" && renderConfig()}
            {activeTab === "trading" && renderTrading()}
            {activeTab === "kyc" && renderKycManagement()}
            {activeTab === "blacklist" && renderBlacklist()}
            {activeTab === "wallets" && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-white mb-6">Cryptocurrency Wallet Management</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {['USDT', 'TRX', 'ETH', 'BTC'].map((crypto) => (
                    <Card key={crypto} className="bg-[var(--kucoin-dark-400)] border-[var(--kucoin-dark-200)]">
                      <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                          <CreditCard className="w-5 h-5" />
                          {crypto} Wallet Address
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <Label htmlFor={`wallet-${crypto}`} className="text-[var(--kucoin-dark-100)]">
                            Deposit Wallet Address
                          </Label>
                          <Input
                            id={`wallet-${crypto}`}
                            value={walletAddresses[crypto as keyof typeof walletAddresses]}
                            onChange={(e) => 
                              setWalletAddresses(prev => ({ 
                                ...prev, 
                                [crypto]: e.target.value 
                              }))
                            }
                            placeholder={`Enter ${crypto} wallet address`}
                            className="bg-[var(--kucoin-dark-200)] border-[var(--kucoin-dark-100)] text-white"
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor={`qr-${crypto}`} className="text-[var(--kucoin-dark-100)]">
                            QR Code Image
                          </Label>
                          <Input
                            id={`qr-${crypto}`}
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleQRUpload(crypto, e.target.files?.[0])}
                            className="bg-[var(--kucoin-dark-200)] border-[var(--kucoin-dark-100)] text-white"
                          />
                        </div>

                        <div className="text-sm text-[var(--kucoin-dark-100)]">
                          <p>Current: {siteConfigs?.find(c => c.key === `deposit_wallet_${crypto.toLowerCase()}`)?.value || 'Not set'}</p>
                          <p>Min Deposit: {siteConfigs?.find(c => c.key === `min_deposit_${crypto.toLowerCase()}`)?.value || 'N/A'} {crypto}</p>
                          <p>QR Code: {siteConfigs?.find(c => c.key === `qr_code_${crypto.toLowerCase()}`)?.value ? 'Uploaded' : 'Not uploaded'}</p>
                        </div>
                        
                        <Button
                          onClick={() => handleUpdateWallet(crypto)}
                          disabled={!walletAddresses[crypto as keyof typeof walletAddresses] || updateWalletMutation.isPending}
                          className="w-full bg-[var(--kucoin-primary)] hover:bg-[var(--kucoin-primary)]/80"
                        >
                          {updateWalletMutation.isPending ? "Updating..." : `Update ${crypto} Address`}
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                
                <Card className="bg-[var(--kucoin-dark-400)] border-[var(--kucoin-dark-200)]">
                  <CardHeader>
                    <CardTitle className="text-white">Wallet Management Info</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-[var(--kucoin-dark-100)]">
                      <p>• Users will see these wallet addresses when making deposits</p>
                      <p>• Make sure to use valid wallet addresses for each cryptocurrency</p>
                      <p>• USDT and TRX typically use TRC20 network addresses</p>
                      <p>• ETH uses ERC20 network addresses</p>
                      <p>• BTC uses native Bitcoin network addresses</p>
                      <p>• Always verify addresses before updating to prevent loss of funds</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
            {activeTab === "giftcards" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-white">Gift Card Requests</h2>
                  <Select value={giftCardFilter} onValueChange={setGiftCardFilter}>
                    <SelectTrigger className="w-40 bg-[var(--kucoin-dark-400)] border-[var(--kucoin-dark-200)] text-white">
                      <SelectValue placeholder="Filter" />
                    </SelectTrigger>
                    <SelectContent className="bg-[var(--kucoin-dark-400)] border-[var(--kucoin-dark-200)]">
                      <SelectItem value="all" className="text-white">All</SelectItem>
                      <SelectItem value="pending" className="text-white">Pending</SelectItem>
                      <SelectItem value="approved" className="text-white">Approved</SelectItem>
                      <SelectItem value="declined" className="text-white">Declined</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {giftCards.length === 0 ? (
                  <Card className="bg-[var(--kucoin-dark-400)] border-[var(--kucoin-dark-200)]">
                    <CardContent className="py-8 text-center">
                      <Gift className="w-12 h-12 text-[var(--kucoin-dark-100)] mx-auto mb-3" />
                      <p className="text-[var(--kucoin-dark-100)]">No gift card submissions found</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {giftCards.map((card: any) => (
                      <Card key={card.id} className="bg-[var(--kucoin-dark-400)] border-[var(--kucoin-dark-200)]">
                        <CardContent className="p-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div>
                              <p className="text-xs text-[var(--kucoin-dark-100)]">User</p>
                              <p className="text-white font-medium">{card.username || 'Unknown'}</p>
                              <p className="text-xs text-[var(--kucoin-dark-100)]">{card.userEmail}</p>
                              <p className="text-xs text-[var(--kucoin-dark-100)]">ID: {card.userId}</p>
                            </div>
                            <div>
                              <p className="text-xs text-[var(--kucoin-dark-100)]">Gift Card Details</p>
                              <p className="text-white font-medium">{card.giftCardType}</p>
                              <p className="text-xs text-blue-400 mt-1">{card.giftCardFormat || 'N/A'}</p>
                              <p className="text-xs text-yellow-400 mt-1">Currency: {card.giftCardCurrency || 'USD'}</p>
                              <p className="text-xs text-[var(--kucoin-dark-100)] font-mono mt-1 break-all">
                                Code: {card.giftCardCode}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-[var(--kucoin-dark-100)]">Amount & Conversion</p>
                              <p className="text-white font-bold text-lg">
                                {parseFloat(card.giftCardAmount || card.amountUsd || "0").toFixed(2)} {card.giftCardCurrency || 'USD'}
                              </p>
                              {card.status === "approved" && card.exchangeRate && (
                                <p className="text-xs text-[var(--kucoin-dark-100)]">
                                  Rate: 1 {card.giftCardCurrency || 'USD'} = {parseFloat(card.exchangeRate).toFixed(4)} USD
                                </p>
                              )}
                              {card.status === "approved" && card.amountUsd && (
                                <p className="text-xs text-[var(--kucoin-dark-100)]">
                                  USD Value: ${parseFloat(card.amountUsd).toFixed(2)}
                                </p>
                              )}
                              {card.status === "approved" && card.processingFee && (
                                <p className="text-xs text-red-400">
                                  Fee (5%): -${parseFloat(card.processingFee).toFixed(2)}
                                </p>
                              )}
                              {card.status === "approved" && card.usdtCredited && (
                                <p className="text-green-400 text-sm font-bold mt-1">
                                  Credited: {parseFloat(card.usdtCredited).toFixed(2)} USDT
                                </p>
                              )}
                              <p className="text-xs text-[var(--kucoin-dark-100)] mt-1">
                                {new Date(card.createdAt).toLocaleString()}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-[var(--kucoin-dark-100)]">Status</p>
                              <Badge className={
                                card.status === "pending" ? "bg-yellow-600/20 text-yellow-400 border-yellow-600" :
                                card.status === "approved" ? "bg-green-600/20 text-green-400 border-green-600" :
                                "bg-red-600/20 text-red-400 border-red-600"
                              }>
                                {card.status.charAt(0).toUpperCase() + card.status.slice(1)}
                              </Badge>
                              {card.reviewedAt && (
                                <p className="text-xs text-[var(--kucoin-dark-100)] mt-1">
                                  Reviewed: {new Date(card.reviewedAt).toLocaleString()}
                                </p>
                              )}
                            </div>
                          </div>
                          
                          <div className="mt-4 flex flex-wrap items-center gap-3">
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-blue-500 text-blue-400 hover:bg-blue-600/20"
                              onClick={() => {
                                const token = localStorage.getItem('auth_token');
                                setSelectedGiftCardImage(`${card.imageUrl}?token=${token}`);
                              }}
                            >
                              <ZoomIn className="w-4 h-4 mr-1" /> View Image
                            </Button>

                            {card.status === "pending" && (
                              <>
                                <Input
                                  placeholder="Admin note (optional)"
                                  value={giftCardNote}
                                  onChange={(e) => setGiftCardNote(e.target.value)}
                                  className="flex-1 min-w-[200px] bg-[var(--kucoin-dark-500)] border-[var(--kucoin-dark-300)] text-white text-sm h-9"
                                />
                                <Button
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700 text-white"
                                  disabled={giftCardActionMutation.isPending}
                                  onClick={() => giftCardActionMutation.mutate({ id: card.id, action: "approve", adminNote: giftCardNote })}
                                >
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  className="bg-red-600 hover:bg-red-700 text-white"
                                  disabled={giftCardActionMutation.isPending}
                                  onClick={() => giftCardActionMutation.mutate({ id: card.id, action: "decline", adminNote: giftCardNote })}
                                >
                                  Decline
                                </Button>
                              </>
                            )}
                          </div>

                          {card.adminNote && (
                            <p className="mt-2 text-sm text-[var(--kucoin-dark-100)]">
                              Admin Note: {card.adminNote}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {selectedGiftCardImage && (
                  <div
                    className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4"
                    onClick={() => setSelectedGiftCardImage(null)}
                  >
                    <div className="relative max-w-3xl max-h-[80vh]" onClick={e => e.stopPropagation()}>
                      <Button
                        size="sm"
                        variant="outline"
                        className="absolute -top-10 right-0 text-white border-white hover:bg-white/10"
                        onClick={() => setSelectedGiftCardImage(null)}
                      >
                        <X className="w-4 h-4" /> Close
                      </Button>
                      <img
                        src={selectedGiftCardImage}
                        alt="Gift Card"
                        className="max-w-full max-h-[80vh] object-contain rounded-lg"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}