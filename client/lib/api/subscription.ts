import { api } from "./client";
import { Subscription, SubscriptionPlan } from "@/types/subscription";

export const subscriptionApi = {
  getCurrent: async (): Promise<Subscription | null> => {
    return api.get<Subscription | null>("/subscription");
  },

  getPlans: async (): Promise<SubscriptionPlan[]> => {
    return api.get<SubscriptionPlan[]>("/subscription/plans");
  },

  startTrial: async (): Promise<Subscription> => {
    return api.post<Subscription>("/subscription/trial", {});
  },

  cancel: async (reason?: string): Promise<Subscription> => {
    return api.post<Subscription>("/subscription/cancel", { reason });
  },
};
