"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageContainer } from "@/components/ui/page-container";
import { Spinner } from "@/components/ui/spinner";

export default function PayslipsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/payroll?tab=payslips");
  }, [router]);

  return (
    <PageContainer maxWidth="xl" className="py-16 flex flex-col items-center justify-center">
      <Spinner size="lg" className="text-primary mb-3" />
      <p className="text-xs text-muted-foreground font-medium animate-pulse">
        Redirecting to Payroll & Payslips Suite...
      </p>
    </PageContainer>
  );
}
