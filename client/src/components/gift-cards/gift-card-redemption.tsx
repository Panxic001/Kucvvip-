import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Gift, Upload, Clock, CheckCircle, XCircle, CreditCard, ArrowRightLeft, Zap } from "lucide-react";
import { GIFT_CARD_TYPES, GIFT_CARD_CURRENCIES, GIFT_CARD_FORMATS } from "@shared/schema";

const PROCESSING_FEE_RATE = 0.05;

const GIFT_CARD_ICONS: Record<string, string> = {
  "Amazon Gift Card": "🛒",
  "Apple App Store & iTunes Gift Card": "🍎",
  "Google Play Gift Card": "▶️",
  "Visa Prepaid Gift Card": "💳",
  "Mastercard Prepaid Gift Card": "💳",
  "Steam Gift Card": "🎮",
  "PlayStation Store Gift Card": "🎮",
  "Xbox Gift Card": "🎮",
  "Netflix Gift Card": "🎬",
  "Spotify Gift Card": "🎵",
  "Razer Gold Gift Card": "🐍",
};

interface GiftCardRecord {
  id: number;
  giftCardType: string;
  giftCardCurrency: string;
  giftCardFormat: string;
  giftCardAmount: string;
  amountUsd: string | null;
  usdtCredited: string | null;
  processingFee: string | null;
  exchangeRate: string | null;
  status: string;
  createdAt: string;
  adminNote?: string;
}

export default function GiftCardRedemption() {
  const [giftCardType, setGiftCardType] = useState("");
  const [giftCardCode, setGiftCardCode] = useState("");
  const [giftCardCurrency, setGiftCardCurrency] = useState("");
  const [giftCardFormat, setGiftCardFormat] = useState("");
  const [giftCardAmount, setGiftCardAmount] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [liveRate, setLiveRate] = useState<number | null>(null);
  const [rateLoading, setRateLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!giftCardCurrency || giftCardCurrency === "USD") {
      setLiveRate(giftCardCurrency === "USD" ? 1 : null);
      return;
    }
    setRateLoading(true);
    const token = localStorage.getItem("auth_token");
    fetch(`/api/exchange-rate/${giftCardCurrency}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(data => setLiveRate(data.rate || null))
      .catch(() => setLiveRate(null))
      .finally(() => setRateLoading(false));
  }, [giftCardCurrency]);

  const { data: giftCards = [], isLoading } = useQuery<GiftCardRecord[]>({
    queryKey: ['/api/gift-cards'],
  });

  const submitMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const token = localStorage.getItem("auth_token");
      const res = await fetch("/api/gift-cards", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Submission failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Submitted", description: data.message });
      queryClient.invalidateQueries({ queryKey: ['/api/gift-cards'] });
      setGiftCardType("");
      setGiftCardCode("");
      setGiftCardCurrency("");
      setGiftCardFormat("");
      setGiftCardAmount("");
      setImageFile(null);
      setLiveRate(null);
      const fileInput = document.getElementById('gift-card-image') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!giftCardType || !giftCardCode || !giftCardCurrency || !giftCardFormat || !giftCardAmount || !imageFile) {
      toast({ title: "Error", description: "Please fill in all fields and upload an image", variant: "destructive" });
      return;
    }
    const amount = parseFloat(giftCardAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: "Error", description: "Please enter a valid amount", variant: "destructive" });
      return;
    }
    const formData = new FormData();
    formData.append("giftCardType", giftCardType);
    formData.append("giftCardCode", giftCardCode);
    formData.append("giftCardCurrency", giftCardCurrency);
    formData.append("giftCardFormat", giftCardFormat);
    formData.append("giftCardAmount", giftCardAmount);
    formData.append("image", imageFile);
    submitMutation.mutate(formData);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-yellow-600/20 text-yellow-400 border-yellow-600"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
      case "approved":
        return <Badge className="bg-green-600/20 text-green-400 border-green-600"><CheckCircle className="w-3 h-3 mr-1" /> Approved</Badge>;
      case "declined":
        return <Badge className="bg-red-600/20 text-red-400 border-red-600"><XCircle className="w-3 h-3 mr-1" /> Declined</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const parsedAmount = parseFloat(giftCardAmount) || 0;
  const conversionValue = liveRate ? parsedAmount * liveRate : 0;
  const processingFee = conversionValue * PROCESSING_FEE_RATE;
  const youWillReceive = conversionValue - processingFee;
  const showPreview = giftCardCurrency && liveRate !== null && parsedAmount > 0;
  const showSummary = giftCardType && giftCardFormat && giftCardCurrency && parsedAmount > 0 && liveRate !== null;

  return (
    <div className="space-y-6">
      <Card className="bg-[var(--kucoin-dark-400)] border-[var(--kucoin-dark-200)]">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Gift className="w-5 h-5 text-[var(--kucoin-primary)]" />
            Gift Card Redemption
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="text-[var(--kucoin-dark-100)]">Select Gift Card Type</Label>
              <Select value={giftCardType} onValueChange={setGiftCardType}>
                <SelectTrigger className="bg-[var(--kucoin-dark-500)] border-[var(--kucoin-dark-300)] text-white mt-1">
                  <SelectValue placeholder="Choose a gift card type" />
                </SelectTrigger>
                <SelectContent className="bg-[var(--kucoin-dark-400)] border-[var(--kucoin-dark-300)]">
                  {GIFT_CARD_TYPES.map((type) => (
                    <SelectItem key={type} value={type} className="text-white hover:bg-[var(--kucoin-dark-300)]">
                      <span className="flex items-center gap-2">
                        <span>{GIFT_CARD_ICONS[type] || "🎁"}</span>
                        <span>{type}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-[var(--kucoin-dark-100)]">Gift Card Format</Label>
              <Select value={giftCardFormat} onValueChange={setGiftCardFormat}>
                <SelectTrigger className="bg-[var(--kucoin-dark-500)] border-[var(--kucoin-dark-300)] text-white mt-1">
                  <SelectValue placeholder="Select format" />
                </SelectTrigger>
                <SelectContent className="bg-[var(--kucoin-dark-400)] border-[var(--kucoin-dark-300)]">
                  {GIFT_CARD_FORMATS.map((format) => (
                    <SelectItem key={format} value={format} className="text-white hover:bg-[var(--kucoin-dark-300)]">
                      {format}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-[var(--kucoin-dark-100)]">Gift Card Code / Number</Label>
              <Input
                value={giftCardCode}
                onChange={(e) => setGiftCardCode(e.target.value)}
                placeholder="Enter gift card code"
                className="bg-[var(--kucoin-dark-500)] border-[var(--kucoin-dark-300)] text-white mt-1"
              />
            </div>

            <div>
              <Label className="text-[var(--kucoin-dark-100)]">Gift Card Currency</Label>
              <Select value={giftCardCurrency} onValueChange={setGiftCardCurrency}>
                <SelectTrigger className="bg-[var(--kucoin-dark-500)] border-[var(--kucoin-dark-300)] text-white mt-1">
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent className="bg-[var(--kucoin-dark-400)] border-[var(--kucoin-dark-300)]">
                  {GIFT_CARD_CURRENCIES.map((curr) => (
                    <SelectItem key={curr.code} value={curr.code} className="text-white hover:bg-[var(--kucoin-dark-300)]">
                      {curr.code} - {curr.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-[var(--kucoin-dark-100)]">Amount (In Selected Currency)</Label>
              <Input
                type="number"
                min="1"
                step="0.01"
                value={giftCardAmount}
                onChange={(e) => setGiftCardAmount(e.target.value)}
                placeholder={giftCardCurrency ? `Enter amount in ${giftCardCurrency}` : "Enter amount"}
                className="bg-[var(--kucoin-dark-500)] border-[var(--kucoin-dark-300)] text-white mt-1"
              />
              {rateLoading && (
                <p className="text-[var(--kucoin-dark-100)] text-xs mt-2">Fetching live rate...</p>
              )}
            </div>

            {showPreview && (
              <div className="p-4 bg-[var(--kucoin-dark-500)] rounded-lg border border-[var(--kucoin-dark-300)] space-y-2">
                <div className="flex items-center gap-2 mb-3">
                  <ArrowRightLeft className="w-4 h-4 text-[var(--kucoin-primary)]" />
                  <span className="text-sm text-[var(--kucoin-dark-100)]">
                    Current Rate: 1 {giftCardCurrency} ≈ {liveRate!.toFixed(4)} USD (Live)
                  </span>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--kucoin-dark-100)]">Gift Card Value:</span>
                    <span className="text-white font-medium">{parsedAmount.toFixed(2)} {giftCardCurrency}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--kucoin-dark-100)]">Conversion Value:</span>
                    <span className="text-white font-medium">{conversionValue.toFixed(2)} USDT</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--kucoin-dark-100)]">Processing Fee (5%):</span>
                    <span className="text-red-400 font-medium">-{processingFee.toFixed(2)} USDT</span>
                  </div>
                  <div className="border-t border-[var(--kucoin-dark-300)] pt-1.5 mt-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-[var(--kucoin-primary)] font-semibold">You Will Receive:</span>
                      <span className="text-[var(--kucoin-primary)] font-bold">{youWillReceive.toFixed(2)} USDT</span>
                    </div>
                  </div>
                </div>
                <p className="text-[var(--kucoin-dark-100)] text-xs mt-2 italic">
                  Preview only — final conversion happens at time of admin approval.
                </p>
              </div>
            )}

            <div>
              <Label className="text-[var(--kucoin-dark-100)]">Upload Gift Card Image (JPG, PNG)</Label>
              <Input
                id="gift-card-image"
                type="file"
                accept=".jpg,.jpeg,.png"
                onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                className="bg-[var(--kucoin-dark-500)] border-[var(--kucoin-dark-300)] text-white mt-1 file:text-white file:bg-[var(--kucoin-dark-300)] file:border-0 file:mr-4 file:py-1 file:px-3 file:rounded"
              />
              {imageFile && (
                <p className="text-xs text-green-400 mt-1 flex items-center gap-1">
                  <Upload className="w-3 h-3" /> {imageFile.name}
                </p>
              )}
            </div>

            {showSummary && (
              <div className="relative p-4 rounded-xl border border-[var(--kucoin-primary)]/50 bg-gradient-to-br from-[var(--kucoin-primary)]/10 to-[var(--kucoin-dark-500)] overflow-hidden">
                <div className="absolute inset-0 rounded-xl border border-[var(--kucoin-primary)]/30 animate-pulse pointer-events-none" />
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="w-5 h-5 text-[var(--kucoin-primary)]" />
                  <span className="text-white font-semibold text-sm">You are redeeming:</span>
                </div>
                <div className="space-y-1.5 text-sm">
                  <p className="text-white">
                    <span className="text-2xl mr-2">{GIFT_CARD_ICONS[giftCardType] || "🎁"}</span>
                    {giftCardType}
                  </p>
                  <p className="text-[var(--kucoin-dark-100)]">{giftCardFormat}</p>
                  <p className="text-white font-bold text-lg">{parsedAmount.toFixed(2)} {giftCardCurrency}</p>
                  <p className="text-[var(--kucoin-primary)] font-bold text-lg">
                    Estimated: {youWillReceive.toFixed(2)} USDT
                  </p>
                </div>
              </div>
            )}

            <Button
              type="submit"
              disabled={submitMutation.isPending}
              className="w-full bg-[var(--kucoin-primary)] hover:bg-[var(--kucoin-primary)]/80 text-white"
            >
              {submitMutation.isPending ? "Submitting..." : "Submit Gift Card"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="bg-[var(--kucoin-dark-400)] border-[var(--kucoin-dark-200)]">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            My Gift Card History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-[var(--kucoin-dark-100)]">Loading...</p>
          ) : giftCards.length === 0 ? (
            <p className="text-[var(--kucoin-dark-100)]">No gift card submissions yet.</p>
          ) : (
            <div className="space-y-3">
              {giftCards.map((card) => (
                <div key={card.id} className="bg-[var(--kucoin-dark-500)] rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{GIFT_CARD_ICONS[card.giftCardType] || "🎁"}</span>
                      <div>
                        <p className="text-white font-medium">{card.giftCardType}</p>
                        <p className="text-[var(--kucoin-dark-100)] text-sm">
                          {parseFloat(card.giftCardAmount).toFixed(2)} {card.giftCardCurrency}
                          {card.giftCardFormat && <span className="ml-2 text-xs">({card.giftCardFormat})</span>}
                        </p>
                        {card.status === "approved" && card.usdtCredited && (
                          <div className="mt-1">
                            <p className="text-green-400 text-sm font-medium">
                              +{parseFloat(card.usdtCredited).toFixed(2)} USDT credited
                            </p>
                            {card.processingFee && (
                              <p className="text-[var(--kucoin-dark-100)] text-xs">
                                Fee: -{parseFloat(card.processingFee).toFixed(2)} USDT
                                {card.exchangeRate && ` | Rate: ${parseFloat(card.exchangeRate).toFixed(4)}`}
                              </p>
                            )}
                          </div>
                        )}
                        <p className="text-[var(--kucoin-dark-100)] text-xs">
                          {new Date(card.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      {getStatusBadge(card.status)}
                      {card.adminNote && (
                        <p className="text-xs text-[var(--kucoin-dark-100)] mt-1 max-w-[200px] truncate">
                          Note: {card.adminNote}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
