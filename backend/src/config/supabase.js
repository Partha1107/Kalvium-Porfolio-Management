import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl) {
  throw new Error(
    "Missing SUPABASE_URL environment variable."
  );
}

if (!supabaseAnonKey) {
  throw new Error(
    "Missing SUPABASE_ANON_KEY environment variable."
  );
}

// ============================================================
// NORMAL SUPABASE CLIENT
// ============================================================

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);

// ============================================================
// ADMIN / SERVER CLIENT
// ============================================================

if (!supabaseServiceKey) {
  console.warn(
    "[SUPABASE] SUPABASE_SERVICE_KEY is missing. Admin operations will not work."
  );
}

export const supabaseAdmin = supabaseServiceKey
  ? createClient(
      supabaseUrl,
      supabaseServiceKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )
  : null;

// ============================================================
// AUTHENTICATED USER CLIENT
// ============================================================

export const createAuthedSupabaseClient = (
  accessToken
) => {
  if (!accessToken) {
    throw new Error(
      "Access token is required"
    );
  }

  return createClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      global: {
        headers: {
          Authorization:
            `Bearer ${accessToken}`,
        },
      },
    }
  );
};