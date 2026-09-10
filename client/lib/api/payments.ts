import { api } from "./client";
import {
  BillingInterval,
  PaymentOrderResponse,
  PaymentTransaction,
  PaymentHistoryResponse,
  PaymentTransactionStatus,
} from "@/types/payment";

export interface CreatePaymentOrderPayload {
  planCode: string;
  billingInterval: BillingInterval;
}

export interface VerifyPaymentPayload {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export interface PaymentQueryParams {
  page?: number;
  limit?: number;
  status?: PaymentTransactionStatus;
}

export const paymentsApi = {
  createOrder: async (payload: CreatePaymentOrderPayload): Promise<PaymentOrderResponse> => {
    return api.post<PaymentOrderResponse>("/subscription/payment/order", payload);
  },

  verifyPayment: async (payload: VerifyPaymentPayload): Promise<PaymentTransaction> => {
    return api.post<PaymentTransaction>("/subscription/payment/verify", payload);
  },

  getPayments: async (params?: PaymentQueryParams): Promise<PaymentHistoryResponse> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append("page", params.page.toString());
    if (params?.limit) searchParams.append("limit", params.limit.toString());
    if (params?.status) searchParams.append("status", params.status);

    const queryString = searchParams.toString();
    const endpoint = queryString ? `/subscription/payments?${queryString}` : "/subscription/payments";
    return api.get<PaymentHistoryResponse>(endpoint);
  },

  getPayment: async (id: string): Promise<PaymentTransaction> => {
    return api.get<PaymentTransaction>(`/subscription/payments/${id}`);
  },
};
