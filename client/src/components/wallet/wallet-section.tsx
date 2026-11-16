import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Copy, QrCode, ArrowUpCircle, ArrowDownCircle, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import WithdrawalReceipt from "./withdrawal-receipt";

interface Transaction {
  id: number;
  type: string;
  amount: string;
  status: string;
  network: string | null;
  walletAddress: string | null;
  createdAt: string;
}

interface WalletData {
  wallets: {
    [key: string]: string;
  };
  qrCodes: {
    [key: string]: string | null;
  };
  minimums: {
    [key: string]: string;
  };
}

export default function WalletSection() {
  const [selectedCrypto, setSelectedCrypto] = useState("USDT");
  const [depositNetwork, setDepositNetwork] = useState("TRC20");
  const [depositAmount, setDepositAmount] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [depositMethod, setDepositMethod] = useState<"proof" | "txid">("proof");
  const [transactionHash, setTransactionHash] = useState("");
  const [withdrawalData, setWithdrawalData] = useState({
    cryptocurrency: "USDT TRC20",
    walletAddress: "",
    amount: "",
    network: "TRC20",
    type: "withdrawal" as const,
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch transaction history - always refetch to show pending deposits immediately
  const { data: transactions = [], refetch: refetchTransactions } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
    staleTime: 0, // Always consider data stale so it refetches
    refetchOnMount: "always", // Always refetch when component mounts
  });

  // Fetch wallet addresses from backend
  const { data: walletAddresses } = useQuery<WalletData>({
    queryKey: ["/api/crypto/wallets"],
  });

  // Get current crypto's deposit address
  const getDepositAddress = () => {
    if (!walletAddresses?.wallets) return "";
    return walletAddresses.wallets[selectedCrypto] || "";
  };

  // Get withdrawal cryptocurrency options 
  const getWithdrawalCryptoOptions = () => {
    return [
      { 
        value: "USDT TRC20", 
        label: "USDT TRC20", 
        network: "TRC20", 
        fee: "1",
        icon: "₮",
        description: "Tron Network - Low fees"
      },
      { 
        value: "USDT ERC20", 
        label: "USDT ERC20", 
        network: "ERC20", 
        fee: "25",
        icon: "₮",
        description: "Ethereum Network - Higher fees"
      },
      { 
        value: "ETH", 
        label: "Ethereum (ETH)", 
        network: "ERC20", 
        fee: "0.005",
        icon: "Ξ",
        description: "Ethereum Network"
      },
      { 
        value: "BTC", 
        label: "Bitcoin (BTC)", 
        network: "Bitcoin", 
        fee: "0.0005",
        icon: "₿",
        description: "Bitcoin Network"
      },
      { 
        value: "USDC TRC20", 
        label: "USDC TRC20", 
        network: "TRC20", 
        fee: "1",
        icon: "$",
        description: "USD Coin on Tron"
      },
      { 
        value: "USDC ERC20", 
        label: "USDC ERC20", 
        network: "ERC20", 
        fee: "25",
        icon: "$",
        description: "USD Coin on Ethereum"
      },
      { 
        value: "TRX", 
        label: "Tron (TRX)", 
        network: "TRC20", 
        fee: "1",
        icon: "⚡",
        description: "Tron Network"
      },
      { 
        value: "BNB BSC", 
        label: "BNB (BSC)", 
        network: "BSC", 
        fee: "0.0005",
        icon: "🟡",
        description: "Binance Smart Chain"
      },
      { 
        value: "BUSD BSC", 
        label: "BUSD (BSC)", 
        network: "BSC", 
        fee: "1",
        icon: "$",
        description: "Binance USD on BSC"
      }
    ];
  };

  // Get network options for selected cryptocurrency (for deposits)
  const getNetworkOptions = () => {
    switch (selectedCrypto) {
      case "USDT":
      case "TRX":
        return [
          { value: "TRC20", label: "TRC20 (Tron)", fee: "1" },
        ];
      case "ETH":
        return [
          { value: "ERC20", label: "ERC20 (Ethereum)", fee: "25" },
        ];
      case "BTC":
        return [
          { value: "Bitcoin", label: "Bitcoin Network", fee: "0.0005" },
        ];
      default:
        return [];
    }
  };

  const depositMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Authentication required. Please log in again.');
      }
      
      console.log('Starting deposit submission...');
      
      const response = await fetch("/api/deposit", {
        method: "POST",
        body: formData,
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Deposit error response:', errorData);
        throw new Error(errorData.message || 'Deposit submission failed');
      }
      
      const result = await response.json();
      console.log('Deposit success response:', result);
      return result;
    },
    onSuccess: (data) => {
      console.log("✅ Deposit success callback triggered:", data);
      
      toast({
        title: "Deposit Submitted Successfully!",
        description: `Your ${selectedCrypto} deposit has been sent for admin approval`,
        variant: "default",
      });
      
      alert(`✅ Success! Your ${selectedCrypto} deposit has been submitted and is pending admin approval.`);
      
      setDepositAmount("");
      setProofFile(null);
      
      setTimeout(() => {
        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
        if (fileInput) {
          fileInput.value = '';
        }
      }, 100);
      
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      
      setTimeout(() => {
        refetchTransactions();
      }, 500);
    },
    onError: (error) => {
      console.error("Deposit error:", error);
      toast({
        title: "Deposit submission failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const depositWithTxidMutation = useMutation({
    mutationFn: async (data: { amount: string; cryptocurrency: string; network: string; transactionHash: string }) => {
      const response = await apiRequest("POST", "/api/deposit/txid", data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Deposit Submitted!",
        description: data.message || "Your transaction is being verified on the blockchain",
        variant: "default",
      });
      
      setDepositAmount("");
      setTransactionHash("");
      
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      
      setTimeout(() => {
        refetchTransactions();
      }, 500);
    },
    onError: (error) => {
      console.error("Deposit with TXID error:", error);
      toast({
        title: "Deposit submission failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const withdrawMutation = useMutation({
    mutationFn: async (data: typeof withdrawalData) => {
      const response = await apiRequest("POST", "/api/withdraw", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Withdrawal request submitted",
        description: "Your withdrawal will be processed within 24 hours",
      });
      setWithdrawalData({ cryptocurrency: "USDT TRC20", walletAddress: "", amount: "", network: "TRC20", type: "withdrawal" });
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
    },
    onError: (error) => {
      toast({
        title: "Withdrawal failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "Address copied successfully",
    });
  };

  const handleDeposit = () => {
    if (!depositAmount) {
      toast({
        title: "Missing amount",
        description: "Please enter the deposit amount",
        variant: "destructive",
      });
      return;
    }

    const amount = parseFloat(depositAmount);
    if (amount <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid deposit amount",
        variant: "destructive",
      });
      return;
    }

    if (depositMethod === "txid") {
      if (!transactionHash) {
        toast({
          title: "Missing transaction hash",
          description: "Please enter the transaction ID (TXID) from your wallet",
          variant: "destructive",
        });
        return;
      }

      depositWithTxidMutation.mutate({
        amount: depositAmount,
        cryptocurrency: selectedCrypto,
        network: depositNetwork,
        transactionHash: transactionHash,
      });
    } else {
      if (!proofFile) {
        toast({
          title: "Missing proof",
          description: "Please upload proof of deposit",
          variant: "destructive",
        });
        return;
      }

      const formData = new FormData();
      formData.append('cryptocurrency', selectedCrypto);
      formData.append('amount', depositAmount);
      formData.append('network', depositNetwork);
      formData.append('type', 'deposit');
      formData.append('proofFile', proofFile);

      depositMutation.mutate(formData);
    }
  };

  const handleWithdrawal = () => {
    if (!withdrawalData.walletAddress || !withdrawalData.amount) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const amount = parseFloat(withdrawalData.amount);
    if (amount <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid withdrawal amount",
        variant: "destructive",
      });
      return;
    }

    withdrawMutation.mutate({
      cryptocurrency: withdrawalData.cryptocurrency,
      walletAddress: withdrawalData.walletAddress,
      amount: withdrawalData.amount,
      network: withdrawalData.network,
      type: "withdrawal"
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-[var(--kucoin-success)]/20 text-[var(--kucoin-success)]";
      case "pending":
        return "bg-[var(--kucoin-warning)]/20 text-[var(--kucoin-warning)]";
      case "failed":
        return "bg-[var(--kucoin-danger)]/20 text-[var(--kucoin-danger)]";
      default:
        return "bg-[var(--kucoin-dark-300)] text-[var(--kucoin-dark-100)]";
    }
  };

  return (
    <div className="space-y-6">
      {/* Cryptocurrency Selection */}
      <Card className="dark-surface border-[var(--kucoin-dark-300)]">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-white">
            Select Cryptocurrency
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {['USDT', 'TRX', 'ETH', 'BTC'].map((crypto) => (
              <Button
                key={crypto}
                variant={selectedCrypto === crypto ? "default" : "outline"}
                onClick={() => {
                  setSelectedCrypto(crypto);
                  setWithdrawalData(prev => ({
                    ...prev,
                    cryptocurrency: crypto,
                    network: getNetworkOptions()[0]?.value || "TRC20"
                  }));
                }}
                className={`
                  ${selectedCrypto === crypto 
                    ? 'bg-[var(--kucoin-primary)] hover:bg-[var(--kucoin-primary)]/80 text-white' 
                    : 'bg-[var(--kucoin-dark-400)] border-[var(--kucoin-dark-200)] text-white hover:bg-[var(--kucoin-dark-300)]'
                  }
                `}
              >
                {crypto}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Deposit Section */}
        <Card className="dark-surface border-[var(--kucoin-dark-300)]">
          <CardHeader>
            <CardTitle className="text-md font-semibold text-white flex items-center">
              <ArrowDownCircle className="h-5 w-5 mr-2 text-[var(--kucoin-success)]" />
              Deposit {selectedCrypto}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="block text-sm font-medium text-[var(--kucoin-dark-100)] mb-2">
                Network
              </Label>
              <Select value={depositNetwork} onValueChange={setDepositNetwork}>
                <SelectTrigger className="bg-[var(--kucoin-dark-400)] border-[var(--kucoin-dark-200)] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[var(--kucoin-dark-400)] border-[var(--kucoin-dark-200)]">
                  {getNetworkOptions().map((option) => (
                    <SelectItem key={option.value} value={option.value} className="text-white">
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label className="block text-sm font-medium text-[var(--kucoin-dark-100)] mb-2">
                Deposit Address
              </Label>
              <div className="relative">
                <Input
                  value={getDepositAddress()}
                  readOnly
                  className="bg-[var(--kucoin-dark-400)] border-[var(--kucoin-dark-200)] text-white pr-12"
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copyToClipboard(getDepositAddress())}
                  className="absolute right-1 top-1 h-8 w-8 p-0 text-[var(--kucoin-primary)] hover:text-[var(--kucoin-secondary)]"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div>
              <Label className="block text-sm font-medium text-[var(--kucoin-dark-100)] mb-2">
                Deposit Amount
              </Label>
              <Input
                type="number"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                placeholder={`Enter ${selectedCrypto} amount`}
                className="bg-[var(--kucoin-dark-400)] border-[var(--kucoin-dark-200)] text-white placeholder-[var(--kucoin-dark-100)]"
                data-testid="input-deposit-amount"
              />
            </div>

            <div>
              <Label className="block text-sm font-medium text-[var(--kucoin-dark-100)] mb-2">
                Verification Method
              </Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={depositMethod === "proof" ? "default" : "outline"}
                  onClick={() => setDepositMethod("proof")}
                  className={depositMethod === "proof" 
                    ? "flex-1 bg-[var(--kucoin-primary)] text-white" 
                    : "flex-1 bg-[var(--kucoin-dark-400)] border-[var(--kucoin-dark-200)] text-[var(--kucoin-dark-100)]"
                  }
                  data-testid="button-deposit-method-proof"
                >
                  Upload Proof
                </Button>
                <Button
                  type="button"
                  variant={depositMethod === "txid" ? "default" : "outline"}
                  onClick={() => setDepositMethod("txid")}
                  className={depositMethod === "txid" 
                    ? "flex-1 bg-[var(--kucoin-primary)] text-white" 
                    : "flex-1 bg-[var(--kucoin-dark-400)] border-[var(--kucoin-dark-200)] text-[var(--kucoin-dark-100)]"
                  }
                  data-testid="button-deposit-method-txid"
                >
                  Enter TXID
                </Button>
              </div>
              <p className="text-xs text-[var(--kucoin-dark-100)] mt-1">
                {depositMethod === "txid" 
                  ? "Enter your transaction hash (TXID) for automatic blockchain verification" 
                  : "Upload a screenshot of your completed transaction"}
              </p>
            </div>

            {depositMethod === "txid" ? (
              <div>
                <Label className="block text-sm font-medium text-[var(--kucoin-dark-100)] mb-2">
                  Transaction Hash (TXID)
                </Label>
                <Input
                  type="text"
                  value={transactionHash}
                  onChange={(e) => setTransactionHash(e.target.value.trim())}
                  placeholder="Enter your transaction hash"
                  className="bg-[var(--kucoin-dark-400)] border-[var(--kucoin-dark-200)] text-white placeholder-[var(--kucoin-dark-100)] font-mono text-sm"
                  data-testid="input-deposit-txid"
                />
                <p className="text-xs text-[var(--kucoin-dark-100)] mt-1">
                  Copy the transaction ID from your wallet after sending the deposit
                </p>
                {transactionHash && (
                  <p className="text-xs text-[var(--kucoin-success)] mt-1">
                    ✓ TXID entered
                  </p>
                )}
              </div>
            ) : (
              <div>
                <Label className="block text-sm font-medium text-[var(--kucoin-dark-100)] mb-2">
                  Proof of Deposit (Required)
                </Label>
                <Input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (file.size > 5 * 1024 * 1024) {
                        toast({
                          title: "File too large",
                          description: "Please upload a file smaller than 5MB",
                          variant: "destructive",
                        });
                        e.target.value = '';
                        return;
                      }
                      setProofFile(file);
                    } else {
                      setProofFile(null);
                    }
                  }}
                  className="bg-[var(--kucoin-dark-400)] border-[var(--kucoin-dark-200)] text-white file:bg-[var(--kucoin-primary)] file:text-white file:border-0 file:rounded file:px-3 file:py-1 file:mr-3"
                  data-testid="input-deposit-proof-file"
                />
                <p className="text-xs text-[var(--kucoin-dark-100)] mt-1">
                  Upload screenshot or receipt of your deposit transaction (JPG, PNG, PDF - Max 5MB)
                </p>
                {proofFile && (
                  <p className="text-xs text-[var(--kucoin-success)] mt-1">
                    ✓ File selected: {proofFile.name}
                  </p>
                )}
              </div>
            )}

            <div className="text-center">
              <div className="bg-white p-4 rounded-lg inline-block">
                {walletAddresses?.qrCodes?.[selectedCrypto] ? (
                  <img 
                    src={walletAddresses.qrCodes[selectedCrypto]!} 
                    alt={`${selectedCrypto} QR Code`}
                    className="w-32 h-32 rounded"
                  />
                ) : (
                  <div className="w-32 h-32 bg-gray-200 flex items-center justify-center rounded">
                    <QrCode className="h-16 w-16 text-gray-500" />
                  </div>
                )}
              </div>
              <p className="text-xs text-[var(--kucoin-dark-100)] mt-2">
                {walletAddresses?.qrCodes?.[selectedCrypto] 
                  ? "Scan QR code to get deposit address" 
                  : "QR code not available - use address above"}
              </p>
            </div>

            <Button
              onClick={handleDeposit}
              disabled={depositMutation.isPending || depositWithTxidMutation.isPending}
              className="w-full bg-[var(--kucoin-success)] hover:bg-[var(--kucoin-success)]/80 text-white"
              data-testid="button-submit-deposit"
            >
              {(depositMutation.isPending || depositWithTxidMutation.isPending) 
                ? "Submitting..." 
                : depositMethod === "txid" 
                  ? `Verify & Submit ${selectedCrypto} Deposit` 
                  : `Submit ${selectedCrypto} Deposit`}
            </Button>
          </CardContent>
        </Card>

        {/* Withdrawal Section */}
        <Card className="dark-surface border-[var(--kucoin-dark-300)]">
          <CardHeader>
            <CardTitle className="text-md font-semibold text-white flex items-center">
              <ArrowUpCircle className="h-5 w-5 mr-2 text-[var(--kucoin-danger)]" />
              Withdraw Cryptocurrency
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="block text-sm font-medium text-[var(--kucoin-dark-100)] mb-2">
                Select Cryptocurrency
              </Label>
              <Select 
                value={withdrawalData.cryptocurrency} 
                onValueChange={(value) => {
                  const selectedOption = getWithdrawalCryptoOptions().find(opt => opt.value === value);
                  setWithdrawalData(prev => ({ 
                    ...prev, 
                    cryptocurrency: value,
                    network: selectedOption?.network || "TRC20"
                  }));
                }}
              >
                <SelectTrigger className="bg-[var(--kucoin-dark-400)] border-[var(--kucoin-dark-200)] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[var(--kucoin-dark-400)] border-[var(--kucoin-dark-200)] max-h-60">
                  {getWithdrawalCryptoOptions().map((option) => (
                    <SelectItem key={option.value} value={option.value} className="text-white">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{option.icon}</span>
                        <div className="flex flex-col">
                          <span className="font-medium">{option.label}</span>
                          <span className="text-xs text-[var(--kucoin-dark-100)]">
                            {option.description} • Fee: {option.fee}
                          </span>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="block text-sm font-medium text-[var(--kucoin-dark-100)] mb-2">
                Wallet Address
              </Label>
              <Input
                value={withdrawalData.walletAddress}
                onChange={(e) => setWithdrawalData(prev => ({ ...prev, walletAddress: e.target.value }))}
                placeholder={`Enter ${withdrawalData.cryptocurrency} wallet address`}
                className="bg-[var(--kucoin-dark-400)] border-[var(--kucoin-dark-200)] text-white placeholder-[var(--kucoin-dark-100)]"
              />
            </div>
            
            <div>
              <Label className="block text-sm font-medium text-[var(--kucoin-dark-100)] mb-2">
                Amount
              </Label>
              <Input
                type="number"
                value={withdrawalData.amount}
                onChange={(e) => setWithdrawalData(prev => ({ ...prev, amount: e.target.value }))}
                placeholder="0.00"
                className="bg-[var(--kucoin-dark-400)] border-[var(--kucoin-dark-200)] text-white placeholder-[var(--kucoin-dark-100)]"
              />
              <div className="mt-1 text-xs text-[var(--kucoin-dark-100)]">
                {(() => {
                  const option = getWithdrawalCryptoOptions().find(opt => opt.value === withdrawalData.cryptocurrency);
                  return option ? `Network: ${option.network} • Fee: ${option.fee} ${option.value.split(' ')[0]}` : '';
                })()}
              </div>
            </div>
            
            <Button
              onClick={handleWithdrawal}
              disabled={withdrawMutation.isPending}
              className="w-full bg-[var(--kucoin-danger)] hover:bg-[var(--kucoin-danger)]/80 text-white"
            >
              {withdrawMutation.isPending ? "Processing..." : "Submit Withdrawal"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Transaction History */}
      <Card className="dark-surface border-[var(--kucoin-dark-300)]">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-white flex items-center">
            <Clock className="h-5 w-5 mr-2" />
            Transaction History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-[var(--kucoin-dark-100)]">No transactions yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--kucoin-dark-300)]">
                    <th className="text-left py-3 px-4 text-[var(--kucoin-dark-100)] text-sm font-medium">
                      Type
                    </th>
                    <th className="text-left py-3 px-4 text-[var(--kucoin-dark-100)] text-sm font-medium">
                      Amount
                    </th>
                    <th className="text-left py-3 px-4 text-[var(--kucoin-dark-100)] text-sm font-medium">
                      Network
                    </th>
                    <th className="text-left py-3 px-4 text-[var(--kucoin-dark-100)] text-sm font-medium">
                      Status
                    </th>
                    <th className="text-left py-3 px-4 text-[var(--kucoin-dark-100)] text-sm font-medium">
                      Date
                    </th>
                    <th className="text-left py-3 px-4 text-[var(--kucoin-dark-100)] text-sm font-medium">
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--kucoin-dark-300)]">
                  {transactions.map((transaction) => (
                    <tr key={transaction.id}>
                      <td className="py-3 px-4">
                        <div className="flex items-center">
                          {transaction.type === "deposit" || transaction.type === "credit" ? (
                            <ArrowDownCircle className="h-4 w-4 text-[var(--kucoin-success)] mr-2" />
                          ) : (
                            <ArrowUpCircle className="h-4 w-4 text-[var(--kucoin-danger)] mr-2" />
                          )}
                          <span className="text-white capitalize">
                            {transaction.type === "credit" ? "Credit Transfer" : transaction.type}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-white">${transaction.amount}</td>
                      <td className="py-3 px-4 text-[var(--kucoin-dark-100)]">
                        {transaction.network || "-"}
                      </td>
                      <td className="py-3 px-4">
                        <Badge className={getStatusColor(transaction.status)}>
                          {transaction.status.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-[var(--kucoin-dark-100)]">
                        {new Date(transaction.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        {transaction.type === "withdrawal" && transaction.status === "approved" && (
                          <WithdrawalReceipt transactionId={transaction.id} />
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
    </div>
  );
}