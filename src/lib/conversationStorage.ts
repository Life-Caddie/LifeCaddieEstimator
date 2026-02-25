import type { ChatMessage } from "./api";

export type SavedConversationState = {
  messages: ChatMessage[];
  pills: string[];
  contextGathered: boolean;
  leadId: string | null;
  sessionId: string | null;
  clickedPillText?: string | null;
};

const STATE_KEY = "lc_conversation_state";
const CALENDLY_KEY = "lc_calendly_pending";

export function saveConversationForAuth(state: SavedConversationState): void {
  localStorage.setItem(STATE_KEY, JSON.stringify(state));
  localStorage.setItem(CALENDLY_KEY, "1");
}

export function loadConversationState(): SavedConversationState | null {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    const pending = localStorage.getItem(CALENDLY_KEY);
    if (!raw || !pending) return null;
    return JSON.parse(raw) as SavedConversationState;
  } catch {
    return null;
  }
}

export function clearConversationState(): void {
  localStorage.removeItem(STATE_KEY);
  localStorage.removeItem(CALENDLY_KEY);
}
