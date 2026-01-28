"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";
import { supabaseBrowser } from "../../../lib/supabase/browser";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const finalize = async () => {
      const supabase = supabaseBrowser();

      // After OAuth redirect, Supabase stores session automatically in the browser.
      const { data, error } = await supabase.auth.getSession();
      if (error) console.error("getSession error:", error);

      // Optional: if you store a job id in localStorage, link it here
      // const jobId = localStorage.getItem("lc_job_id");
      // const userId = data.session?.user.id;
      // if (jobId && userId) { ... }

      router.replace("/"); // or "/dashboard" or "/continue"
    };

    finalize();
  }, [router]);

  return <p>Signing you in…</p>;
}