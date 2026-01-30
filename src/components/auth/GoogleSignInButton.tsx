"use client";

import { supabaseBrowser } from "../../lib/supabase/browser";
import "../../styles/GoogleSignInButton.css";

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
    <button className="google-signin-button" onClick={signIn}>
      Sign in with Google
    </button>
  );
}
