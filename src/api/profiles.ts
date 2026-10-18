import { File } from "expo-file-system";
import { apiRequest } from "./client";

export interface ProfileSummary {
  id: string;
  alias: string;
  profileType: string;
  // null when the profile hides its location or age.
  city: string | null;
  region: string | null;
  ageMin: number | null;
  ageMax: number | null;
  photoUrl: string | null;
  membershipType: "free" | "plus" | "premium";
  isVerified: boolean;
  isIdentityVerified: boolean;
  isAvailable: boolean;
  lookingFor: string[] | null;
  // null when the profile hides its online status or was never seen.
  lastSeenAt: string | null;
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
  isIdentityVerified: boolean;
  experienceLevel: string | null;
  // Free-text fields. Couples fill the *1/*2 variants (one per person); singles use
  // height1/bodyType1/bodyHair1 and the unnumbered smokes/drinks/sexuality.
  height1: string | null;
  height2: string | null;
  bodyType1: string | null;
  bodyType2: string | null;
  bodyHair1: string | null;
  bodyHair2: string | null;
  smokes: string | null;
  smokes1: string | null;
  smokes2: string | null;
  drinks: string | null;
  drinks1: string | null;
  drinks2: string | null;
  sexuality: string | null;
  sexuality1: string | null;
  sexuality2: string | null;
  languages: string | null;
  // null when the profile hides its online status.
  lastSeenAt: string | null;
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

// If it was the profile photo, the backend promotes the next safe photo.
export function deletePhoto(photoId: string): Promise<{ ok: true }> {
  return apiRequest(`/api/photos/${photoId}`, { method: "DELETE" });
}

// Marks the current user as active, for "last seen" and Explore ordering.
export function pingPresence(): Promise<{ ok: boolean }> {
  return apiRequest("/api/profiles/ping", { method: "POST" });
}

export interface ReactionState {
  likes: number;
  hots: number;
  myLike: boolean;
  myHot: boolean;
}

export function getReactions(profileId: string): Promise<ReactionState> {
  return apiRequest<ReactionState>(`/api/profiles/${profileId}/reactions`);
}

// Toggles a like/hot reaction; the backend returns the new state and counts.
export function toggleReaction(
  profileId: string,
  type: "like" | "hot"
): Promise<{ active: boolean; type: "like" | "hot"; counts: { likes: number; hots: number } }> {
  return apiRequest("/api/reactions", {
    method: "POST",
    body: JSON.stringify({ toProfileId: profileId, type }),
  });
}

// "Solicitud de amistad": becomes a match ("mutual") when the other side already sent one.
export function sendFriendRequest(
  profileId: string
): Promise<{ status: "pending" | "mutual"; conversationId?: string | null }> {
  return apiRequest("/api/interests", {
    method: "POST",
    body: JSON.stringify({ to_profile_id: profileId }),
  });
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
