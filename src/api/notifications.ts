import { apiRequest } from "./client";

// Types the backend creates today: match, message, profile_view, like (post),
// post_comment, new_event.
export interface AppNotification {
  id: string;
  type: string | null;
  title: string | null;
  body: string | null;
  // Web path (e.g. "/messages"); the app maps notifications by type instead.
  link: string | null;
  read: boolean | null;
  createdAt: string;
  resourceId: string | null;
  senderUserId: string | null;
  senderAlias: string | null;
  senderProfileId: string | null;
  senderPhotoUrl: string | null;
}

export function getNotifications(): Promise<{ notifications: AppNotification[]; unread: number }> {
  return apiRequest("/api/notifications");
}

export function markAllNotificationsRead(): Promise<unknown> {
  return apiRequest("/api/notifications/read", { method: "PATCH" });
}
