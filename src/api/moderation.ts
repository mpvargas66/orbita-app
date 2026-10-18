import { apiRequest } from "./client";

export type ReportReason = "inappropriate" | "fake" | "harassment" | "underage" | "other";

export const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: "inappropriate", label: "Contenido inapropiado" },
  { value: "fake", label: "Perfil falso" },
  { value: "harassment", label: "Acoso o spam" },
  { value: "underage", label: "Menor de edad" },
  { value: "other", label: "Otro" },
];

export interface BlockedProfile {
  profileId: string;
  alias: string;
  profileType: string | null;
  photoUrl: string | null;
  blockedAt: string;
}

export function reportProfile(input: {
  profileId: string;
  reason: ReportReason;
  details?: string | null;
  conversationId?: string | null;
}): Promise<{ ok: true; reportId: string }> {
  return apiRequest("/api/reports", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function blockProfile(profileId: string): Promise<{ ok: true }> {
  return apiRequest("/api/blocks", {
    method: "POST",
    body: JSON.stringify({ profileId }),
  });
}

export function unblockProfile(profileId: string): Promise<{ ok: true }> {
  return apiRequest(`/api/blocks/${profileId}`, { method: "DELETE" });
}

export function getBlockedProfiles(): Promise<BlockedProfile[]> {
  return apiRequest<BlockedProfile[]>("/api/blocks");
}
