"use client";

import { supabaseBrowser } from "../../lib/supabase/browser";
import "../../styles/auth.css";

type Props = {
  onBeforeRedirect?: () => void;
};

export function GoogleSignInButton({ onBeforeRedirect }: Props = {}) {
  const signIn = async () => {
    onBeforeRedirect?.();

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
