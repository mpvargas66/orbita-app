import { apiRequest } from "./client";

export interface ProfileSummary {
  id: string;
  alias: string;
  profileType: string;
  city?: string;
  photoUrl?: string;
  membershipType?: string;
}

export interface ProfilePhoto {
  id: string;
  cloudinaryUrl: string;
  thumbnailUrl: string | null;
  mediaType: string;
  isExplicit: boolean;
  isProfilePhoto: boolean;
  sortOrder: number;
}

export interface ProfileDetail {
  id: string;
  alias: string;
  profileType: string;
  region: string | null;
  city: string | null;
  ageMin: number | null;
  ageMax: number | null;
  lookingFor: string[] | null;
  bio: string | null;
  membershipType: string | null;
  isVerified: boolean;
  isAvailable: boolean;
  isTraveling: boolean;
  travelCurrentCity: string | null;
  isMutualMatch: boolean;
  likeStatus: "none" | "sent" | "mutual";
  requestStatus: "none" | "pending" | "accepted" | "rejected_cooldown";
  cooldownDays: number;
  isOwnerViewer: boolean;
  photos: ProfilePhoto[];
}

export async function getProfiles(): Promise<ProfileSummary[]> {
  // The backend responds with { profiles, pagination }, not a bare array.
  const data = await apiRequest<{ profiles: ProfileSummary[] }>("/api/profiles");
  return data.profiles;
}

export function getProfile(id: string): Promise<ProfileDetail> {
  // safe=1 tells the backend never to include explicit photos for the mobile app.
  return apiRequest<ProfileDetail>(`/api/profiles/${id}?safe=1`);
}

export interface MyProfile {
  id: string;
  alias: string;
  profileType: string;
  region: string | null;
  city: string | null;
  bio: string | null;
  membershipType: "free" | "plus" | "premium" | null;
  isVerified: boolean;
}

export interface MyProfileResponse {
  // null when the user hasn't finished onboarding on the web.
  profile: MyProfile | null;
  user?: { alias: string; membershipType: MyProfile["membershipType"] };
  // The owner gets every photo, including explicit and not-yet-approved ones.
  photos: (ProfilePhoto & { isApproved: boolean })[];
}

export function getMyProfile(): Promise<MyProfileResponse> {
  return apiRequest<MyProfileResponse>("/api/profiles/me");
}

// Uploads a picked image as the new profile photo (the backend replaces the current one).
export function uploadProfilePhoto(asset: {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
}): Promise<{ url: string; photoId: string }> {
  const name = asset.fileName ?? asset.uri.split("/").pop() ?? "photo.jpg";
  const formData = new FormData();
  // React Native's FormData takes a { uri, name, type } object for files.
  formData.append("file", { uri: asset.uri, name, type: asset.mimeType ?? "image/jpeg" } as unknown as Blob);
  return apiRequest("/api/uploads/photo", { method: "POST", body: formData });
}

export function sendMessageRequest(
  toProfileId: string,
  message: string
): Promise<{ requestId: string; status: "pending" }> {
  return apiRequest(`/api/message-requests`, {
    method: "POST",
    body: JSON.stringify({ toProfileId, message }),
  });
}
