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

      const jobId = localStorage.getItem("lc_job_id");
      const userId = data.session?.user.id;

      if (jobId && userId) {
        await supabase.from("jobs").update({ user_id: userId }).eq("id", jobId);
      }

      router.replace("/");
    };

    finalize();
  }, [router]);

  return <p>Signing you in…</p>;
}
