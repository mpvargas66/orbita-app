import { apiRequest } from "./client";

export interface ChatLockState {
  hasPin: boolean;
  lockedConversationIds: string[];
}

export function getChatLockState(): Promise<ChatLockState> {
  return apiRequest<ChatLockState>("/api/chat-lock");
}

// Creates the PIN, or changes it when `currentPin` is given.
export function setChatPin(pin: string, currentPin?: string): Promise<{ ok: true }> {
  return apiRequest("/api/chat-lock/pin", {
    method: "PUT",
    body: JSON.stringify({ pin, currentPin }),
  });
}

// Throws ApiError: 401 "PIN incorrecto" (with attemptsLeft) or 429 after too many tries.
export function verifyChatPin(pin: string): Promise<{ valid: true }> {
  return apiRequest("/api/chat-lock/verify", {
    method: "POST",
    body: JSON.stringify({ pin }),
  });
}

// Locking needs a PIN to exist; unlocking needs the PIN itself.
export function setConversationLocked(
  conversationId: string,
  locked: boolean,
  pin?: string
): Promise<{ ok: true; locked: boolean }> {
  return apiRequest(`/api/conversations/${conversationId}/lock`, {
    method: "PUT",
    body: JSON.stringify({ locked, pin }),
  });
}
