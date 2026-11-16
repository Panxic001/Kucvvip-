import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { CheckCircle, Copy, Download, FileText, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ReceiptData {
  id: number;
  type: string;
  amount: string;
  cryptocurrency: string;
  network: string | null;
  walletAddress: string | null;
  receiptTxid: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface WithdrawalReceiptProps {
  transactionId: number;
}

export default function WithdrawalReceipt({ transactionId }: WithdrawalReceiptProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const { data: receipt, isLoading } = useQuery<ReceiptData>({
    queryKey: ["/api/transactions", transactionId, "receipt"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/transactions/${transactionId}/receipt`);
      return res.json();
    },
    enabled: open,
  });

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
  };

  const truncateAddress = (addr: string) => {
    if (addr.length <= 16) return addr;
    return `${addr.slice(0, 8)}...${addr.slice(-8)}`;
  };

  const handleDownload = () => {
    if (!receipt) return;
    
    const receiptText = `
═══════════════════════════════════════════════
            KUCOIN VIP - WITHDRAWAL RECEIPT
═══════════════════════════════════════════════

  Status:          APPROVED ✓
  Transaction ID:  #${receipt.id}
  
  Amount:          ${receipt.amount} ${receipt.cryptocurrency}
  Network:         ${receipt.network || 'N/A'}
  
  Destination:     ${receipt.walletAddress || 'N/A'}
  
  TXID:            ${receipt.receiptTxid}
  
  Date:            ${new Date(receipt.createdAt).toLocaleString()}
  Approved:        ${new Date(receipt.updatedAt).toLocaleString()}

═══════════════════════════════════════════════
  This is an official receipt from KUCOIN VIP
  Trading Platform. Transaction verified.
═══════════════════════════════════════════════
`;
    
    const blob = new Blob([receiptText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `KUCOIN_VIP_Receipt_${receipt.id}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Receipt Downloaded",
      description: "Your withdrawal receipt has been saved",
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="ghost"
          className="text-[var(--kucoin-primary)] hover:text-white hover:bg-[var(--kucoin-primary)]/20 gap-1 text-xs px-2 py-1 h-auto"
        >
          <FileText className="h-3 w-3" />
          Receipt
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md p-0 border-0 bg-transparent overflow-hidden">
        <div className="relative">
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: "linear-gradient(180deg, #0a1628 0%, #0d1f3c 30%, #0a1628 100%)",
              border: "1px solid rgba(0, 230, 118, 0.15)",
              boxShadow: "0 0 40px rgba(0, 230, 118, 0.08), 0 25px 50px rgba(0, 0, 0, 0.5)",
            }}
          >
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--kucoin-primary)]"></div>
              </div>
            ) : receipt ? (
              <>
                <div className="relative px-6 pt-8 pb-6 text-center">
                  <div className="absolute top-0 left-0 right-0 h-1" style={{ background: "linear-gradient(90deg, transparent, var(--kucoin-primary), transparent)" }} />
                  
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4" style={{ background: "rgba(0, 230, 118, 0.1)", border: "2px solid rgba(0, 230, 118, 0.3)" }}>
                    <CheckCircle className="h-8 w-8 text-[var(--kucoin-primary)]" />
                  </div>
                  
                  <h2 className="text-xl font-bold text-white mb-1">Withdrawal Successful</h2>
                  <p className="text-[var(--kucoin-dark-100)] text-sm">Your transaction has been processed</p>
                </div>

                <div className="px-6 pb-2">
                  <div className="text-center mb-6">
                    <span className="text-3xl font-bold text-white">{receipt.amount}</span>
                    <span className="text-lg text-[var(--kucoin-primary)] ml-2 font-semibold">{receipt.cryptocurrency}</span>
                  </div>
                </div>

                <div className="mx-6 rounded-xl p-4 mb-4" style={{ background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[var(--kucoin-dark-100)] text-sm">Status</span>
                      <Badge className="bg-[var(--kucoin-primary)]/20 text-[var(--kucoin-primary)] border border-[var(--kucoin-primary)]/30 hover:bg-[var(--kucoin-primary)]/20">
                        APPROVED
                      </Badge>
                    </div>
                    
                    <div className="h-px" style={{ background: "rgba(255, 255, 255, 0.05)" }} />
                    
                    <div className="flex justify-between items-center">
                      <span className="text-[var(--kucoin-dark-100)] text-sm">Network</span>
                      <span className="text-white text-sm font-medium">{receipt.network || "N/A"}</span>
                    </div>
                    
                    <div className="h-px" style={{ background: "rgba(255, 255, 255, 0.05)" }} />
                    
                    <div className="flex justify-between items-center">
                      <span className="text-[var(--kucoin-dark-100)] text-sm">Transaction ID</span>
                      <span className="text-white text-sm font-mono">#{receipt.id}</span>
                    </div>
                    
                    <div className="h-px" style={{ background: "rgba(255, 255, 255, 0.05)" }} />

                    <div className="flex justify-between items-center">
                      <span className="text-[var(--kucoin-dark-100)] text-sm">Date</span>
                      <span className="text-white text-sm">
                        {new Date(receipt.createdAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>

                    <div className="h-px" style={{ background: "rgba(255, 255, 255, 0.05)" }} />
                    
                    <div className="flex justify-between items-center">
                      <span className="text-[var(--kucoin-dark-100)] text-sm">Time</span>
                      <span className="text-white text-sm">
                        {new Date(receipt.createdAt).toLocaleTimeString("en-US", {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                          hour12: false,
                        })} UTC
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mx-6 rounded-xl p-4 mb-4" style={{ background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[var(--kucoin-dark-100)] text-sm">Destination Address</span>
                        {receipt.walletAddress && (
                          <button
                            onClick={() => copyToClipboard(receipt.walletAddress!, "Wallet address")}
                            className="text-[var(--kucoin-primary)] hover:text-white transition-colors"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                      <p className="text-white text-sm font-mono break-all">
                        {receipt.walletAddress ? truncateAddress(receipt.walletAddress) : "N/A"}
                      </p>
                    </div>

                    <div className="h-px" style={{ background: "rgba(255, 255, 255, 0.05)" }} />

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[var(--kucoin-dark-100)] text-sm">TXID</span>
                        <button
                          onClick={() => copyToClipboard(receipt.receiptTxid, "TXID")}
                          className="text-[var(--kucoin-primary)] hover:text-white transition-colors"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <p className="text-white text-xs font-mono break-all leading-relaxed">
                        {receipt.receiptTxid}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mx-6 mb-6">
                  <Button
                    onClick={handleDownload}
                    className="w-full gap-2"
                    style={{
                      background: "linear-gradient(135deg, var(--kucoin-primary), #00b894)",
                      color: "#000",
                      fontWeight: 600,
                    }}
                  >
                    <Download className="h-4 w-4" />
                    Download Receipt
                  </Button>
                </div>

                <div className="px-6 pb-6 text-center">
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <Shield className="h-3.5 w-3.5 text-[var(--kucoin-primary)]" />
                    <span className="text-[var(--kucoin-primary)] text-xs font-semibold">KUCOIN VIP</span>
                  </div>
                  <p className="text-[var(--kucoin-dark-100)] text-[10px]">
                    Official receipt from KUCOIN VIP Trading Platform
                  </p>
                  <p className="text-[var(--kucoin-dark-100)] text-[10px] mt-0.5">
                    Transaction verified and secured
                  </p>
                </div>
              </>
            ) : (
              <div className="text-center py-12 px-6">
                <p className="text-[var(--kucoin-dark-100)]">Receipt not available</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
