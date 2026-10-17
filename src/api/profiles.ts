import { apiRequest } from "./client";

export interface ProfileSummary {
  id: string;
  alias: string;
  profileType: string;
  city?: string;
  photoUrl?: string;
  membershipType?: string;
}

export interface ProfileDetail extends ProfileSummary {
  bio?: string;
}

export function getProfiles(): Promise<ProfileSummary[]> {
  return apiRequest<ProfileSummary[]>("/api/profiles");
}

export function getProfile(id: string): Promise<ProfileDetail> {
  return apiRequest<ProfileDetail>(`/api/profiles/${id}`);
}
