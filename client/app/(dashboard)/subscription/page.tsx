"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, ColumnDef } from "@/components/ui/data-table";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { ErrorState } from "@/components/ui/error-state";
import { Can } from "@/components/auth/can";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useQueryParams } from "@/hooks/use-query-params";
import { formatCurrency } from "@/lib/utils/format-currency";
import { loadRazorpayScript } from "@/lib/utils/load-razorpay";
import { subscriptionApi } from "@/lib/api/subscription";
import { paymentsApi } from "@/lib/api/payments";
import { Subscription, SubscriptionPlan, SubscriptionStatus } from "@/types/subscription";
import {
  BillingInterval,
  PaymentTransaction,
  PaymentTransactionStatus,
  PaymentHistoryResponse,
  RazorpayCheckoutOptions,
} from "@/types/payment";
import { PermissionCode } from "@/lib/permissions/codes";
import {
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  Ban,
  Receipt,
  Zap,
} from "lucide-react";

export default function SubscriptionPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const { getIntParam, setParam, setParams } = useQueryParams();

  const page = getIntParam("page", 1);
  const limit = getIntParam("limit", 10);

  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [paymentsResponse, setPaymentsResponse] = useState<PaymentHistoryResponse | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isPaymentsLoading, setIsPaymentsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Interval Selector
  const [interval, setInterval] = useState<BillingInterval>(BillingInterval.MONTHLY);

  // Selected Plan for Razorpay Order Confirmation Modal
  const [checkoutPlan, setCheckoutPlan] = useState<SubscriptionPlan | null>(null);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);

  // Cancel Subscription Modal
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);

  const fetchSubscriptionData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [sub, pList] = await Promise.all([
        subscriptionApi.getCurrent().catch(() => null),
        subscriptionApi.getPlans().catch(() => []),
      ]);
      setSubscription(sub);
      setPlans(pList);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load subscription status.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchPayments = useCallback(async () => {
    setIsPaymentsLoading(true);
    try {
      const res = await paymentsApi.getPayments({ page, limit });
      setPaymentsResponse(res);
    } catch {
      // Silent error handling
    } finally {
      setIsPaymentsLoading(false);
    }
  }, [page, limit]);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [sub, pList] = await Promise.all([
          subscriptionApi.getCurrent().catch(() => null),
          subscriptionApi.getPlans().catch(() => []),
        ]);
        if (isMounted) {
          setSubscription(sub);
          setPlans(pList);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to load subscription details.";
        if (isMounted) setError(msg);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setIsPaymentsLoading(true);
      try {
        const res = await paymentsApi.getPayments({ page, limit });
        if (isMounted) setPaymentsResponse(res);
      } catch {
        // Silent error handling
      } finally {
        if (isMounted) setIsPaymentsLoading(false);
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, [page, limit]);

  // Start Trial Action
  const handleStartTrial = async () => {
    try {
      const sub = await subscriptionApi.startTrial();
      toast.success("Trial Started", "14-day free trial activated for your company!");
      setSubscription(sub);
      fetchSubscriptionData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to start trial.";
      toast.error("Action Rejected", msg);
    }
  };

  // Initiate Razorpay Checkout Order
  const handleProceedToRazorpay = async () => {
    if (!checkoutPlan) return;
    setIsCreatingOrder(true);

    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        toast.error("Payment Error", "Failed to load Razorpay Checkout script. Please check your network.");
        setIsCreatingOrder(false);
        return;
      }

      const orderRes = await paymentsApi.createOrder({
        planCode: checkoutPlan.code,
        billingInterval: interval,
      });

      setCheckoutPlan(null); // Close summary modal

      const options: RazorpayCheckoutOptions = {
        key: orderRes.keyId,
        amount: orderRes.amount,
        currency: orderRes.currency,
        name: "Attendance & Salary SaaS",
        description: `${checkoutPlan.name} Plan (${interval})`,
        order_id: orderRes.orderId,
        prefill: {
          name: user?.name,
          email: user?.email,
        },
        theme: {
          color: "#FF5F1F",
        },
        handler: async (response) => {
          setIsVerifyingPayment(true);
          try {
            await paymentsApi.verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            toast.success("Payment Verified", "Your subscription has been activated successfully!");
            fetchSubscriptionData();
            fetchPayments();
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Payment verification failed.";
            toast.error("Verification Failed", msg);
          } finally {
            setIsVerifyingPayment(false);
          }
        },
        modal: {
          ondismiss: () => {
            setIsCreatingOrder(false);
          },
        },
      };

      const razorpayInstance = new (window as unknown as { Razorpay: new (opts: RazorpayCheckoutOptions) => { open: () => void } }).Razorpay(options);
      razorpayInstance.open();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create payment order.";
      toast.error("Order Failed", msg);
    } finally {
      setIsCreatingOrder(false);
    }
  };

  // Handle Cancel Subscription
  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCancelling(true);
    try {
      const updatedSub = await subscriptionApi.cancel(cancelReason.trim() || undefined);
      toast.success("Subscription Cancelled", "Your subscription status has been updated to CANCELLED.");
      setIsCancelOpen(false);
      setCancelReason("");
      setSubscription(updatedSub);
      fetchSubscriptionData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to cancel subscription.";
      toast.error("Cancellation Failed", msg);
    } finally {
      setIsCancelling(false);
    }
  };

  if (isLoading) {
    return (
      <PageContainer maxWidth="xl" className="py-12 flex flex-col items-center justify-center">
        <Spinner size="lg" className="text-primary mb-3" />
        <p className="text-xs text-muted-foreground font-medium animate-pulse">
          Loading subscription & payment plans...
        </p>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer maxWidth="xl" className="py-6">
        <ErrorState
          title="Subscription Dashboard Error"
          message={error}
          onRetry={fetchSubscriptionData}
        />
      </PageContainer>
    );
  }

  const subStatusBadgeVariant = (s?: SubscriptionStatus) => {
    switch (s) {
      case SubscriptionStatus.ACTIVE:
        return "success";
      case SubscriptionStatus.TRIAL:
        return "primary";
      case SubscriptionStatus.EXPIRED:
        return "danger";
      case SubscriptionStatus.CANCELLED:
        return "neutral";
      default:
        return "neutral";
    }
  };

  const paymentStatusBadgeVariant = (s: PaymentTransactionStatus) => {
    switch (s) {
      case PaymentTransactionStatus.CAPTURED:
        return "success";
      case PaymentTransactionStatus.FAILED:
        return "danger";
      case PaymentTransactionStatus.AUTHORIZED:
        return "warning";
      case PaymentTransactionStatus.CANCELLED:
        return "neutral";
      case PaymentTransactionStatus.CREATED:
        return "primary";
      default:
        return "neutral";
    }
  };

  // Calculate Trial Remaining Days
  let trialDaysRemaining = 0;
  if (subscription?.status === SubscriptionStatus.TRIAL && subscription.trial_end_at) {
    const end = new Date(subscription.trial_end_at).getTime();
    const now = new Date().getTime();
    trialDaysRemaining = Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));
  }

  const paymentColumns: ColumnDef<PaymentTransaction>[] = [
    {
      header: "Order Reference",
      cell: (row) => (
        <div>
          <div className="font-mono font-bold text-xs text-foreground">
            {row.razorpay_order_id}
          </div>
          {row.razorpay_payment_id && (
            <div className="text-[10px] font-mono text-muted-foreground">
              Pay ID: {row.razorpay_payment_id}
            </div>
          )}
        </div>
      ),
    },
    {
      header: "Plan & Interval",
      cell: (row) => (
        <span className="text-xs font-medium text-foreground">
          {row.plan?.name || "Subscription"} ({row.billing_interval})
        </span>
      ),
    },
    {
      header: "Amount",
      cell: (row) => (
        <span className="font-mono text-xs font-bold text-foreground">
          {formatCurrency(row.amount)}
        </span>
      ),
    },
    {
      header: "Status",
      cell: (row) => (
        <Badge variant={paymentStatusBadgeVariant(row.status)} showDot>
          {row.status}
        </Badge>
      ),
    },
    {
      header: "Paid Date",
      cell: (row) => (
        <span className="text-xs text-muted-foreground">
          {row.paid_at ? new Date(row.paid_at).toLocaleDateString() : "—"}
        </span>
      ),
    },
    {
      header: "Created Date",
      cell: (row) => (
        <span className="text-xs text-muted-foreground">
          {new Date(row.created_at).toLocaleDateString()}
        </span>
      ),
    },
    {
      header: "Actions",
      cell: (row) => (
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-[11px]"
          onClick={() => router.push(`/subscription/payments/${row.id}`)}
        >
          <Receipt className="w-3.5 h-3.5 mr-1" /> Receipt
        </Button>
      ),
    },
  ];

  return (
    <PageContainer maxWidth="xl" className="py-6 space-y-8">
      {/* Page Header */}
      <PageHeader
        title="Subscription & Billing Management"
        description="Manage your plan subscription, billing intervals, and payment history."
        badge={
          <Badge variant={subStatusBadgeVariant(subscription?.status)} showDot>
            {subscription?.status || "NO SUBSCRIPTION"}
          </Badge>
        }
      />

      {/* Verification Overlay */}
      {isVerifyingPayment && (
        <div className="p-4 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Spinner size="sm" className="text-primary" />
            <span className="text-xs font-bold text-foreground">
              Verifying payment authorization & updating subscription...
            </span>
          </div>
        </div>
      )}

      {/* Expired Subscription Alert Banner */}
      {subscription?.status === SubscriptionStatus.EXPIRED && (
        <div className="p-4 rounded-xl bg-danger/10 border border-danger/30 text-danger flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <div className="text-xs">
              <span className="font-bold text-foreground block">Subscription Expired</span>
              <span>Your company subscription has expired. Upgrade your plan below to restore full features.</span>
            </div>
          </div>
        </div>
      )}

      {/* Section 1: Current Subscription Card */}
      <Card className="border-primary/20">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" /> Current Subscription Context
            </CardTitle>
            <CardDescription>Active billing cycle & plan parameters</CardDescription>
          </div>

          {subscription?.status === SubscriptionStatus.ACTIVE && (
            <Can permission={PermissionCode.SUBSCRIPTION_MANAGE}>
              <Button
                variant="ghost"
                size="sm"
                className="text-danger hover:bg-danger/10 text-xs"
                leftIcon={<Ban className="w-4 h-4" />}
                onClick={() => setIsCancelOpen(true)}
              >
                Cancel Subscription
              </Button>
            </Can>
          )}

          {!subscription && (
            <Can permission={PermissionCode.SUBSCRIPTION_MANAGE}>
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Sparkles className="w-4 h-4" />}
                onClick={handleStartTrial}
              >
                Start 14-Day Free Trial
              </Button>
            </Can>
          )}
        </CardHeader>
        <CardContent>
          {subscription ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-xs">
              <div>
                <span className="uppercase text-[10px] text-muted-foreground font-bold tracking-wider">
                  Active Plan
                </span>
                <div className="text-lg font-extrabold text-foreground mt-0.5">
                  {subscription.plan?.name || "Free Trial"}
                </div>
              </div>

              <div>
                <span className="uppercase text-[10px] text-muted-foreground font-bold tracking-wider">
                  Subscription Status
                </span>
                <div className="mt-1">
                  <Badge variant={subStatusBadgeVariant(subscription.status)} showDot className="px-2.5 py-0.5">
                    {subscription.status}
                  </Badge>
                </div>
              </div>

              <div>
                <span className="uppercase text-[10px] text-muted-foreground font-bold tracking-wider">
                  Current Period Start
                </span>
                <div className="text-sm font-semibold text-foreground mt-0.5">
                  {new Date(subscription.current_period_start).toLocaleDateString()}
                </div>
              </div>

              <div>
                <span className="uppercase text-[10px] text-muted-foreground font-bold tracking-wider">
                  Current Period End
                </span>
                <div className="text-sm font-semibold text-foreground mt-0.5">
                  {new Date(subscription.current_period_end).toLocaleDateString()}
                </div>
              </div>

              {subscription.status === SubscriptionStatus.TRIAL && (
                <div className="md:col-span-4 p-3 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-primary font-bold">
                    <Clock className="w-4 h-4" /> Trial Period Active
                  </div>
                  <span className="font-semibold text-foreground">
                    {trialDaysRemaining} days remaining in trial
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="py-4 text-xs text-muted-foreground">
              No active subscription found. Select a plan below to activate your account.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 2: Pricing Matrix */}
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-extrabold text-foreground">Select Your SaaS Plan</h3>
            <p className="text-xs text-muted-foreground">
              All plans include complete workforce management, attendance, salary, and payroll features.
            </p>
          </div>

          {/* Billing Interval Selector */}
          <div className="flex items-center p-1 rounded-xl bg-secondary border border-border">
            <button
              onClick={() => setInterval(BillingInterval.MONTHLY)}
              className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                interval === BillingInterval.MONTHLY
                  ? "bg-primary text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => setInterval(BillingInterval.YEARLY)}
              className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                interval === BillingInterval.YEARLY
                  ? "bg-primary text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Yearly Billing (Save)
            </button>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const isCurrentPlan = subscription?.plan_id === plan.id && subscription.status === SubscriptionStatus.ACTIVE;
            const displayPrice = interval === BillingInterval.MONTHLY ? plan.price_monthly : plan.price_yearly;

            return (
              <Card
                key={plan.id}
                className={`relative flex flex-col justify-between transition-all ${
                  isCurrentPlan ? "border-primary border-2 shadow-lg" : "hover:border-primary/40"
                }`}
              >
                {isCurrentPlan && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-primary text-white text-[10px] font-bold uppercase tracking-wider shadow-sm">
                    Current Active Plan
                  </div>
                )}

                <CardHeader>
                  <CardTitle className="text-lg font-extrabold">{plan.name}</CardTitle>
                  <CardDescription className="text-xs min-h-[36px]">
                    {plan.description || "Full SaaS features for organization operations."}
                  </CardDescription>

                  <div className="pt-4 pb-2 border-b border-border">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black font-mono text-foreground">
                        {formatCurrency(displayPrice)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        /{interval === BillingInterval.MONTHLY ? "mo" : "yr"}
                      </span>
                    </div>
                    <span className="text-[11px] text-muted-foreground block mt-1">
                      Includes {plan.trial_days} days trial period
                    </span>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3 flex-1 text-xs">
                  <div className="font-semibold text-foreground text-[11px] uppercase tracking-wider">
                    Included Features:
                  </div>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2 text-foreground">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>Employee Directory & HR Workspace</span>
                    </li>
                    <li className="flex items-center gap-2 text-foreground">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>Attendance & Leave Approvals</span>
                    </li>
                    <li className="flex items-center gap-2 text-foreground">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>Salary Structure & Advances Engine</span>
                    </li>
                    <li className="flex items-center gap-2 text-foreground">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>Monthly Automated Payroll Generation</span>
                    </li>
                    <li className="flex items-center gap-2 text-foreground">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>Official Payslips & PDF Statement Downloads</span>
                    </li>
                  </ul>
                </CardContent>

                <div className="p-6 pt-0 mt-auto">
                  <Can permission={PermissionCode.SUBSCRIPTION_MANAGE}>
                    <Button
                      variant={isCurrentPlan ? "outline" : "primary"}
                      className="w-full"
                      disabled={isCurrentPlan}
                      onClick={() => setCheckoutPlan(plan)}
                    >
                      {isCurrentPlan ? "Active Plan" : `Subscribe (${interval})`}
                    </Button>
                  </Can>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Section 3: Payment History */}
      <div className="space-y-3 pt-6 border-t border-border">
        <h3 className="text-base font-bold text-foreground">Payment Transaction History</h3>
        <DataTable
          columns={paymentColumns}
          data={paymentsResponse?.data || []}
          isLoading={isPaymentsLoading}
          emptyTitle="No payment transactions found"
          emptyDescription="Your billing receipts and payment records will appear here."
          pagination={{
            page,
            limit,
            total: paymentsResponse?.total || 0,
            totalPages: paymentsResponse?.totalPages || 1,
            onPageChange: (p) => setParam("page", p),
            onLimitChange: (l) => setParams({ limit: l, page: 1 }),
          }}
        />
      </div>

      {/* Order Confirmation Modal */}
      <Modal
        isOpen={!!checkoutPlan}
        onClose={() => setCheckoutPlan(null)}
        title="Confirm Payment Order"
        description="Review your plan selection before proceeding to checkout."
      >
        <div className="space-y-4 text-xs">
          <div className="p-4 rounded-xl bg-secondary/50 border border-border space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Plan</span>
              <span className="font-bold text-foreground">{checkoutPlan?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Billing Interval</span>
              <span className="font-bold text-foreground">{interval}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-border font-bold text-sm">
              <span className="text-foreground">Total Payable</span>
              <span className="font-mono text-primary">
                {checkoutPlan &&
                  formatCurrency(
                    interval === BillingInterval.MONTHLY
                      ? checkoutPlan.price_monthly
                      : checkoutPlan.price_yearly
                  )}
              </span>
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground">
            Clicking &apos;Proceed to Payment&apos; will create a secure order and open the payment gateway.
          </p>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setCheckoutPlan(null)}
              disabled={isCreatingOrder}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              isLoading={isCreatingOrder}
              leftIcon={<Zap className="w-4 h-4 text-white" />}
              onClick={handleProceedToRazorpay}
            >
              Proceed to Payment
            </Button>
          </div>
        </div>
      </Modal>

      {/* Cancel Subscription Modal */}
      <Modal
        isOpen={isCancelOpen}
        onClose={() => setIsCancelOpen(false)}
        title="Cancel Subscription"
        description="Are you sure you want to cancel your company subscription?"
      >
        <form onSubmit={handleCancelSubmit} className="space-y-4">
          <Textarea
            label="Reason for Cancellation (Optional)"
            placeholder="Help us improve our SaaS platform..."
            rows={3}
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsCancelOpen(false)}
              disabled={isCancelling}
            >
              Keep Subscription
            </Button>
            <Button type="submit" variant="danger" isLoading={isCancelling}>
              Confirm Cancellation
            </Button>
          </div>
        </form>
      </Modal>
    </PageContainer>
  );
}
