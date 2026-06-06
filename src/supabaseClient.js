import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const requestTimeoutMs = 180000;

export const isSupabaseReady = Boolean(supabaseUrl && supabaseAnonKey);

function fetchWithTimeout(input, init = {}) {
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), requestTimeoutMs);
  const signal =
    init.signal && typeof AbortSignal !== "undefined" && typeof AbortSignal.any === "function"
      ? AbortSignal.any([init.signal, timeoutController.signal])
      : timeoutController.signal;

  return fetch(input, { ...init, signal }).finally(() => clearTimeout(timeoutId));
}

export const supabase = isSupabaseReady
  ? createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        fetch: fetchWithTimeout,
      },
    })
  : null;
