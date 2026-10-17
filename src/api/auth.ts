import { apiRequest } from "./client";

interface LoginResponse {
  token: string;
  profile: {
    id: string;
    alias: string;
    profileType: string;
    city?: string;
    bio?: string;
    photoUrl?: string;
    membershipType?: string;
  };
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  return apiRequest<LoginResponse>("/api/auth/mobile-login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}
