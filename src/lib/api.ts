export type ChatMessage = { who: "bot" | "user"; text: string };

export type AnalyzeResult = {
  task?: string;
  follow_up_question?: string;
  leadId?: string;
  sessionId?: string;
};

export type ConversationResult = {
  messages?: string[];
  quick_actions?: string[];
  context_gathered?: boolean;
};

export async function getSessionToken(): Promise<string> {
  const response = await fetch("/api/session", { method: "GET" });
  if (!response.ok) throw new Error("Session token request failed");
  const data = await response.json();
  if (!data.token) throw new Error("No session token returned");
  return data.token as string;
}

export async function analyzeSpace(
  file: File,
  goal: string,
  feeling: string,
  messages: ChatMessage[],
  clientToken: string,
  locale: string,
  timezone: string
): Promise<AnalyzeResult> {
  const token = await getSessionToken();
  const fd = new FormData();
  fd.append("photo", file);
  fd.append("goal", goal);
  fd.append("feeling", feeling);
  fd.append("chat_history", JSON.stringify(messages));
  fd.append("client_token", clientToken);
  fd.append("locale", locale);
  fd.append("timezone", timezone);

  const response = await fetch("/api/analyze", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  });

  if (response.status === 401) throw new Error("Unauthorized (session invalid/expired).");
  if (response.status === 413) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || "Photo too large. Please use a smaller image.");
  }
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `Analyze failed (${response.status}).`);
  }

  return (await response.json()) as AnalyzeResult;
}

export async function sendConversation(
  messages: ChatMessage[],
  contextGathered: boolean,
  sessionId?: string | null,
  leadId?: string | null,
  isPillSelection?: boolean
): Promise<ConversationResult> {
  const token = await getSessionToken();

  const response = await fetch("/api/conversation", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      chat_history: messages,
      context_gathered: contextGathered,
      session_id: sessionId ?? null,
      lead_id: leadId ?? null,
      is_pill_selection: isPillSelection ?? false,
    }),
  });

  if (response.status === 401) throw new Error("Unauthorized (session invalid/expired).");
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `Conversation failed (${response.status}).`);
  }

  return (await response.json()) as ConversationResult;
}
