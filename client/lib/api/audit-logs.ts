import { api } from "./client";
import { AuditLog, AuditLogQuery, AuditLogResponse } from "@/types/audit-log";

export const auditLogsApi = {
  getAuditLogs: async (params?: AuditLogQuery): Promise<AuditLogResponse> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append("page", params.page.toString());
    if (params?.limit) searchParams.append("limit", params.limit.toString());
    if (params?.userId) searchParams.append("userId", params.userId);
    if (params?.action) searchParams.append("action", params.action);
    if (params?.entityType) searchParams.append("entityType", params.entityType);
    if (params?.entityId) searchParams.append("entityId", params.entityId);
    if (params?.startDate) searchParams.append("startDate", params.startDate);
    if (params?.endDate) searchParams.append("endDate", params.endDate);

    const queryString = searchParams.toString();
    const endpoint = queryString ? `/audit-logs?${queryString}` : "/audit-logs";
    return api.get<AuditLogResponse>(endpoint);
  },

  getAuditLog: async (id: string): Promise<AuditLog> => {
    return api.get<AuditLog>(`/audit-logs/${id}`);
  },
};
