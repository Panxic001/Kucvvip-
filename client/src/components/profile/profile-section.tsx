import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { authManager } from "@/lib/auth";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Eye, EyeOff } from "lucide-react";

interface UserProfile {
  id: number;
  username: string;
  email: string;
  fullName?: string;
  mobileNumber?: string;
  avatar?: string;
  walletAddress?: string;
  balance: string;
  referralCode: string;
}

export default function ProfileSection() {
  const user = authManager.getUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [profileData, setProfileData] = useState({
    username: user?.username || "",
    email: user?.email || "",
    fullName: user?.fullName || "",
    mobileNumber: user?.mobileNumber || "",
    walletAddress: user?.walletAddress || "",
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);

  const { data: profile } = useQuery<UserProfile>({
    queryKey: ["/api/profile"],
    initialData: user ? {
      id: user.id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      walletAddress: user.walletAddress,
      balance: user.balance,
      referralCode: user.referralCode,
    } : undefined,
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: typeof profileData) => {
      const response = await apiRequest("PUT", "/api/profile", data);
      return response.json();
    },
    onSuccess: (updatedProfile) => {
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully",
      });
      authManager.updateUser(updatedProfile);
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
    },
    onError: (error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data: typeof passwordData) => {
      const response = await fetch("/api/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authManager.getToken()}`,
        },
        body: JSON.stringify({
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to change password");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Password changed",
        description: "Your password has been changed successfully",
      });
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setIsPasswordDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Password change failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleUpdateProfile = () => {
    updateProfileMutation.mutate(profileData);
  };

  const handleChangePassword = () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "Password mismatch",
        description: "New password and confirmation do not match",
        variant: "destructive",
      });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters long",
        variant: "destructive",
      });
      return;
    }

    changePasswordMutation.mutate(passwordData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProfileData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="dark-surface border-[var(--kucoin-dark-300)]">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-white">Profile Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Profile Picture */}
          <div className="text-center">
            <div className="w-20 h-20 gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-semibold text-xl">
                {user?.username?.charAt(0).toUpperCase() || "U"}
              </span>
            </div>
            <Button variant="outline" size="sm" className="border-[var(--kucoin-dark-200)] text-[var(--kucoin-dark-100)]">
              Change Avatar
            </Button>
          </div>

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="username" className="text-[var(--kucoin-dark-100)]">Username</Label>
              <Input
                id="username"
                name="username"
                value={profileData.username}
                onChange={handleChange}
                className="bg-[var(--kucoin-dark-300)] border-[var(--kucoin-dark-200)] text-white"
              />
            </div>
            
            <div>
              <Label htmlFor="email" className="text-[var(--kucoin-dark-100)]">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={profileData.email}
                onChange={handleChange}
                className="bg-[var(--kucoin-dark-300)] border-[var(--kucoin-dark-200)] text-white"
              />
            </div>
          </div>

          {/* Personal Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="fullName" className="text-[var(--kucoin-dark-100)]">Full Name</Label>
              <Input
                id="fullName"
                name="fullName"
                value={profileData.fullName}
                onChange={handleChange}
                placeholder="Enter your full name"
                className="bg-[var(--kucoin-dark-300)] border-[var(--kucoin-dark-200)] text-white placeholder-[var(--kucoin-dark-100)]"
              />
            </div>
            
            <div>
              <Label htmlFor="mobileNumber" className="text-[var(--kucoin-dark-100)]">Mobile Number</Label>
              <Input
                id="mobileNumber"
                name="mobileNumber"
                value={profileData.mobileNumber}
                onChange={handleChange}
                placeholder="+1234567890"
                className="bg-[var(--kucoin-dark-300)] border-[var(--kucoin-dark-200)] text-white placeholder-[var(--kucoin-dark-100)]"
              />
            </div>
          </div>

          {/* Wallet Address */}
          <div>
            <Label htmlFor="walletAddress" className="text-[var(--kucoin-dark-100)]">Wallet Address</Label>
            <Input
              id="walletAddress"
              name="walletAddress"
              value={profileData.walletAddress}
              onChange={handleChange}
              placeholder="Enter your USDT wallet address"
              className="bg-[var(--kucoin-dark-300)] border-[var(--kucoin-dark-200)] text-white placeholder-[var(--kucoin-dark-100)]"
            />
          </div>

          {/* Account Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-[var(--kucoin-dark-100)]">Balance</Label>
              <Input
                value={`$${profile?.balance || "0.00"}`}
                readOnly
                className="bg-[var(--kucoin-dark-400)] border-[var(--kucoin-dark-200)] text-[var(--kucoin-primary)]"
              />
            </div>
            
            <div>
              <Label className="text-[var(--kucoin-dark-100)]">Referral Code</Label>
              <Input
                value={profile?.referralCode || ""}
                readOnly
                className="bg-[var(--kucoin-dark-400)] border-[var(--kucoin-dark-200)] text-[var(--kucoin-primary)]"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-4">
            <Button
              onClick={handleUpdateProfile}
              disabled={updateProfileMutation.isPending}
              className="gradient-primary text-white hover:opacity-90"
            >
              {updateProfileMutation.isPending ? "Updating..." : "Update Profile"}
            </Button>
            
            <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="border-[var(--kucoin-dark-200)] text-[var(--kucoin-dark-100)] hover:bg-[var(--kucoin-dark-300)]"
                >
                  Change Password
                </Button>
              </DialogTrigger>
              <DialogContent className="dark-surface border-[var(--kucoin-dark-300)]">
                <DialogHeader>
                  <DialogTitle className="text-white">Change Password</DialogTitle>
                  <DialogDescription className="text-[var(--kucoin-dark-100)]">
                    Enter your current password and choose a new password
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="currentPassword" className="text-[var(--kucoin-dark-100)]">
                      Current Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="currentPassword"
                        name="currentPassword"
                        type={showCurrentPassword ? "text" : "password"}
                        value={passwordData.currentPassword}
                        onChange={handlePasswordChange}
                        className="bg-[var(--kucoin-dark-300)] border-[var(--kucoin-dark-200)] text-white pr-10"
                        placeholder="Enter current password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      >
                        {showCurrentPassword ? (
                          <EyeOff className="h-4 w-4 text-[var(--kucoin-dark-100)]" />
                        ) : (
                          <Eye className="h-4 w-4 text-[var(--kucoin-dark-100)]" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="newPassword" className="text-[var(--kucoin-dark-100)]">
                      New Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        name="newPassword"
                        type={showNewPassword ? "text" : "password"}
                        value={passwordData.newPassword}
                        onChange={handlePasswordChange}
                        className="bg-[var(--kucoin-dark-300)] border-[var(--kucoin-dark-200)] text-white pr-10"
                        placeholder="Enter new password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                      >
                        {showNewPassword ? (
                          <EyeOff className="h-4 w-4 text-[var(--kucoin-dark-100)]" />
                        ) : (
                          <Eye className="h-4 w-4 text-[var(--kucoin-dark-100)]" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="confirmPassword" className="text-[var(--kucoin-dark-100)]">
                      Confirm New Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        value={passwordData.confirmPassword}
                        onChange={handlePasswordChange}
                        className="bg-[var(--kucoin-dark-300)] border-[var(--kucoin-dark-200)] text-white pr-10"
                        placeholder="Confirm new password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4 text-[var(--kucoin-dark-100)]" />
                        ) : (
                          <Eye className="h-4 w-4 text-[var(--kucoin-dark-100)]" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="flex space-x-2 pt-4">
                    <Button
                      onClick={handleChangePassword}
                      disabled={changePasswordMutation.isPending}
                      className="gradient-primary text-white hover:opacity-90 flex-1"
                    >
                      {changePasswordMutation.isPending ? "Changing..." : "Change Password"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setIsPasswordDialogOpen(false)}
                      className="border-[var(--kucoin-dark-200)] text-[var(--kucoin-dark-100)]"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
