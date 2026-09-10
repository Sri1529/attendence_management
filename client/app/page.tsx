"use client";

import React, { useState } from "react";
import Link from "next/link";
import { PageContainer } from "@/components/ui/page-container";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ArrowvexLogo } from "@/components/ui/arrowvex-logo";
import { useAuth } from "@/hooks/use-auth";
import {
  Users,
  CalendarCheck2,
  CalendarDays,
  CircleDollarSign,
  Calculator,
  FileSpreadsheet,
  ArrowRight,
  CheckCircle2,
  Menu,
  X,
  Sparkles,
  Shield,
  Clock,
  TrendingUp,
} from "lucide-react";

export default function LandingPage() {
  const { isAuthenticated } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const features = [
    {
      icon: <Users className="w-6 h-6 text-primary" />,
      title: "Employee Management",
      description: "Manage employee records, joining dates, departments, designations, and active/inactive employment statuses in one place.",
    },
    {
      icon: <CalendarCheck2 className="w-6 h-6 text-primary" />,
      title: "Attendance Tracking",
      description: "Track Present, Absent, Half Day, Leave, and Holiday statuses daily with company-isolated duplicate prevention.",
    },
    {
      icon: <CalendarDays className="w-6 h-6 text-primary" />,
      title: "Leave Management",
      description: "Simple leave recording for Casual, Sick, Paid, and Unpaid leave without overwhelming enterprise complexity.",
    },
    {
      icon: <CircleDollarSign className="w-6 h-6 text-primary" />,
      title: "Salaries & Advances",
      description: "Track employee base salaries, effective history, and manage salary advance disbursements with atomic balance deductions.",
    },
    {
      icon: <Calculator className="w-6 h-6 text-primary" />,
      title: "Monthly Payroll Engine",
      description: "Deterministic monthly payroll calculations combining base salary, overtime, bonuses, attendance deductions, and advance repayments.",
    },
    {
      icon: <FileSpreadsheet className="w-6 h-6 text-primary" />,
      title: "Payslips & Audit Logs",
      description: "Generate immutable PDF payslips for finalized periods and maintain clean tenant-level audit trails for operational compliance.",
    },
  ];

  const pricingPlans = [
    {
      name: "Free Trial",
      badge: "14 Days",
      price: "$0",
      period: "for 14 days",
      description: "Explore full attendance and payroll features with no credit card required.",
      features: [
        "Up to 10 Employees",
        "Full Attendance & Leave",
        "Salary Advance Management",
        "Monthly Payroll Calculation",
        "PDF Payslip Generation",
      ],
      buttonText: "Start 14-Day Free Trial",
      buttonVariant: "outline" as const,
    },
    {
      name: "Starter Monthly",
      badge: "Most Popular",
      price: "$29",
      period: "per month",
      description: "Ideal for growing small businesses needing simple monthly payroll and attendance.",
      features: [
        "Up to 50 Employees",
        "Complete Attendance & Leave Tracking",
        "Advance Disbursement & Repayments",
        "Automated Monthly Payroll Engine",
        "Custom Roles & Permissions",
        "Audit Logging",
      ],
      buttonText: "Get Started Now",
      buttonVariant: "primary" as const,
      highlighted: true,
    },
    {
      name: "Business Annual",
      badge: "Save 20%",
      price: "$24",
      period: "per month, billed yearly",
      description: "Designed for established companies looking for streamlined team salary administration.",
      features: [
        "Unlimited Employees",
        "Multi-User & Role Management",
        "Priority Support & Data Export",
        "Complete Payroll & Advance Ledger",
        "Immutable Historical Records",
      ],
      buttonText: "Contact for Plan",
      buttonVariant: "outline" as const,
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-200">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-40">
        <PageContainer maxWidth="xl" className="py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <ArrowvexLogo size="md" />
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Features
            </a>
            <a href="#preview" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Product Preview
            </a>
            <a href="#pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Pricing
            </a>
          </nav>

          {/* Desktop Right Actions */}
          <div className="hidden md:flex items-center gap-3">
            <ThemeToggle variant="dropdown" />
            {isAuthenticated ? (
              <Link href="/dashboard">
                <Button variant="primary" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
                  Go to Dashboard
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" size="sm">
                    Login
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button variant="primary" size="sm">
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            <ThemeToggle variant="dropdown" />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary focus:outline-none"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </PageContainer>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-border bg-card px-4 py-4 space-y-3 animate-in slide-in-from-top-2">
            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-medium text-foreground py-1.5"
            >
              Features
            </a>
            <a
              href="#preview"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-medium text-foreground py-1.5"
            >
              Product Preview
            </a>
            <a
              href="#pricing"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-medium text-foreground py-1.5"
            >
              Pricing
            </a>
            <div className="pt-2 border-t border-border flex flex-col gap-2">
              {isAuthenticated ? (
                <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="primary" className="w-full">
                    Go to Dashboard
                  </Button>
                </Link>
              ) : (
                <>
                  <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="outline" className="w-full">
                      Login
                    </Button>
                  </Link>
                  <Link href="/signup" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="primary" className="w-full">
                      Get Started
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="py-16 md:py-24 overflow-hidden">
        <PageContainer maxWidth="xl">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Multi-Tenant Attendance & Salary SaaS</span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-foreground tracking-tight leading-tight">
              Simple attendance and payroll management for your business.
            </h1>

            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Streamline employee records, daily attendance, leave approvals, salary advances, monthly payroll calculations, and PDF payslips in one clean platform.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
              <Link href={isAuthenticated ? "/dashboard" : "/signup"} className="w-full sm:w-auto">
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full sm:w-auto"
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  {isAuthenticated ? "Go to Dashboard" : "Get Started — Free Trial"}
                </Button>
              </Link>
              {!isAuthenticated && (
                <Link href="/login" className="w-full sm:w-auto">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto">
                    Sign In to Account
                  </Button>
                </Link>
              )}
            </div>

            <div className="pt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground font-medium">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-primary" /> Multi-Tenant Isolation
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-primary" /> Atomic Advance Ledger
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-primary" /> Immutable Historical Payroll
              </span>
            </div>
          </div>
        </PageContainer>
      </section>

      {/* Product Visual Preview */}
      <section id="preview" className="py-12 bg-surface border-y border-border">
        <PageContainer maxWidth="xl">
          <div className="text-center mb-8">
            <h2 className="text-xs uppercase tracking-widest text-primary font-bold">
              Visual Product Interface
            </h2>
            <p className="text-xl font-bold text-foreground mt-1">
              Engineered for clarity and speed
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-xl max-w-4xl mx-auto">
            {/* Visual Shell Simulation */}
            <div className="flex items-center justify-between border-b border-border pb-4 mb-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                <span className="text-xs font-mono text-muted-foreground ml-2">
                  Acme Corp — Payroll & Attendance Dashboard
                </span>
              </div>
              <Badge variant="primary">LIVE DEMO PREVIEW</Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="p-4 rounded-xl border border-border bg-secondary/50">
                <div className="flex items-center justify-between text-xs text-muted-foreground font-medium mb-1">
                  <span>Total Employees</span>
                  <Users className="w-4 h-4 text-primary" />
                </div>
                <div className="text-2xl font-bold text-foreground">42</div>
                <div className="text-[11px] text-emerald-500 font-medium mt-1">Active workforce</div>
              </div>

              <div className="p-4 rounded-xl border border-border bg-secondary/50">
                <div className="flex items-center justify-between text-xs text-muted-foreground font-medium mb-1">
                  <span>Today&apos;s Attendance</span>
                  <Clock className="w-4 h-4 text-primary" />
                </div>
                <div className="text-2xl font-bold text-foreground">95.2%</div>
                <div className="text-[11px] text-muted-foreground font-medium mt-1">38 Present / 2 Leave</div>
              </div>

              <div className="p-4 rounded-xl border border-border bg-secondary/50">
                <div className="flex items-center justify-between text-xs text-muted-foreground font-medium mb-1">
                  <span>Monthly Advance Ledger</span>
                  <TrendingUp className="w-4 h-4 text-primary" />
                </div>
                <div className="text-2xl font-bold text-foreground">$1,450.00</div>
                <div className="text-[11px] text-muted-foreground font-medium mt-1">Outstanding deductions</div>
              </div>
            </div>

            <div className="rounded-xl border border-border p-4 bg-background flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                  <Shield className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <div className="text-xs font-semibold text-foreground">August 2026 Payroll Cycle</div>
                  <div className="text-[11px] text-muted-foreground">38 Payslips calculated & ready for finalization</div>
                </div>
              </div>
              <Badge variant="success" showDot>DRAFT READY</Badge>
            </div>
          </div>
        </PageContainer>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16 md:py-20">
        <PageContainer maxWidth="xl">
          <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
            <h2 className="text-xs uppercase tracking-widest text-primary font-bold">
              Core SaaS Modules
            </h2>
            <p className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              Everything required for employee salary operations.
            </p>
            <p className="text-sm text-muted-foreground">
              Built specifically for business owners needing straightforward control without clutter.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feat, idx) => (
              <Card key={idx} hoverable className="transition-all duration-200">
                <CardHeader>
                  <div className="p-2.5 w-fit rounded-xl bg-primary/10 mb-2">
                    {feat.icon}
                  </div>
                  <CardTitle className="text-base">{feat.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {feat.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </PageContainer>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-16 md:py-20 bg-surface border-t border-border">
        <PageContainer maxWidth="xl">
          <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
            <h2 className="text-xs uppercase tracking-widest text-primary font-bold">
              Transparent Subscription Pricing
            </h2>
            <p className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              Simple plans for businesses of all sizes.
            </p>
            <p className="text-sm text-muted-foreground">
              All plans include complete multi-tenant tenant isolation and automated payroll generation.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {pricingPlans.map((plan, idx) => (
              <Card
                key={idx}
                className={`relative flex flex-col justify-between ${
                  plan.highlighted ? "border-primary shadow-lg ring-1 ring-primary" : ""
                }`}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{plan.name}</CardTitle>
                    <Badge variant={plan.highlighted ? "primary" : "neutral"}>
                      {plan.badge}
                    </Badge>
                  </div>
                  <div className="mt-4">
                    <span className="text-3xl font-extrabold text-foreground">{plan.price}</span>
                    <span className="text-xs text-muted-foreground ml-1.5">{plan.period}</span>
                  </div>
                  <CardDescription className="mt-2">{plan.description}</CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="border-t border-border pt-4 space-y-2">
                    {plan.features.map((f, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-foreground">
                        <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>

                <div className="p-6 pt-0 mt-auto">
                  <Link href="/signup">
                    <Button variant={plan.buttonVariant} className="w-full">
                      {plan.buttonText}
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        </PageContainer>
      </section>

      {/* Final CTA */}
      <section className="py-16 md:py-20 bg-primary/5 border-t border-border">
        <PageContainer maxWidth="md" className="text-center space-y-6">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            Ready to simplify attendance and payroll?
          </h2>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto">
            Get started in less than 2 minutes. Create your company, invite team members, and manage your workforce with confidence.
          </p>
          <div className="pt-2">
            <Link href="/signup">
              <Button size="lg" variant="primary" rightIcon={<ArrowRight className="w-4 h-4" />}>
                Get Started Now
              </Button>
            </Link>
          </div>
        </PageContainer>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-8 text-xs text-muted-foreground">
        <PageContainer maxWidth="xl" className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <ArrowvexLogo size="sm" />
          </div>
          <div>
            &copy; {new Date().getFullYear()} PayPilot by ArrowVex. All rights reserved.
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="hover:text-foreground transition-colors">
              Login
            </Link>
            <Link href="/signup" className="hover:text-foreground transition-colors">
              Sign Up
            </Link>
          </div>
        </PageContainer>
      </footer>
    </div>
  );
}
