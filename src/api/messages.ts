import { apiRequest } from "./client";

export interface Message {
  id: string;
  content: string;
  senderId: string;
  createdAt: string;
  contentType: string;
}

export function getMessages(conversationId: string): Promise<Message[]> {
  return apiRequest<Message[]>(`/api/messages?conversationId=${conversationId}`);
}
