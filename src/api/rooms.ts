import { apiRequest } from "./client";

// Shape returned by GET /api/rooms (the last message comes as flat fields).
export interface Room {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  premiumOnly: boolean;
  videoEnabled: boolean;
  // Messages in the last 24 h and distinct writers in the last 15 min.
  activity24h: number;
  activeUsers: number;
  lastMessageContent: string | null;
  lastMessageAlias: string | null;
  lastMessageAt: string | null;
}

export interface RoomMessage {
  id: string;
  roomId: string;
  profileId: string;
  content: string;
  createdAt: string;
  alias: string;
  profileType: string | null;
  experienceLevel: string | null;
}

export function getRooms(): Promise<Room[]> {
  return apiRequest<Room[]>("/api/rooms");
}

// Latest messages, oldest first. Pass `before` (an ISO date) to page back.
export function getRoomMessages(roomId: string, before?: string): Promise<RoomMessage[]> {
  const query = before ? `?before=${encodeURIComponent(before)}` : "";
  return apiRequest<RoomMessage[]>(`/api/rooms/${roomId}/messages${query}`);
}

export function sendRoomMessage(roomId: string, content: string): Promise<RoomMessage> {
  return apiRequest<RoomMessage>(`/api/rooms/${roomId}/messages`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });
}
