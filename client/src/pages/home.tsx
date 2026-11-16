import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/ui/logo";
import { TrendingUp, Shield, Users, Zap } from "lucide-react";
import { authManager } from "@/lib/auth";
import { useEffect } from "react";

export default function Home() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (authManager.isAuthenticated()) {
      setLocation("/dashboard");
    }
  }, [setLocation]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--kucoin-dark-500)] via-[var(--kucoin-dark-400)] to-[var(--kucoin-dark-300)]">
      {/* Header */}
      <header className="border-b border-[var(--kucoin-dark-300)] bg-[var(--kucoin-dark-400)]">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Logo size="md" />
          <div className="space-x-4">
            <Button
              variant="outline"
              onClick={() => setLocation("/auth")}
              className="border-[var(--kucoin-primary)] text-[var(--kucoin-primary)] hover:bg-[var(--kucoin-primary)] hover:text-white"
            >
              Login
            </Button>
            <Button
              onClick={() => setLocation("/auth")}
              className="gradient-primary text-white hover:opacity-90"
            >
              Register
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <h1 className="text-5xl font-bold text-white mb-6">
            KUCOIN VIP
            <span className="gradient-text block">Trading Platform</span>
          </h1>
          <p className="text-xl text-[var(--kucoin-dark-100)] mb-8 max-w-2xl mx-auto">
            Experience advanced trading with real-time market data, in-depth analytics, 
            and a powerful referral system designed to reward every connection.
          </p>
          <div className="space-x-4">
            <Button
              onClick={() => setLocation("/auth")}
              size="lg"
              className="gradient-primary text-white hover:opacity-90 px-8 py-3"
            >
              Start Trading Now
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="border-[var(--kucoin-primary)] text-[var(--kucoin-primary)] hover:bg-[var(--kucoin-primary)] hover:text-white px-8 py-3"
            >
              Learn More
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            Why Choose KUCOIN VIP?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="dark-surface border-[var(--kucoin-dark-300)]">
              <CardHeader>
                <TrendingUp className="h-10 w-10 text-[var(--kucoin-primary)] mb-4" />
                <CardTitle className="text-white">Live Trading</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-[var(--kucoin-dark-100)]">
                  Real-time market trading with countdown timers and instant results for every position placed.
                </p>
              </CardContent>
            </Card>

            <Card className="dark-surface border-[var(--kucoin-dark-300)]">
              <CardHeader>
                <Shield className="h-10 w-10 text-[var(--kucoin-primary)] mb-4" />
                <CardTitle className="text-white">Secure Platform</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-[var(--kucoin-dark-100)]">
                  Bank-level security with encrypted transactions and secure wallet management
                </p>
              </CardContent>
            </Card>

            <Card className="dark-surface border-[var(--kucoin-dark-300)]">
              <CardHeader>
                <Users className="h-10 w-10 text-[var(--kucoin-primary)] mb-4" />
                <CardTitle className="text-white">Referral System</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-[var(--kucoin-dark-100)]">
                  Earn rewards by inviting friends and building your trading network
                </p>
              </CardContent>
            </Card>

            <Card className="dark-surface border-[var(--kucoin-dark-300)]">
              <CardHeader>
                <Zap className="h-10 w-10 text-[var(--kucoin-primary)] mb-4" />
                <CardTitle className="text-white">Fast Execution</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-[var(--kucoin-dark-100)]">
                  Lightning-fast trade execution with minimal latency
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-4 bg-[var(--kucoin-dark-400)]">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold gradient-text mb-2">10,000+</div>
              <p className="text-[var(--kucoin-dark-100)]">Active Traders</p>
            </div>
            <div>
              <div className="text-4xl font-bold gradient-text mb-2">$5M+</div>
              <p className="text-[var(--kucoin-dark-100)]">Trading Volume</p>
            </div>
            <div>
              <div className="text-4xl font-bold gradient-text mb-2">99.9%</div>
              <p className="text-[var(--kucoin-dark-100)]">Uptime</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-[var(--kucoin-dark-300)] bg-[var(--kucoin-dark-500)]">
        <div className="container mx-auto text-center">
          <div className="flex justify-center mb-4">
            <Logo size="sm" />
          </div>
          <p className="text-[var(--kucoin-dark-100)]">
            © 2017 KUCOIN VIP. All rights reserved. Trading platform.
          </p>
        </div>
      </footer>
    </div>
  );
}
