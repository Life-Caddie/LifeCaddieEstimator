"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "lc_client_token";

export function useClientToken(): string | null {
  const [clientToken, setClientToken] = useState<string | null>(null);

  useEffect(() => {
    let token = localStorage.getItem(STORAGE_KEY);
    if (!token) {
      token = crypto.randomUUID();
      localStorage.setItem(STORAGE_KEY, token);
    }
    setClientToken(token);
  }, []);

  return clientToken;
}
