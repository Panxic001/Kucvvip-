import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileImage, CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react";

interface KycStatus {
  id?: number;
  status: string;
  fullName?: string;
  adminNote?: string;
  submittedAt?: string;
  reviewedAt?: string;
}

export default function KycVerification() {
  const [fullName, setFullName] = useState("");
  const [idFrontImage, setIdFrontImage] = useState<string | null>(null);
  const [idBackImage, setIdBackImage] = useState<string | null>(null);
  const [frontFileName, setFrontFileName] = useState("");
  const [backFileName, setBackFileName] = useState("");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch KYC status
  const { data: kycStatus } = useQuery<KycStatus>({
    queryKey: ["/api/kyc/status"],
  });

  // Submit KYC mutation
  const submitKycMutation = useMutation({
    mutationFn: async (data: { fullName: string; idFrontImage: string; idBackImage: string }) => {
      console.log("Submitting KYC data:", {
        hasFullName: !!data.fullName,
        fullNameLength: data.fullName?.length,
        hasFrontImage: !!data.idFrontImage,
        hasBackImage: !!data.idBackImage,
        frontImageLength: data.idFrontImage?.length,
        backImageLength: data.idBackImage?.length
      });
      
      const response = await apiRequest("POST", "/api/kyc/submit", data);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error("KYC submission failed:", errorData);
        throw new Error(errorData.message || `Server error: ${response.status}`);
      }
      
      return response.json();
    },
    onSuccess: (result) => {
      console.log("KYC submission successful:", result);
      queryClient.invalidateQueries({ queryKey: ["/api/kyc/status"] });
      toast({ 
        title: "KYC verification submitted successfully", 
        description: "Your documents are being reviewed. You'll receive an update soon."
      });
      setFullName("");
      setIdFrontImage(null);
      setIdBackImage(null);
      setFrontFileName("");
      setBackFileName("");
    },
    onError: (error: Error) => {
      console.error("KYC submission error:", error);
      toast({ 
        title: "Failed to submit KYC verification", 
        description: error.message || "Please try again or contact support",
        variant: "destructive" 
      });
    },
  });

  const handleFileUpload = (file: File, type: 'front' | 'back') => {
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      toast({ title: "File size must be less than 10MB", variant: "destructive" });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (type === 'front') {
        setIdFrontImage(result);
        setFrontFileName(file.name);
      } else {
        setIdBackImage(result);
        setBackFileName(file.name);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!fullName.trim()) {
      toast({ title: "Please enter your full name", variant: "destructive" });
      return;
    }
    
    if (!idFrontImage || !idBackImage) {
      toast({ title: "Please upload both front and back photos of your ID", variant: "destructive" });
      return;
    }

    submitKycMutation.mutate({
      fullName: fullName.trim(),
      idFrontImage,
      idBackImage,
    });
  };

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'pending':
        return {
          icon: <Clock className="w-4 h-4" />,
          color: 'text-[var(--kucoin-warning)]',
          label: 'Under Review'
        };
      case 'approved':
        return {
          icon: <CheckCircle className="w-4 h-4" />,
          color: 'text-[var(--kucoin-success)]',
          label: 'Verified'
        };
      case 'rejected':
        return {
          icon: <XCircle className="w-4 h-4" />,
          color: 'text-[var(--kucoin-danger)]',
          label: 'Rejected'
        };
      default:
        return {
          icon: <AlertCircle className="w-4 h-4" />,
          color: 'text-[var(--kucoin-dark-100)]',
          label: 'Not Submitted'
        };
    }
  };

  const statusDisplay = getStatusDisplay(kycStatus?.status || 'not_submitted');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">KYC Verification</h2>
        <Badge 
          variant="outline" 
          className={`${statusDisplay.color} flex items-center gap-2`}
        >
          {statusDisplay.icon}
          {statusDisplay.label}
        </Badge>
      </div>

      {kycStatus?.status === 'approved' && (
        <Card className="bg-[var(--kucoin-success)]/10 border-[var(--kucoin-success)]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-[var(--kucoin-success)]" />
              <div>
                <p className="font-semibold text-[var(--kucoin-success)]">Identity Verified</p>
                <p className="text-sm text-[var(--kucoin-dark-100)]">
                  Your identity has been successfully verified on {new Date(kycStatus.reviewedAt!).toLocaleDateString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {kycStatus?.status === 'rejected' && (
        <div className="space-y-4">
          <Card className="bg-[var(--kucoin-danger)]/10 border-[var(--kucoin-danger)]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <XCircle className="w-6 h-6 text-[var(--kucoin-danger)]" />
                <div className="flex-1">
                  <p className="font-semibold text-[var(--kucoin-danger)]">Verification Rejected</p>
                  <p className="text-sm text-[var(--kucoin-dark-100)]">
                    {kycStatus.adminNote || "Please review your documents and resubmit."}
                  </p>
                  {kycStatus.reviewedAt && (
                    <p className="text-xs text-[var(--kucoin-dark-100)] mt-1">
                      Reviewed on {new Date(kycStatus.reviewedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-[var(--kucoin-dark-400)]/50 border-[var(--kucoin-primary)]/30">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-[var(--kucoin-primary)] mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-[var(--kucoin-primary)] text-sm">Reapplication Available</p>
                  <p className="text-xs text-[var(--kucoin-dark-100)] mt-1">
                    You can submit a new verification request below. Please address the rejection reason mentioned above and ensure all requirements are met.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {kycStatus?.status === 'pending' && (
        <Card className="bg-[var(--kucoin-warning)]/10 border-[var(--kucoin-warning)]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="w-6 h-6 text-[var(--kucoin-warning)]" />
              <div>
                <p className="font-semibold text-[var(--kucoin-warning)]">Under Review</p>
                <p className="text-sm text-[var(--kucoin-dark-100)]">
                  Your documents are being reviewed. This typically takes 1-3 business days.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {(!kycStatus || kycStatus?.status === 'not_submitted' || kycStatus?.status === 'rejected') && (
        <Card className="bg-[var(--kucoin-dark-400)] border-[var(--kucoin-dark-200)]">
          <CardHeader>
            <CardTitle className="text-white">
              {kycStatus?.status === 'rejected' ? 'Resubmit Identity Verification' : 'Submit Identity Verification'}
            </CardTitle>
            <p className="text-sm text-[var(--kucoin-dark-100)]">
              {kycStatus?.status === 'rejected' 
                ? 'Please review the rejection reason above and resubmit your documents with the necessary corrections.'
                : 'Please provide a clear photo of both sides of your government-issued ID and your full legal name.'
              }
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="fullName" className="text-white">Full Legal Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Enter your full name as shown on ID"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="bg-[var(--kucoin-dark-300)] border-[var(--kucoin-dark-200)] text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Front ID Upload */}
                <div>
                  <Label className="text-white">ID Front Side</Label>
                  <div className="mt-2">
                    {idFrontImage ? (
                      <div className="space-y-2">
                        <img 
                          src={idFrontImage} 
                          alt="ID Front" 
                          className="w-full h-40 object-cover rounded-lg border border-[var(--kucoin-dark-200)]"
                        />
                        <p className="text-xs text-[var(--kucoin-dark-100)]">{frontFileName}</p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setIdFrontImage(null);
                            setFrontFileName("");
                          }}
                          className="w-full"
                        >
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-[var(--kucoin-dark-200)] rounded-lg p-6 text-center">
                        <FileImage className="w-8 h-8 mx-auto mb-2 text-[var(--kucoin-dark-100)]" />
                        <p className="text-sm text-[var(--kucoin-dark-100)] mb-2">
                          Upload front side of ID
                        </p>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'front')}
                          className="hidden"
                          id="front-upload"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => document.getElementById('front-upload')?.click()}
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          Choose File
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Back ID Upload */}
                <div>
                  <Label className="text-white">ID Back Side</Label>
                  <div className="mt-2">
                    {idBackImage ? (
                      <div className="space-y-2">
                        <img 
                          src={idBackImage} 
                          alt="ID Back" 
                          className="w-full h-40 object-cover rounded-lg border border-[var(--kucoin-dark-200)]"
                        />
                        <p className="text-xs text-[var(--kucoin-dark-100)]">{backFileName}</p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setIdBackImage(null);
                            setBackFileName("");
                          }}
                          className="w-full"
                        >
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-[var(--kucoin-dark-200)] rounded-lg p-6 text-center">
                        <FileImage className="w-8 h-8 mx-auto mb-2 text-[var(--kucoin-dark-100)]" />
                        <p className="text-sm text-[var(--kucoin-dark-100)] mb-2">
                          Upload back side of ID
                        </p>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'back')}
                          className="hidden"
                          id="back-upload"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => document.getElementById('back-upload')?.click()}
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          Choose File
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-[var(--kucoin-dark-300)] p-4 rounded-lg">
                <h4 className="font-semibold text-white mb-2">Requirements:</h4>
                <ul className="text-sm text-[var(--kucoin-dark-100)] space-y-1">
                  <li>• Government-issued photo ID (Driver's License, Passport, National ID)</li>
                  <li>• High-quality, clear photos with all text readable</li>
                  <li>• Full document visible in frame</li>
                  <li>• No glare or shadows covering important information</li>
                  <li>• File size must be less than 10MB per image</li>
                </ul>
              </div>

              <Button
                type="submit"
                disabled={submitKycMutation.isPending || !fullName.trim() || !idFrontImage || !idBackImage}
                className="w-full bg-[var(--kucoin-primary)] hover:bg-[var(--kucoin-primary)]/80"
              >
                {submitKycMutation.isPending 
                  ? "Submitting..." 
                  : kycStatus?.status === 'rejected' 
                    ? "Resubmit for Verification" 
                    : "Submit for Verification"
                }
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}