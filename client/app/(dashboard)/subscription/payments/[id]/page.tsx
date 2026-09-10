"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ErrorState } from "@/components/ui/error-state";
import { formatCurrency } from "@/lib/utils/format-currency";
import { paymentsApi } from "@/lib/api/payments";
import { PaymentTransaction, PaymentTransactionStatus } from "@/types/payment";
import { ArrowLeft, CreditCard, Hash, Calendar, CheckCircle2, AlertTriangle } from "lucide-react";

export default function PaymentTransactionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const paymentId = resolvedParams.id;
  const router = useRouter();

  const [payment, setPayment] = useState<PaymentTransaction | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const tx = await paymentsApi.getPayment(paymentId);
        if (isMounted) setPayment(tx);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to load payment transaction.";
        if (isMounted) setError(msg);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, [paymentId]);

  if (isLoading) {
    return (
      <PageContainer maxWidth="xl" className="py-12 flex flex-col items-center justify-center">
        <Spinner size="lg" className="text-primary mb-3" />
        <p className="text-xs text-muted-foreground font-medium animate-pulse">
          Loading payment receipt details...
        </p>
      </PageContainer>
    );
  }

  if (error || !payment) {
    return (
      <PageContainer maxWidth="xl" className="py-6">
        <ErrorState
          title="Transaction Not Found"
          message={error || "The requested payment transaction could not be found."}
          onRetry={() => router.push("/subscription")}
          retryText="Return to Subscription"
        />
      </PageContainer>
    );
  }

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

  return (
    <PageContainer maxWidth="xl" className="py-6 space-y-6">
      <PageHeader
        title={`Transaction Voucher`}
        description={`Order Reference: ${payment.razorpay_order_id}`}
        badge={
          <Badge variant={paymentStatusBadgeVariant(payment.status)} showDot>
            {payment.status}
          </Badge>
        }
        actions={
          <Link href="/subscription">
            <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />}>
              Back to Subscription
            </Button>
          </Link>
        }
      />

      <Card className="max-w-3xl mx-auto shadow-md">
        <CardHeader className="border-b border-border pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-primary font-bold text-lg">
              <CreditCard className="w-5 h-5" /> PAYMENT RECEIPT
            </div>
            <Badge variant={paymentStatusBadgeVariant(payment.status)} showDot>
              {payment.status}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 pt-6 text-xs">
          {/* Amount Box */}
          <div className="p-6 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                TRANSACTION AMOUNT
              </span>
              <div className="text-3xl font-black font-mono text-primary mt-1">
                {formatCurrency(payment.amount)}
              </div>
            </div>

            <div className="text-right">
              <div className="text-xs font-bold text-foreground">{payment.currency}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                Interval: {payment.billing_interval}
              </div>
            </div>
          </div>

          {/* Details Table */}
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-muted-foreground flex items-center gap-1">
                <Hash className="w-3.5 h-3.5" /> Order Reference ID
              </span>
              <span className="font-mono font-bold text-foreground">{payment.razorpay_order_id}</span>
            </div>

            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-muted-foreground flex items-center gap-1">
                <Hash className="w-3.5 h-3.5 text-primary" /> Payment Reference ID
              </span>
              <span className="font-mono font-bold text-primary">
                {payment.razorpay_payment_id || "Awaiting Payment"}
              </span>
            </div>

            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-muted-foreground">Plan Name</span>
              <span className="font-semibold text-foreground">{payment.plan?.name || "Subscription Plan"}</span>
            </div>

            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-muted-foreground">Payment Method</span>
              <span className="font-medium text-foreground uppercase">{payment.payment_method || "Online Payment"}</span>
            </div>

            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> Order Created Date
              </span>
              <span className="font-medium text-foreground">
                {new Date(payment.created_at).toLocaleString()}
              </span>
            </div>

            {payment.paid_at && (
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Payment Timestamp
                </span>
                <span className="font-medium text-foreground">
                  {new Date(payment.paid_at).toLocaleString()}
                </span>
              </div>
            )}

            {payment.failure_reason && (
              <div className="p-3 rounded-lg bg-danger/10 border border-danger/30 text-danger space-y-1">
                <div className="font-bold flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" /> Failure Reason
                </div>
                <p className="text-[11px] leading-relaxed">{payment.failure_reason}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
