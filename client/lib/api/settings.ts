import { api } from "./client";
import { getMeApi, UserProfile } from "./auth";

export interface UpdateCompanyPayload {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  timezone?: string;
  currency?: string;
  absence_deduction_mode?: "AUTOMATIC" | "MANUAL";
}

export const settingsApi = {
  getAccount: async (): Promise<UserProfile> => {
    const res = await getMeApi();
    return res.user;
  },
  updateCompany: async (payload: UpdateCompanyPayload) => {
    return api.patch("/companies/my-company", payload);
  },
};
