import { createClient } from "@/lib/supabase/server";
import { UserProfile } from "@/types";

export interface CurrentUser {
  id: string;
  email: string;
  displayName: string;
  isDemoUser: boolean;
}

export const DEMO_USER_ID = "00000000-0000-0000-0000-000000000001";
export const DEMO_SUBJECT_ID = "00000000-0000-0000-0000-000000000002";

export const DEMO_USER: CurrentUser = {
  id: DEMO_USER_ID,
  email: "demo-student@gapfinder.ai",
  displayName: "Alex Rivera (Demo Student)",
  isDemoUser: true,
};

/**
 * Returns current authenticated user or demo user if running in demo session.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (user && !error) {
      return {
        id: user.id,
        email: user.email || "",
        displayName: user.user_metadata?.display_name || user.email?.split("@")[0] || "Student",
        isDemoUser: false,
      };
    }
  } catch (err) {
    // Supabase credentials might not be configured in local test/preview
  }

  return null;
}

/**
 * Checks whether live Supabase is configured.
 */
export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(url && key && !url.includes("placeholder"));
}

/**
 * Checks whether live Gemini API is configured.
 */
export function isGeminiConfigured(): boolean {
  const key = process.env.GEMINI_API_KEY;
  return Boolean(key && key.trim().length > 10 && !key.includes("placeholder"));
}
