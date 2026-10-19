import { apiRequest } from "./client";

export interface AppEvent {
  id: string;
  title: string;
  description: string;
  eventType: "fiesta" | "club" | "privado" | "viaje" | "otro";
  locationName: string;
  locationCity: string;
  locationRegion: string;
  dateStart: string;
  dateEnd: string | null;
  capacity: number | null;
  priceCLP: number | null;
  coverImageUrl: string | null;
  organizerAlias: string;
  businessName: string | null;
  confirmedCount: number;
  // true when the current user is pending or confirmed.
  isGoing: boolean;
}

export async function getUpcomingEvents(limit = 4): Promise<AppEvent[]> {
  const data = await apiRequest<{ events: AppEvent[] }>(`/api/events?limit=${limit}`);
  return data.events;
}

// Only for free events: paid ones are joined and paid on the web.
export function joinEvent(eventId: string): Promise<{ status: string; requiresPayment: boolean }> {
  return apiRequest(`/api/events/${eventId}/guests`, { method: "POST" });
}
