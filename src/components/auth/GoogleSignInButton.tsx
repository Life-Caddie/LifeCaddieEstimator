"use client";

import { supabaseBrowser } from "../../lib/supabase/browser";

export function GoogleSignInButton() {
  const signIn = async () => {
    const supabase = supabaseBrowser();

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      console.error(error);
      alert(error.message);
    }
  };

  return (
    <button onClick={signIn}>
      Anonymous
    </button>
  );
}
