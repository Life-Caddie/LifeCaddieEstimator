"use client";

import { supabaseBrowser } from "../../lib/supabase/browser";
import { useAuthEmail } from "../../hooks/useAuthEmail";
import "../../styles/auth.css";

export function UserMenu() {
  const email = useAuthEmail();

  const signOut = async () => {
    const supabase = supabaseBrowser();
    await supabase.auth.signOut();
  };

  if (!email) return null;

  return (
    <div className="user-menu">
      <span className="user-menu-email">{email}</span>
      <button className="user-menu-logout" onClick={signOut}>log out</button>
    </div>
  );
}
