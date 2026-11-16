import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { LogoIcon } from "@/components/ui/logo";
import { authManager } from "@/lib/auth";

export default function Auth() {
  const [, setLocation] = useLocation();
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    referralCode: "",
  });

  // Check for referral code in URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');
    if (refCode) {
      setFormData(prev => ({ ...prev, referralCode: refCode }));
      setIsLogin(false); // Switch to registration if referral code is present
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isLogin) {
        await authManager.login(formData.email, formData.password);
        toast({
          title: "Login successful",
          description: "Welcome back to KuCoin VIP!",
        });
      } else {
        await authManager.register({
          username: formData.username,
          email: formData.email,
          password: formData.password,
          referralCode: formData.referralCode,
        });
        toast({
          title: "Registration successful",
          description: "Welcome to KuCoin VIP!",
        });
      }
      setLocation("/dashboard");
    } catch (error) {
      toast({
        title: "Authentication failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--kucoin-dark-500)] via-[var(--kucoin-dark-400)] to-[var(--kucoin-dark-300)] flex items-center justify-center p-4">
      <Card className="w-full max-w-md dark-surface border-[var(--kucoin-dark-300)]">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <LogoIcon size="lg" />
          </div>
          <CardTitle className="text-xl font-bold text-white">
            {isLogin ? "Welcome Back" : "Join KuCoin VIP"}
          </CardTitle>
          <p className="text-[var(--kucoin-dark-100)] text-sm">
            {isLogin ? "Sign in to your trading account" : "Create your trading account"}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="username" className="text-[var(--kucoin-dark-100)]">
                  Username
                </Label>
                <Input
                  id="username"
                  name="username"
                  type="text"
                  placeholder="Enter your username"
                  value={formData.username}
                  onChange={handleChange}
                  className="bg-[var(--kucoin-dark-300)] border-[var(--kucoin-dark-200)] text-white placeholder-[var(--kucoin-dark-100)]"
                  required
                />
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[var(--kucoin-dark-100)]">
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleChange}
                className="bg-[var(--kucoin-dark-300)] border-[var(--kucoin-dark-200)] text-white placeholder-[var(--kucoin-dark-100)]"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="text-[var(--kucoin-dark-100)]">
                Password
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                className="bg-[var(--kucoin-dark-300)] border-[var(--kucoin-dark-200)] text-white placeholder-[var(--kucoin-dark-100)]"
                required
              />
            </div>
            
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="referralCode" className="text-[var(--kucoin-dark-100)]">
                  Referral Code (Optional)
                </Label>
                <Input
                  id="referralCode"
                  name="referralCode"
                  type="text"
                  placeholder="Enter referral code"
                  value={formData.referralCode}
                  onChange={handleChange}
                  className="bg-[var(--kucoin-dark-300)] border-[var(--kucoin-dark-200)] text-white placeholder-[var(--kucoin-dark-100)]"
                />
              </div>
            )}
            
            <Button
              type="submit"
              className="w-full gradient-primary text-white hover:opacity-90"
              disabled={isLoading}
            >
              {isLoading ? "Processing..." : (isLogin ? "Sign In" : "Create Account")}
            </Button>
          </form>
          

          
          {isLogin && (
            <div className="mt-4 text-center">
              <Link href="/forgot-password">
                <button
                  type="button"
                  className="text-[var(--kucoin-primary)] hover:text-[var(--kucoin-secondary)] text-sm font-medium"
                >
                  Forgot your password?
                </button>
              </Link>
            </div>
          )}
          
          <div className="mt-6 text-center">
            <p className="text-[var(--kucoin-dark-100)] text-sm">
              {isLogin ? "Don't have an account?" : "Already have an account?"}
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-[var(--kucoin-primary)] hover:text-[var(--kucoin-secondary)] font-medium ml-1"
              >
                {isLogin ? "Register" : "Sign In"}
              </button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
