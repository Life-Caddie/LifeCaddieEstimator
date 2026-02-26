"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "../../../lib/supabase/browser";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const finalize = async () => {
      const supabase = supabaseBrowser();

      const { data, error } = await supabase.auth.getSession();
      if (error) console.error("getSession error:", error);

      const accessToken = data.session?.access_token ?? null;

      // Read the lead ID saved before the OAuth redirect
      let leadId: string | null = null;
      try {
        const raw = localStorage.getItem("lc_conversation_state");
        if (raw) {
          const saved = JSON.parse(raw);
          leadId = saved?.leadId ?? null;
        }
      } catch {
        // ignore parse errors
      }

      // Create (or retrieve) the customer record and link it to the lead
      if (accessToken) {
        try {
          await fetch("/api/auth/finalize-customer", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({ leadId }),
          });
        } catch (err) {
          console.error("finalize-customer error:", err);
        }
      }

      const calendlyPending = localStorage.getItem("lc_calendly_pending");
      router.replace(calendlyPending === "1" ? "/?calendly=1" : "/");
    };

    finalize();
  }, [router]);

  return <p>Signing you in…</p>;
}
