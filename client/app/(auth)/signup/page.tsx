"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ArrowvexLogo } from "@/components/ui/arrowvex-logo";
import { useAuth } from "@/hooks/use-auth";
import { Building2, User, Mail, Lock, ArrowRight, AlertCircle, CheckCircle2 } from "lucide-react";

export default function SignupPage() {
  const { register } = useAuth();
  const [companyName, setCompanyName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!companyName || !name || !email || !password) {
      setError("Please fill out all required fields.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    setIsLoading(true);
    try {
      await register(companyName, name, email, password);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create company account. Please try again.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-12 relative transition-colors duration-200">
      {/* Top Header Toggle */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
        <ThemeToggle variant="dropdown" />
      </div>

      <div className="w-full max-w-lg space-y-6">
        {/* Logo Branding */}
        <div className="text-center space-y-2 flex flex-col items-center">
          <Link href="/" className="inline-flex items-center justify-center">
            <ArrowvexLogo size="lg" />
          </Link>
          <p className="text-xs text-muted-foreground">
            Get started with a 14-day free trial of PayPilot for your company
          </p>
        </div>

        {/* Signup Card */}
        <Card className="shadow-lg border-border">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-xl">Create Company Account</CardTitle>
            <CardDescription>
              Register your business and set up the initial Company Owner account
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-danger/10 border border-danger/30 text-danger text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-xs text-foreground space-y-1">
                <div className="font-semibold text-primary flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> Company Owner Onboarding
                </div>
                <p className="text-muted-foreground">
                  You will automatically become the initial Company Owner with full administrative permissions.
                </p>
              </div>

              <Input
                label="Company Name"
                required
                placeholder="Acme Technologies Inc."
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                leftIcon={<Building2 className="w-4 h-4" />}
              />

              <Input
                label="Owner Full Name"
                required
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                leftIcon={<User className="w-4 h-4" />}
                autoComplete="name"
              />

              <Input
                label="Work Email Address"
                type="email"
                required
                placeholder="john@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                leftIcon={<Mail className="w-4 h-4" />}
                autoComplete="email"
              />

              <Input
                label="Password"
                type="password"
                required
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                leftIcon={<Lock className="w-4 h-4" />}
                helperText="Must be at least 8 characters"
                autoComplete="new-password"
              />
            </CardContent>

            <CardFooter className="flex-col space-y-4">
              <Button
                type="submit"
                variant="primary"
                className="w-full"
                isLoading={isLoading}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Create Company & Get Started
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                Already registered your company?{" "}
                <Link href="/login" className="text-primary font-semibold hover:underline">
                  Log In
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
