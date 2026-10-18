import { File } from "expo-file-system";
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

// Expo's global fetch can't send React Native's { uri, name, type } FormData parts
// ("Unsupported FormDataPart"); it needs a Blob-like object, which expo-file-system's File is.
function imageFormData(uri: string): FormData {
  const formData = new FormData();
  formData.append("file", new File(uri));
  return formData;
}

// Replaces the current profile photo.
export function uploadProfilePhoto(uri: string): Promise<{ url: string; photoId: string }> {
  return apiRequest("/api/uploads/photo", { method: "POST", body: imageFormData(uri) });
}

// Adds a photo to the gallery; it only becomes the profile photo if it's the first one.
export function addGalleryPhoto(uri: string): Promise<{ url: string; photoId: string }> {
  return apiRequest("/api/uploads/gallery-photo", { method: "POST", body: imageFormData(uri) });
}

export interface MyPhoto {
  id: string;
  url: string;
  thumbnailUrl: string | null;
  isProfilePhoto: boolean;
  isApproved: boolean;
}

// Own non-explicit photos only, profile photo first.
export async function getMyPhotos(): Promise<MyPhoto[]> {
  const data = await apiRequest<{ photos: MyPhoto[] }>("/api/photos");
  return data.photos;
}

export function setProfilePhoto(photoId: string): Promise<{ ok: true }> {
  return apiRequest(`/api/photos/${photoId}/set-main`, { method: "PATCH" });
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
