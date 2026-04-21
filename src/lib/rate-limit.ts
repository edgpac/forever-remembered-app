import { supabaseAdmin } from "@/integrations/supabase/client.server";

const MAX_PER_WINDOW = 3;

function windowStart(): string {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  return d.toISOString();
}

export async function checkIpRateLimit(ip: string): Promise<{ allowed: boolean }> {
  const window = windowStart();

  // Upsert: increment count if row exists for this ip+window, else insert count=1.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabaseAdmin as any).rpc("upsert_ip_rate_limit", {
    p_ip: ip,
    p_window_start: window,
    p_max: MAX_PER_WINDOW,
  });

  if (error) {
    // On DB error, fail open so a Supabase outage doesn't block all submissions.
    console.error("rate-limit check failed", error.message);
    return { allowed: true };
  }

  return { allowed: data as boolean };
}
