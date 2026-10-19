import { apiRequest } from "./client";

export interface Message {
  id: string;
  content: string;
  senderId: string;
  // The backend's messages table stores the sender as senderProfileId.
  senderProfileId?: string;
  createdAt: string;
  contentType: string;
  // One per person; empty when nobody reacted.
  reactions?: MessageReaction[];
}

export interface MessageReaction {
  profileId: string;
  emoji: string;
}

// Keep in sync with ALLOWED_EMOJIS in orbita-web's /api/messages/[id]/react.
export const REACTION_EMOJIS = ["❤️", "😂", "😮", "😢", "🔥", "👍"] as const;
export type ReactionEmoji = (typeof REACTION_EMOJIS)[number];

export interface Conversation {
  id: string;
  lastMessageAt: string;
  other: {
    profileId: string;
    alias: string;
    profileType: string;
    membershipType: string;
    photoUrl: string | null;
  } | null;
  lastMessage: { content: string; createdAt: string; senderProfileId: string } | null;
  unreadCount: number;
}

export function getMessages(conversationId: string): Promise<Message[]> {
  return apiRequest<Message[]>(`/api/messages?conversationId=${conversationId}`);
}

export function getConversations(): Promise<Conversation[]> {
  return apiRequest<Conversation[]>("/api/conversations");
}

export async function getConversationMessages(conversationId: string): Promise<Message[]> {
  // The backend responds with { messages, myProfileId }, not a bare array.
  const data = await apiRequest<{ messages: Message[]; myProfileId: string }>(
    `/api/conversations/${conversationId}/messages`
  );
  return data.messages;
}

// Sets, replaces or (with null) removes the current user's reaction.
export function setMessageReaction(
  messageId: string,
  emoji: ReactionEmoji | null
): Promise<{ messageId: string; reactions: MessageReaction[] }> {
  return apiRequest(`/api/messages/${messageId}/react`, {
    method: "PUT",
    body: JSON.stringify({ emoji }),
  });
}

export function sendMessage(conversationId: string, content: string): Promise<Message> {
  return apiRequest<Message>(`/api/conversations/${conversationId}/messages`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });
}
