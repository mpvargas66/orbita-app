import { apiRequest } from "./client";

interface LoginResponse {
  token: string;
  profile: {
    // null until the user finishes onboarding (the profile is created there).
    id: string | null;
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

// Same public endpoint the web signup uses. It creates the user only; the profile is
// created later in onboarding, and a verification email is sent to `email`.
export function registerAccount(input: {
  alias: string;
  email: string;
  password: string;
}): Promise<{ userId: string; alias: string }> {
  return apiRequest("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
